import { randomUUID } from "node:crypto";

export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_LISTING_IMAGES = 8;
export const LISTING_IMAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? "uninest-listing-images";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

type StorageConfig = {
  baseUrl: string;
  serviceKey: string;
};

let publicBucketReady: Promise<void> | null = null;

function getStorageConfig(): StorageConfig {
  const configuredUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredUrl || !serviceKey || !LISTING_IMAGE_BUCKET.trim()) {
    throw new Error("Supabase Storage is not configured");
  }

  const baseUrl = new URL(configuredUrl);
  if (
    baseUrl.protocol !== "https:" &&
    !(baseUrl.protocol === "http:" && baseUrl.hostname === "localhost")
  ) {
    throw new Error("Supabase URL must use HTTPS");
  }

  return {
    baseUrl: baseUrl.toString().replace(/\/+$/, ""),
    serviceKey,
  };
}

function storageUrl(config: StorageConfig, path: string): string {
  return `${config.baseUrl}/storage/v1/${path}`;
}

function storageHeaders(
  config: StorageConfig,
  additional?: Record<string, string>,
): Headers {
  return new Headers({
    apikey: config.serviceKey,
    authorization: `Bearer ${config.serviceKey}`,
    ...additional,
  });
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requestPublicBucket(config: StorageConfig): Promise<void> {
  const bucketUrl = storageUrl(
    config,
    `bucket/${encodeURIComponent(LISTING_IMAGE_BUCKET)}`,
  );
  let existing = await fetch(bucketUrl, {
    headers: storageHeaders(config),
    cache: "no-store",
  });

  if (existing.status === 404) {
    const created = await fetch(storageUrl(config, "bucket"), {
      method: "POST",
      headers: storageHeaders(config, {
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        id: LISTING_IMAGE_BUCKET,
        name: LISTING_IMAGE_BUCKET,
        public: true,
        file_size_limit: MAX_LISTING_IMAGE_BYTES,
        allowed_mime_types: [...ALLOWED_CONTENT_TYPES],
      }),
      cache: "no-store",
    });
    if (created.ok) return;
    existing = await fetch(bucketUrl, {
      headers: storageHeaders(config),
      cache: "no-store",
    });
  }

  if (!existing.ok) {
    throw new Error(`Supabase Storage bucket lookup failed (${existing.status})`);
  }

  const bucket: unknown = await existing.json();
  if (
    typeof bucket !== "object" ||
    bucket === null ||
    !("public" in bucket) ||
    bucket.public !== true
  ) {
    throw new Error("Supabase Storage bucket must be public for listing photos");
  }
}

async function ensurePublicBucket(config: StorageConfig): Promise<void> {
  if (!publicBucketReady) {
    publicBucketReady = requestPublicBucket(config).catch((error: unknown) => {
      publicBucketReady = null;
      throw error;
    });
  }
  return publicBucketReady;
}

export function allowedImageType(value: string): value is AllowedContentType {
  return (
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp"
  );
}

export function isValidImageBytes(
  contentType: AllowedContentType,
  bytes: Uint8Array,
): boolean {
  if (contentType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  );
}

export async function uploadListingImage(
  listingId: string,
  contentType: AllowedContentType,
  bytes: Uint8Array,
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  await ensurePublicBucket(config);

  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : "webp";
  const key = `${listingId}/${randomUUID()}.${extension}`;
  const objectPath = encodeObjectPath(key);
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const uploaded = await fetch(
    storageUrl(
      config,
      `object/${encodeURIComponent(LISTING_IMAGE_BUCKET)}/${objectPath}`,
    ),
    {
      method: "POST",
      headers: storageHeaders(config, {
        "content-type": contentType,
        "cache-control": "31536000",
        "x-upsert": "false",
      }),
      body,
      cache: "no-store",
    },
  );
  if (!uploaded.ok) {
    throw new Error(`Supabase Storage upload failed (${uploaded.status})`);
  }

  return {
    key,
    url: storageUrl(
      config,
      `object/public/${encodeURIComponent(LISTING_IMAGE_BUCKET)}/${objectPath}`,
    ),
  };
}

export async function deleteListingImageObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const config = getStorageConfig();
  const response = await fetch(
    storageUrl(config, `object/${encodeURIComponent(LISTING_IMAGE_BUCKET)}`),
    {
      method: "DELETE",
      headers: storageHeaders(config, {
        "content-type": "application/json",
      }),
      body: JSON.stringify({ prefixes: keys }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase Storage deletion failed (${response.status})`);
  }
}

export function listingImageObjectKey(url: string): string | undefined {
  const configuredUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredUrl || !serviceKey) return undefined;

  let storageBase: URL;
  let imageUrl: URL;
  try {
    storageBase = new URL(configuredUrl);
    imageUrl = new URL(url);
  } catch {
    return undefined;
  }
  if (imageUrl.origin !== storageBase.origin) return undefined;

  const prefix = `/storage/v1/object/public/${encodeURIComponent(
    LISTING_IMAGE_BUCKET,
  )}/`;
  if (!imageUrl.pathname.startsWith(prefix)) return undefined;

  return imageUrl.pathname
    .slice(prefix.length)
    .split("/")
    .map(decodeURIComponent)
    .join("/");
}
