import type { FastifyInstance } from "fastify";
import {
  createStudentConversation,
  getAdminConversation,
  getStudentConversation,
  listAdminConversations,
  listStudentConversations,
  sendAdminMessage,
  sendStudentMessage,
} from "../../controller/messaging/messaging.controller.js";
import { requireClerkAdmin } from "../../middleware/require-clerk-admin.js";
import { requireClerkUser } from "../../middleware/require-clerk-user.js";

export async function messagingRoutes(app: FastifyInstance) {
  app.post(
    "/conversations",
    { preHandler: requireClerkUser },
    createStudentConversation,
  );
  app.get(
    "/conversations",
    { preHandler: requireClerkUser },
    listStudentConversations,
  );
  app.get<{ Params: { id: string } }>(
    "/conversations/:id",
    { preHandler: requireClerkUser },
    getStudentConversation,
  );
  app.post<{ Params: { id: string } }>(
    "/conversations/:id/messages",
    { preHandler: requireClerkUser },
    sendStudentMessage,
  );
  app.get(
    "/admin/conversations",
    { preHandler: requireClerkAdmin },
    listAdminConversations,
  );
  app.get<{ Params: { id: string } }>(
    "/admin/conversations/:id",
    { preHandler: requireClerkAdmin },
    getAdminConversation,
  );
  app.post<{ Params: { id: string } }>(
    "/admin/conversations/:id/messages",
    { preHandler: requireClerkAdmin },
    sendAdminMessage,
  );
}
