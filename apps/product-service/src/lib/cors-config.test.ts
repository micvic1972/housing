import assert from "node:assert/strict";
import test from "node:test";
import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  productionFrontendOrigins,
  resolveClerkAuthorizedParties,
  resolveCorsOrigins,
} from "./cors-config.js";

test("allows local and LAN development origins", () => {
  assert.equal(resolveCorsOrigins("development", undefined), true);
});

test("requires a production allowlist", () => {
  assert.throws(
    () => resolveCorsOrigins("production", undefined),
    /CORS_ALLOWED_ORIGINS must be configured/,
  );
});

test("parses and deduplicates exact production origins", () => {
  assert.deepEqual(
    resolveCorsOrigins(
      "production",
      "https://client.example.com,https://admin.example.com,https://client.example.com",
    ),
    [
      "https://client.example.com",
      "https://admin.example.com",
      ...productionFrontendOrigins,
    ],
  );
});

test("rejects malformed origins, paths, and empty entries", () => {
  for (const value of [
    "not-an-origin",
    "https://client.example.com/app",
    "https://client.example.com,",
  ]) {
    assert.throws(() => resolveCorsOrigins("production", value));
  }
});

test("production Clerk authorized parties include both deployed frontends", () => {
  assert.deepEqual(
    resolveClerkAuthorizedParties(
      "production",
      "https://delta-housing-admin.vercel.app",
    ),
    [
      "https://delta-housing-admin.vercel.app",
      ...productionFrontendOrigins.filter(
        (origin) => origin !== "https://delta-housing-admin.vercel.app",
      ),
    ],
  );
});

test("production CORS grants both deployed origins and blocks unknown origins", async (t) => {
  const app = Fastify({ logger: false });
  await app.register(cors, {
    origin: resolveCorsOrigins(
      "production",
      "https://delta-housing-admin.vercel.app",
    ),
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["authorization", "content-type"],
  });
  app.get("/protected", async () => ({ status: "ok" }));
  t.after(() => app.close());

  for (const origin of productionFrontendOrigins) {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/protected",
      headers: {
        origin,
        "access-control-request-method": "GET",
        "access-control-request-headers": "authorization",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], origin);
    assert.match(
      String(response.headers["access-control-allow-headers"]),
      /authorization/i,
    );
    assert.match(
      String(response.headers["access-control-allow-methods"]),
      /GET/i,
    );
  }

  const untrustedOrigin = "https://untrusted.example.net";
  const rejectedPreflight = await app.inject({
    method: "OPTIONS",
    url: "/protected",
    headers: {
      origin: untrustedOrigin,
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization",
    },
  });
  assert.equal(
    rejectedPreflight.headers["access-control-allow-origin"],
    undefined,
  );

  const rejectedRequest = await app.inject({
    method: "GET",
    url: "/protected",
    headers: { origin: untrustedOrigin },
  });
  assert.equal(rejectedRequest.statusCode, 200);
  assert.equal(
    rejectedRequest.headers["access-control-allow-origin"],
    undefined,
  );
});
