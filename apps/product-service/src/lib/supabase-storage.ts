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

export type StorageConfigSetting =
  "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_STORAGE_BUCKET";

export class StorageConfigurationError extends Error {
  constructor(
    readonly setting: StorageConfigSetting,
    message: string,
  ) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

export class StorageRequestError extends Error {
  constructor(
    readonly statusCode: number,
    readonly operation: string,
    readonly upstreamMessage: string,
  ) {
    super(
      `Supabase Storage ${operation} failed (${statusCode}): ${upstreamMessage}`,
    );
    this.name = "StorageRequestError";
  }
}

let publicBucketReady: Promise<void> | null = null;

function getStorageConfig(): StorageConfig {
  const configuredUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configuredUrl?.trim()) {
    throw new StorageConfigurationError(
      "SUPABASE_URL",
      "SUPABASE_URL is missing from apps/product-service/.env.",
    );
  }
  if (!serviceKey?.trim()) {
    throw new StorageConfigurationError(
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SERVICE_ROLE_KEY is missing from apps/product-service/.env.",
    );
  }
  if (!LISTING_IMAGE_BUCKET.trim()) {
    throw new StorageConfigurationError(
      "SUPABASE_STORAGE_BUCKET",
      "SUPABASE_STORAGE_BUCKET is empty. Set a bucket name or remove it to use uninest-listing-images.",
    );
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    throw new StorageConfigurationError(
      "SUPABASE_URL",
      "SUPABASE_URL must be a valid Supabase project URL.",
    );
  }
  if (
    baseUrl.protocol !== "https:" &&
    !(baseUrl.protocol === "http:" && baseUrl.hostname === "localhost")
  ) {
    throw new StorageConfigurationError(
      "SUPABASE_URL",
      "SUPABASE_URL must use HTTPS (HTTP is allowed only for localhost).",
    );
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
  // Supabase Storage's server client sends the API key in both headers.
  // This matches supabase-js storage requests for sb_secret_ and legacy keys.
  return new Headers({
    apikey: config.serviceKey,
    authorization: `Bearer ${config.serviceKey}`,
    ...additional,
  });
}

function redactStorageKey(message: string, config: StorageConfig): string {
  return message
    .split(config.serviceKey)
    .join("[redacted]")
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[redacted]");
}

function sanitizeStorageMessage(
  message: string,
  config: StorageConfig,
): string {
  return redactStorageKey(message, config)
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(
      /\b(?:authorization|apikey)\s*[:=]\s*["']?[^,\s"']+/gi,
      "[redacted credential]",
    )
    .replace(/\bhttps?:\/\/[^\s"'<>]+/gi, "[redacted URL]");
}

async function storageRequestError(
  response: Response,
  operation: string,
  config: StorageConfig,
): Promise<StorageRequestError> {
  let upstreamMessage = response.statusText || "No error details returned";
  try {
    const body = await response.text();
    if (body) {
      try {
        const parsed: unknown = JSON.parse(body);
        if (typeof parsed === "object" && parsed !== null) {
          const record = parsed as Record<string, unknown>;
          const detail = [
            record.message,
            record.error_description,
            record.error,
          ].find((value) => typeof value === "string" && value.trim());
          upstreamMessage =
            typeof detail === "string" ? detail : body.slice(0, 500);
        } else {
          upstreamMessage = body.slice(0, 500);
        }
      } catch {
        upstreamMessage = body.slice(0, 500);
      }
    }
  } catch {
    upstreamMessage =
      response.statusText || "Could not read the error response";
  }

  return new StorageRequestError(
    response.status,
    operation,
    sanitizeStorageMessage(upstreamMessage, config),
  );
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requestPublicBucket(config: StorageConfig): Promise<void> {
  const bucketUrl = storageUrl(
    config,
    `bucket/${encodeURIComponent(LISTING_IMAGE_BUCKET)}`,
  );
  const existing = await fetch(bucketUrl, {
    headers: storageHeaders(config),
    cache: "no-store",
  });

  if (existing.status === 404) {
    throw new StorageConfigurationError(
      "SUPABASE_STORAGE_BUCKET",
      "The configured Supabase Storage bucket does not exist. Create and configure the bucket explicitly before uploading listing photos.",
    );
  }

  if (!existing.ok) {
    throw await storageRequestError(existing, "bucket lookup", config);
  }

  const bucket: unknown = await existing.json();
  if (
    typeof bucket !== "object" ||
    bucket === null ||
    !("public" in bucket) ||
    bucket.public !== true
  ) {
    throw new StorageConfigurationError(
      "SUPABASE_STORAGE_BUCKET",
      `Supabase bucket "${LISTING_IMAGE_BUCKET}" is not public. Make it public for listing photos.`,
    );
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
    value === "image/jpeg" || value === "image/png" || value === "image/webp"
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
    throw await storageRequestError(uploaded, "upload", config);
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
    throw await storageRequestError(response, "deletion", config);
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
