import assert from "node:assert/strict";
import test from "node:test";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";
import { listingRoutes } from "../../routes/listing.routes/listing.route.js";
import {
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
} from "../../lib/supabase-storage.js";
import { uploadListingImages } from "./listing-image.controller.js";

const storageKey = "sb_secret_controller_test_key";
const storageUrl = "https://controller-test.supabase.co";
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type Part = {
  fieldname: string;
  mimetype: string;
  toBuffer: () => Promise<Uint8Array>;
};

type TestReply = {
  statusCode: number;
  body: unknown;
  code: (statusCode: number) => TestReply;
  send: (body: unknown) => unknown;
};

function createReply(): TestReply {
  const reply: TestReply = {
    statusCode: 200,
    body: undefined,
    code(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send(body) {
      this.body = body;
      return body;
    },
  };
  return reply;
}

function createPart(
  contentType: string,
  bytes = png,
  fieldname = "images",
): Part {
  return {
    fieldname,
    mimetype: contentType,
    toBuffer: async () => bytes,
  };
}

function createRequest(
  parts: Part[],
  logs: unknown[][],
  options: { code?: string } = {},
) {
  return {
    params: { id: "listing-test" },
    log: {
      error: (...values: unknown[]) => logs.push(values),
      warn: (...values: unknown[]) => logs.push(values),
    },
    files: async function* (limits?: {
      limits?: { files?: number; fileSize?: number };
    }) {
      assert.equal(limits?.limits?.files, MAX_LISTING_IMAGES);
      assert.equal(limits?.limits?.fileSize, MAX_LISTING_IMAGE_BYTES);
      for (const part of parts) yield part;
      if (options.code) {
        throw Object.assign(new Error("Synthetic multipart limit"), {
          code: options.code,
        });
      }
    },
  } as unknown as FastifyRequest<{ Params: { id: string } }>;
}

async function runController(
  parts: Part[],
  options: {
    imageCount?: number;
    findUniqueError?: Error;
    createManyError?: Error;
    fileErrorCode?: string;
    fetchResponse?: (pathname: string, method: string) => Response;
  } = {},
) {
  const logs: unknown[][] = [];
  const reply = createReply();
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousBucket = process.env.SUPABASE_STORAGE_BUCKET;
  const previousFindUnique = prisma.listing.findUnique;
  const previousCreateMany = prisma.listingImage.createMany;
  const storageRequests: Array<{ method: string; pathname: string }> = [];

  process.env.SUPABASE_URL = storageUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = storageKey;
  delete process.env.SUPABASE_STORAGE_BUCKET;

  Reflect.set(prisma.listing, "findUnique", async () => {
    if (options.findUniqueError) throw options.findUniqueError;
    return {
      id: "listing-test",
      name: "Test accommodation",
      _count: { images: options.imageCount ?? 0 },
    };
  });

  Reflect.set(prisma.listingImage, "createMany", async () => {
    if (options.createManyError) throw options.createManyError;
    return { count: parts.length };
  });

  globalThis.fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    const pathname = new URL(String(input)).pathname;
    storageRequests.push({ method, pathname });
    if (options.fetchResponse) return options.fetchResponse(pathname, method);
    if (pathname.startsWith("/storage/v1/bucket/")) {
      return Response.json({ public: true }, { status: 200 });
    }
    return Response.json({}, { status: 200 });
  };

  try {
    await uploadListingImages(
      createRequest(parts, logs, { code: options.fileErrorCode }),
      reply as unknown as FastifyReply,
    );
    return { reply, logs, storageRequests };
  } finally {
    globalThis.fetch = previousFetch;
    Reflect.set(prisma.listing, "findUnique", previousFindUnique);
    Reflect.set(prisma.listingImage, "createMany", previousCreateMany);
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    if (previousBucket === undefined)
      delete process.env.SUPABASE_STORAGE_BUCKET;
    else process.env.SUPABASE_STORAGE_BUCKET = previousBucket;
  }
}

