import { verifyToken } from "@clerk/backend";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireClerkAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const jwtKey = process.env.CLERK_JWT_KEY;
  const adminIds = (process.env.CLERK_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    (!secretKey && !jwtKey) ||
    adminIds.length === 0 ||
    authorizedParties.length === 0
  ) {
    return reply.code(503).send({
      error: "Clerk administrator access is not configured on the server",
    });
  }

  const authorization = request.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Admin authentication required" });
  }

  let userId: string | undefined;
  try {
    const verified = await verifyToken(authorization.slice("Bearer ".length), {
      ...(secretKey ? { secretKey } : {}),
      ...(jwtKey ? { jwtKey } : {}),
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
}
