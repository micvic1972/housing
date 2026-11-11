import { verifyToken } from "@clerk/backend";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {} from "./require-clerk-user.js";
import { resolveClerkAuthorizedParties } from "../lib/cors-config.js";
import {
  getClerkVerificationKeys,
  getDemoTokenRoleAndUser,
  isLocalDemoModeEnabled,
} from "../lib/clerk-config.js";

export async function requireClerkAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorization = request.headers.authorization;
  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer demo:")
  ) {
    const demo = getDemoTokenRoleAndUser(authorization);
    if (demo?.role === "admin") {
      request.clerkUserId = demo.userId;
      return;
    }
    if (demo?.role === "student") {
      return reply.code(403).send({ error: "Administrator access required" });
    }
  }

  if (isLocalDemoModeEnabled()) {
    return reply.code(503).send({
      error: "Local demo mode requires a demo admin token.",
    });
  }

  const verificationKeys = getClerkVerificationKeys();
  const adminIds = (process.env.CLERK_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  let authorizedParties: string[];
  try {
    authorizedParties = resolveClerkAuthorizedParties();
  } catch (error) {
    request.log.error(
      { err: error },
      "Clerk administrator access configuration is invalid",
    );
    return reply.code(503).send({
      error: "Clerk administrator access is not configured correctly",
    });
  }
  if (
    !verificationKeys ||
    adminIds.length === 0 ||
    authorizedParties.length === 0
  ) {
    return reply.code(503).send({
      error:
        "Clerk administrator access is not configured for this environment",
    });
  }

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return reply.code(401).send({ error: "Admin authentication required" });
  }

  let userId: string | undefined;
  try {
    const verified = await verifyToken(authorization.slice("Bearer ".length), {
      ...verificationKeys,
      authorizedParties,
    });
    if (typeof verified.sub !== "string") {
      return reply.code(401).send({ error: "Admin authentication required" });
    }
    userId = verified.sub;
  } catch (error) {
    request.log.warn({ err: error }, "Clerk token verification failed");
    return reply.code(401).send({ error: "Admin authentication required" });
  }

  if (!adminIds.includes(userId)) {
    return reply.code(403).send({ error: "Administrator access required" });
  }
  request.clerkUserId = userId;
}
