import { verifyToken } from "@clerk/backend";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveClerkAuthorizedParties } from "../lib/cors-config.js";

declare module "fastify" {
  interface FastifyRequest {
    clerkUserId?: string;
  }
}

export async function requireClerkUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const jwtKey = process.env.CLERK_JWT_KEY;
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

  if ((!secretKey && !jwtKey) || authorizedParties.length === 0) {
    return reply
      .code(503)
      .send({ error: "Clerk student access is not configured on the server" });
  }

  const authorization = request.headers.authorization;
  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return reply.code(401).send({ error: "Sign-in required" });
  }

  try {
    const verified = await verifyToken(authorization.slice("Bearer ".length), {
      ...(secretKey ? { secretKey } : {}),
      ...(jwtKey ? { jwtKey } : {}),
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
