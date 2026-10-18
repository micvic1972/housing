import assert from "node:assert/strict";
import test from "node:test";
import {
  LISTING_IMAGE_BUCKET,
  StorageConfigurationError,
  uploadListingImage,
} from "./supabase-storage.js";

const secretKey = "sb_secret_test_key_not_a_credential";
const configuredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
] as const;

function withStorageEnv(
  values: Partial<Record<(typeof configuredEnv)[number], string>>,
  run: () => Promise<void>,
) {
  const previous = Object.fromEntries(
    configuredEnv.map((key) => [key, process.env[key]]),
  );
  for (const key of configuredEnv) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return run().finally(() => {
    for (const key of configuredEnv) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("uses the default public bucket and sends sb_secret_ in Storage auth headers", async () => {
  assert.equal(LISTING_IMAGE_BUCKET, "uninest-listing-images");
  const originalFetch = globalThis.fetch;
  const headersSeen: Headers[] = [];

  await withStorageEnv(
    {
      SUPABASE_URL: "https://unittest.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: secretKey,
    },
    async () => {
      globalThis.fetch = async (_input, init) => {
        headersSeen.push(new Headers(init?.headers));
        if (init?.method === "POST") {
          return new Response("{}", { status: 200 });
        }
        return Response.json({ public: true }, { status: 200 });
      };

      try {
        const result = await uploadListingImage(
          "listing-test",
          "image/png",
          new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        );

        assert.match(
          result.url,
          /\/storage\/v1\/object\/public\/uninest-listing-images\//,
        );
        assert.equal(headersSeen[0]?.get("apikey"), secretKey);
        assert.equal(
          headersSeen[0]?.get("authorization"),
          `Bearer ${secretKey}`,
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});

test("reports the exact missing storage setting without returning secret values", async () => {
  await withStorageEnv({}, async () => {
    await assert.rejects(
      uploadListingImage(
        "listing-test",
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      ),
      (error: unknown) =>
        error instanceof StorageConfigurationError &&
        error.setting === "SUPABASE_URL" &&
        error.message.includes("SUPABASE_URL"),
    );
  });
});

test("keeps Supabase's underlying error message while redacting the configured key", async () => {
  const originalFetch = globalThis.fetch;

  await withStorageEnv(
    {
      SUPABASE_URL: "https://unittest.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: secretKey,
    },
    async () => {
      globalThis.fetch = async () =>
        Response.json(
          { message: `Rejected key ${secretKey}` },
          { status: 403 },
        );

      try {
        await assert.rejects(
          uploadListingImage(
            "listing-test",
            "image/png",
            new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
          ),
          (error: unknown) => {
            assert(error instanceof Error);
            assert.match(error.message, /Rejected key \[redacted\]/);
            assert.equal(error.message.includes(secretKey), false);
            return true;
          },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  );
});
