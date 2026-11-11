import { verifyToken } from "@clerk/backend";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveClerkAuthorizedParties } from "../lib/cors-config.js";
import {
  getClerkVerificationKeys,
  getDemoTokenRoleAndUser,
  isLocalDemoModeEnabled,
} from "../lib/clerk-config.js";

declare module "fastify" {
  interface FastifyRequest {
    clerkUserId?: string;
  }
}

export async function requireClerkUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorization = request.headers.authorization;
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer demo:")
  ) {
    const demo = getDemoTokenRoleAndUser(authorization);
    if (demo?.role === "student") {
      request.clerkUserId = demo.userId;
      return;
    }
    if (demo?.role === "admin") {
      return reply.code(403).send({ error: "Student access required" });
    }
  }

  if (isLocalDemoModeEnabled()) {
    return reply.code(503).send({
      error: "Local demo mode requires a demo student token.",
    });
  }

  const verificationKeys = getClerkVerificationKeys();
  let authorizedParties: string[];
  try {
    authorizedParties = resolveClerkAuthorizedParties();
  } catch (error) {
    request.log.error(
      { err: error },
      "Clerk student access configuration is invalid",
    );
    return reply
      .code(503)
      .send({ error: "Clerk student access is not configured correctly" });
  }

  if (!verificationKeys || authorizedParties.length === 0) {
    return reply.code(503).send({
      error: "Clerk student access is not configured for this environment",
    });
  }

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return reply.code(401).send({ error: "Sign-in required" });
  }

  try {
    const verified = await verifyToken(authorization.slice("Bearer ".length), {
      ...verificationKeys,
      authorizedParties,
    });
    if (typeof verified.sub !== "string" || verified.sub.length === 0) {
      return reply.code(401).send({ error: "Sign-in required" });
    }
    request.clerkUserId = verified.sub;
  } catch (error) {
    request.log.warn({ err: error }, "Clerk student token verification failed");
    return reply.code(401).send({ error: "Sign-in required" });
  }
}
