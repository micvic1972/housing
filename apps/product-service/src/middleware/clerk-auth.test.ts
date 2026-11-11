import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import Fastify from "fastify";
import test from "node:test";
import { requireClerkAdmin } from "./require-clerk-admin.js";
import { requireClerkUser } from "./require-clerk-user.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwtKey = publicKey.export({ type: "spki", format: "pem" }).toString();

function createToken(
  sub: string,
  azp = "https://student.example.test",
  exp = Math.floor(Date.now() / 1000) + 60,
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub,
      azp,
      exp,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000) - 5,
      iss: "https://test.clerk.accounts.dev",
      sid: "sess_test",
    }),
  ).toString("base64url");
  const content = `${header}.${payload}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(content),
    privateKey,
  ).toString("base64url");
  return `${content}.${signature}`;
}

test("Clerk middleware verifies signatures, parties, expiry, and server-side admin IDs", async (t) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    secretKey: process.env.CLERK_SECRET_KEY,
    jwtKey: process.env.CLERK_JWT_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES,
    adminIds: process.env.CLERK_ADMIN_USER_IDS,
  };
  process.env.NODE_ENV = "test";
  delete process.env.CLERK_SECRET_KEY;
  process.env.CLERK_JWT_KEY = jwtKey;
  process.env.CLERK_AUTHORIZED_PARTIES =
    "https://student.example.test,https://admin.example.test";
  process.env.CLERK_ADMIN_USER_IDS = "user_admin";

  const app = Fastify({ logger: false });
  app.get("/student", { preHandler: requireClerkUser }, async (request) => ({
    userId: request.clerkUserId,
  }));
  app.get("/admin", { preHandler: requireClerkAdmin }, async (request) => ({
    userId: request.clerkUserId,
  }));
  t.after(async () => {
    await app.close();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous.secretKey;
    if (previous.jwtKey === undefined) delete process.env.CLERK_JWT_KEY;
    else process.env.CLERK_JWT_KEY = previous.jwtKey;
    if (previous.authorizedParties === undefined) {
      delete process.env.CLERK_AUTHORIZED_PARTIES;
    } else {
      process.env.CLERK_AUTHORIZED_PARTIES = previous.authorizedParties;
    }
    if (previous.adminIds === undefined)
      delete process.env.CLERK_ADMIN_USER_IDS;
    else process.env.CLERK_ADMIN_USER_IDS = previous.adminIds;
  });

  const studentToken = createToken("user_student");
  const student = await app.inject({
    url: "/student",
    headers: { authorization: `Bearer ${studentToken}` },
  });
  assert.equal(student.statusCode, 200);
  assert.equal(student.json().userId, "user_student");

  const studentToAdmin = await app.inject({
    url: "/admin",
    headers: { authorization: `Bearer ${studentToken}` },
  });
  assert.equal(studentToAdmin.statusCode, 403);

  const adminToken = createToken("user_admin", "https://admin.example.test");
  const admin = await app.inject({
    url: "/admin",
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.equal(admin.statusCode, 200);
  assert.equal(admin.json().userId, "user_admin");

  const [header, payload, signature] = studentToken.split(".");
  const forgedSignature = `${signature!.startsWith("A") ? "B" : "A"}${signature!.slice(1)}`;
  const forgedToken = `${header}.${payload}.${forgedSignature}`;
  for (const token of [
    "not-a-jwt",
    forgedToken,
    createToken("user_student", "https://untrusted.example.test"),
    createToken("user_student", "https://student.example.test", 1),
  ]) {
    const response = await app.inject({
      url: "/student",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.statusCode, 401);
  }
});

test("production middleware rejects test Clerk secret configuration", async (t) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    secretKey: process.env.CLERK_SECRET_KEY,
    jwtKey: process.env.CLERK_JWT_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES,
    adminIds: process.env.CLERK_ADMIN_USER_IDS,
  };
  process.env.NODE_ENV = "production";
  process.env.CLERK_SECRET_KEY = "sk_test_synthetic";
  delete process.env.CLERK_JWT_KEY;
  process.env.CLERK_AUTHORIZED_PARTIES = "https://student.example.test";
  process.env.CLERK_ADMIN_USER_IDS = "user_admin";

  const app = Fastify({ logger: false });
  app.get("/student", { preHandler: requireClerkUser }, async () => ({
    ok: true,
  }));
  app.get("/admin", { preHandler: requireClerkAdmin }, async () => ({
    ok: true,
  }));
  t.after(async () => {
    await app.close();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous.secretKey;
    if (previous.jwtKey === undefined) delete process.env.CLERK_JWT_KEY;
    else process.env.CLERK_JWT_KEY = previous.jwtKey;
    if (previous.authorizedParties === undefined) {
      delete process.env.CLERK_AUTHORIZED_PARTIES;
    } else {
      process.env.CLERK_AUTHORIZED_PARTIES = previous.authorizedParties;
    }
    if (previous.adminIds === undefined)
      delete process.env.CLERK_ADMIN_USER_IDS;
    else process.env.CLERK_ADMIN_USER_IDS = previous.adminIds;
  });

  assert.equal((await app.inject("/student")).statusCode, 503);
  assert.equal((await app.inject("/admin")).statusCode, 503);
});

test("local demo mode accepts demo student and admin tokens", async (t) => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    secretKey: process.env.CLERK_SECRET_KEY,
    jwtKey: process.env.CLERK_JWT_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES,
    adminIds: process.env.CLERK_ADMIN_USER_IDS,
  };
  process.env.NODE_ENV = "development";
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.CLERK_JWT_KEY;
  delete process.env.CLERK_AUTHORIZED_PARTIES;
  process.env.CLERK_ADMIN_USER_IDS = "demo-admin";

  const app = Fastify({ logger: false });
  app.get("/student", { preHandler: requireClerkUser }, async (request) => ({
    userId: request.clerkUserId,
  }));
  app.get("/admin", { preHandler: requireClerkAdmin }, async (request) => ({
    userId: request.clerkUserId,
  }));
  t.after(async () => {
    await app.close();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous.secretKey;
    if (previous.jwtKey === undefined) delete process.env.CLERK_JWT_KEY;
    else process.env.CLERK_JWT_KEY = previous.jwtKey;
    if (previous.authorizedParties === undefined) {
      delete process.env.CLERK_AUTHORIZED_PARTIES;
    } else {
      process.env.CLERK_AUTHORIZED_PARTIES = previous.authorizedParties;
    }
    if (previous.adminIds === undefined)
      delete process.env.CLERK_ADMIN_USER_IDS;
    else process.env.CLERK_ADMIN_USER_IDS = previous.adminIds;
  });

  const student = await app.inject({
    url: "/student",
    headers: {
      authorization: "Bearer demo:student:demo-student",
    },
  });
  assert.equal(student.statusCode, 200);
  assert.equal(student.json().userId, "demo-student");

  const admin = await app.inject({
    url: "/admin",
    headers: {
      authorization: "Bearer demo:admin:demo-admin",
    },
  });
  assert.equal(admin.statusCode, 200);
  assert.equal(admin.json().userId, "demo-admin");

  const wrongRole = await app.inject({
    url: "/admin",
    headers: {
      authorization: "Bearer demo:student:demo-student",
    },
  });
  assert.equal(wrongRole.statusCode, 403);
});