test("rejects unauthenticated image upload requests at the route", async () => {
  const envKeys = [
    "CLERK_SECRET_KEY",
    "CLERK_JWT_KEY",
    "CLERK_ADMIN_USER_IDS",
    "CLERK_AUTHORIZED_PARTIES",
  ] as const;
  const previous = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]]),
  );
  process.env.CLERK_SECRET_KEY = "sk_test_synthetic";
  process.env.CLERK_ADMIN_USER_IDS = "user_test_admin";
  process.env.CLERK_AUTHORIZED_PARTIES = "https://admin.example.test";
  delete process.env.CLERK_JWT_KEY;

  const app = Fastify();
  try {
    await app.register(listingRoutes);
    const response = await app.inject({
      method: "POST",
      url: "/listings/listing-test/images",
    });
    assert.equal(response.statusCode, 401);
  } finally {
    await app.close();
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("rejects unsupported image content types and invalid signatures", async () => {
  const unsupported = await runController([
    createPart("image/gif", new Uint8Array([0x47, 0x49, 0x46])),
  ]);
  assert.equal(unsupported.reply.statusCode, 400);
  assert.equal(unsupported.storageRequests.length, 0);

  const invalidSignature = await runController([
    createPart("image/png", new Uint8Array([0x00, 0x01, 0x02, 0x03])),
  ]);
  assert.equal(invalidSignature.reply.statusCode, 400);
  assert.equal(invalidSignature.storageRequests.length, 0);
});

test("enforces image-count and multipart file-size limits", async () => {
  const tooManyImages = await runController([createPart("image/png")], {
    imageCount: MAX_LISTING_IMAGES,
  });
  assert.equal(tooManyImages.reply.statusCode, 413);
  assert.equal(tooManyImages.storageRequests.length, 0);

  const tooLarge = await runController([], {
    fileErrorCode: "FST_REQ_FILE_TOO_LARGE",
  });
  assert.equal(tooLarge.reply.statusCode, 413);
  assert.equal(tooLarge.storageRequests.length, 0);

  const tooManyFiles = await runController([], {
    fileErrorCode: "FST_FILES_LIMIT",
  });
  assert.equal(tooManyFiles.reply.statusCode, 413);
  assert.equal(tooManyFiles.storageRequests.length, 0);
});

test("creates ordered image records without modifying existing images", async () => {
  const inserted: Array<{
    listingId: string;
    url: string;
    alt: string;
    position: number;
  }> = [];
  const previousCreateMany = prisma.listingImage.createMany;
  Reflect.set(
    prisma.listingImage,
    "createMany",
    async (args: { data: typeof inserted }) => {
      inserted.push(...args.data);
      return { count: args.data.length };
    },
  );

  const previousFetch = globalThis.fetch;
  const requests: Array<{ method: string; pathname: string }> = [];
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousBucket = process.env.SUPABASE_STORAGE_BUCKET;
  process.env.SUPABASE_URL = storageUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = storageKey;
  delete process.env.SUPABASE_STORAGE_BUCKET;

  const previousFindUnique = prisma.listing.findUnique;
  Reflect.set(prisma.listing, "findUnique", async () => ({
    id: "listing-test",
    name: "Test accommodation",
    _count: { images: 2 },
  }));
  globalThis.fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    const pathname = new URL(String(input)).pathname;
    requests.push({ method, pathname });
    if (pathname.startsWith("/storage/v1/bucket/")) {
      return Response.json({ public: true }, { status: 200 });
    }
    return Response.json({}, { status: 200 });
  };

  const logs: unknown[][] = [];
  const reply = createReply();
  try {
    const request = createRequest(
      [
        createPart("image/png"),
        createPart("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])),
      ],
      logs,
    );
    await uploadListingImages(request, reply as unknown as FastifyReply);

    assert.equal(reply.statusCode, 201);
    assert.deepEqual(
      inserted.map(({ position }) => position),
      [2, 3],
    );
    assert.deepEqual(
      inserted.map(({ alt }) => alt),
      ["Test accommodation - photo 3", "Test accommodation - photo 4"],
    );
    assert.equal(
      requests.some(({ method }) => method === "DELETE"),
      false,
    );
  } finally {
    globalThis.fetch = previousFetch;
    Reflect.set(prisma.listing, "findUnique", previousFindUnique);
    Reflect.set(prisma.listingImage, "createMany", previousCreateMany);
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    if (previousBucket === undefined)
      delete process.env.SUPABASE_STORAGE_BUCKET;
    else process.env.SUPABASE_STORAGE_BUCKET = previousBucket;
  }
});

test("Storage failure does not create database image records or expose sensitive details", async () => {
  let createManyCalled = false;
  const previousCreateMany = prisma.listingImage.createMany;
  Reflect.set(prisma.listingImage, "createMany", async () => {
    createManyCalled = true;
    return { count: 1 };
  });
  let response: Awaited<ReturnType<typeof runController>>;
  try {
    response = await runController([createPart("image/png")], {
      fetchResponse: (pathname) => {
        if (pathname.startsWith("/storage/v1/bucket/")) {
          return Response.json({ public: true }, { status: 200 });
        }
        return Response.json(
          {
            message: `Rejected ${storageKey} https://sensitive.example/object?token=hidden`,
          },
          { status: 500 },
        );
      },
    });
  } finally {
    Reflect.set(prisma.listingImage, "createMany", previousCreateMany);
  }

  assert.equal(response.reply.statusCode, 503);
  assert.equal(createManyCalled, false);
  const body = JSON.stringify(response.reply.body);
  assert.equal(body.includes(storageKey), false);
  assert.equal(body.includes("sensitive.example"), false);
  assert.equal(body.includes("hidden"), false);
});

test("database failure attempts cleanup and preserves the database error when cleanup fails", async () => {
  const databaseFailure = new Error("Synthetic database persistence failure");
  const response = await runController([createPart("image/png")], {
    createManyError: databaseFailure,
    fetchResponse: (pathname, method) => {
      if (pathname.startsWith("/storage/v1/bucket/")) {
        return Response.json({ public: true }, { status: 200 });
      }
      if (method === "DELETE") {
        return Response.json(
          {
            message: `Cleanup failed ${storageKey} https://sensitive.example/object`,
          },
          { status: 500 },
        );
      }
      return Response.json({}, { status: 200 });
    },
  });

  assert.equal(response.reply.statusCode, 500);
  assert.equal(
    response.storageRequests.some(({ method }) => method === "DELETE"),
    true,
  );
  assert.equal(
    response.logs.some((values) => values.includes(databaseFailure)),
    true,
  );
  assert.equal(response.logs.length, 2);
  assert.equal(response.logs[0]?.[0], databaseFailure);
  assert(response.logs[1]?.[0] instanceof Error);
  const body = JSON.stringify(response.reply.body);
  assert.equal(body.includes(storageKey), false);
  assert.equal(body.includes("sensitive.example"), false);
});
