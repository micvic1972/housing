import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";

type CreateConversationBody = { listingId?: unknown };
type SendMessageBody = {
  body?: unknown;
  clientMessageId?: unknown;
};
type ConversationParams = { id: string };

const messageInclude = {
  listing: { select: { id: true, name: true, area: true, campus: true } },
} as const;

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function invalidMessage(body: SendMessageBody | undefined) {
  return (
    typeof body?.body !== "string" ||
    body.body.trim().length === 0 ||
    body.body.trim().length > 2000 ||
    typeof body.clientMessageId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(body.clientMessageId)
  );
}

async function getUnreadCounts(
  conversationIds: string[],
  senderRole: "student" | "admin",
) {
  if (conversationIds.length === 0) return new Map<string, number>();
  const counts = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversationIds },
      senderRole,
      readAt: null,
    },
    _count: { _all: true },
  });
  return new Map(counts.map((item) => [item.conversationId, item._count._all]));
}

export async function createStudentConversation(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const studentId = request.clerkUserId;
  const listingId = (request.body as CreateConversationBody | undefined)
    ?.listingId;
  if (!studentId) return reply.code(401).send({ error: "Sign-in required" });
  if (typeof listingId !== "string" || listingId.trim().length === 0) {
    return reply.code(400).send({ error: "A listing ID is required" });
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) return reply.code(404).send({ error: "Listing not found" });

    const conversation = await prisma.conversation.upsert({
      where: { studentId_listingId: { studentId, listingId } },
      update: {},
      create: { studentId, listingId },
      include: messageInclude,
    });
    return reply.code(200).send({ data: conversation });
  } catch (error) {
    request.log.error({ err: error }, "Could not create conversation");
    return reply.code(500).send({ error: "Could not create conversation" });
  }
}

export async function listStudentConversations(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const studentId = request.clerkUserId;
  if (!studentId) return reply.code(401).send({ error: "Sign-in required" });

  try {
    const conversations = await prisma.conversation.findMany({
      where: { studentId },
      include: {
        ...messageInclude,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    const unread = await getUnreadCounts(
      conversations.map((item) => item.id),
      "admin",
    );
    return reply.code(200).send({
      data: conversations.map((item) => ({
        ...item,
        lastMessage: item.messages[0] ?? null,
        unreadCount: unread.get(item.id) ?? 0,
      })),
    });
  } catch (error) {
    request.log.error({ err: error }, "Could not load student conversations");
    return reply.code(500).send({ error: "Could not load conversations" });
  }
}

export async function listAdminConversations(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const adminId = request.clerkUserId;
  if (!adminId)
    return reply.code(401).send({ error: "Admin authentication required" });

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ assignedAdminId: null }, { assignedAdminId: adminId }],
      },
      include: {
        ...messageInclude,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
    const unread = await getUnreadCounts(
      conversations.map((item) => item.id),
      "student",
    );
    return reply.code(200).send({
      data: conversations.map((item) => ({
        ...item,
        lastMessage: item.messages[0] ?? null,
        unreadCount: unread.get(item.id) ?? 0,
      })),
    });
  } catch (error) {
    request.log.error({ err: error }, "Could not load admin conversations");
    return reply.code(500).send({ error: "Could not load conversations" });
  }
}

export async function getStudentConversation(
  request: FastifyRequest<{ Params: ConversationParams }>,
  reply: FastifyReply,
) {
  const studentId = request.clerkUserId;
  if (!studentId) return reply.code(401).send({ error: "Sign-in required" });

  try {
    const found = await prisma.conversation.findFirst({
      where: { id: request.params.id, studentId },
      select: { id: true },
    });
    if (!found) {
      return reply.code(404).send({ error: "Conversation not found" });
    }

    await prisma.message.updateMany({
      where: {
        conversationId: found.id,
        senderRole: "admin",
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    const conversation = await prisma.conversation.findUnique({
      where: { id: found.id },
      include: {
        ...messageInclude,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return reply.code(200).send({ data: conversation });
  } catch (error) {
    request.log.error({ err: error }, "Could not load student conversation");
    return reply.code(500).send({ error: "Could not load conversation" });
  }
}

export async function getAdminConversation(
  request: FastifyRequest<{ Params: ConversationParams }>,
  reply: FastifyReply,
) {
  const adminId = request.clerkUserId;
  if (!adminId) {
    return reply.code(401).send({ error: "Admin authentication required" });
  }

  try {
    const found = await prisma.conversation.findFirst({
      where: {
        id: request.params.id,
        OR: [{ assignedAdminId: null }, { assignedAdminId: adminId }],
      },
      select: { id: true },
    });
    if (!found) {
      return reply.code(404).send({ error: "Conversation not found" });
    }
    await prisma.message.updateMany({
      where: {
        conversationId: found.id,
        senderRole: "student",
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    const conversation = await prisma.conversation.findUnique({
      where: { id: found.id },
      include: {
        ...messageInclude,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return reply.code(200).send({ data: conversation });
  } catch (error) {
    request.log.error({ err: error }, "Could not load admin conversation");
    return reply.code(500).send({ error: "Could not load conversation" });
  }
}

async function sendMessage(
  request: FastifyRequest<{ Params: ConversationParams }>,
  reply: FastifyReply,
  senderRole: "student" | "admin",
) {
  const senderId = request.clerkUserId;
  const body = request.body as SendMessageBody | undefined;
  if (!senderId) {
    return reply.code(401).send({
      error:
        senderRole === "admin"
          ? "Admin authentication required"
          : "Sign-in required",
    });
  }
  if (!body || invalidMessage(body)) {
    return reply.code(400).send({
      error:
        "A message and valid client message ID are required (maximum 2000 characters)",
    });
  }

  const text = (body.body as string).trim();
  const clientMessageId = body.clientMessageId as string;
  const conversationId = request.params.id;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const conversation = await transaction.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, studentId: true, assignedAdminId: true },
      });
      if (!conversation) return { kind: "not_found" as const };

      if (senderRole === "student" && conversation.studentId !== senderId) {
        return { kind: "forbidden" as const };
      }
      if (
        senderRole === "admin" &&
        conversation.assignedAdminId !== null &&
        conversation.assignedAdminId !== senderId
      ) {
        return { kind: "forbidden" as const };
      }
      if (senderRole === "admin" && conversation.assignedAdminId === null) {
        const claimed = await transaction.conversation.updateMany({
          where: { id: conversationId, assignedAdminId: null },
          data: { assignedAdminId: senderId },
        });
        if (claimed.count !== 1) return { kind: "forbidden" as const };
      }

      const existing = await transaction.message.findUnique({
        where: {
          conversationId_clientMessageId: { conversationId, clientMessageId },
        },
      });
      if (existing) {
        if (existing.senderId !== senderId || existing.body !== text) {
          return { kind: "idempotency_conflict" as const };
        }
        return { kind: "duplicate" as const, data: existing };
      }

      const message = await transaction.message.create({
        data: {
          conversationId,
          senderId,
          senderRole,
          clientMessageId,
          body: text,
        },
      });
      await transaction.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return { kind: "created" as const, data: message };
    });

    if (result.kind === "not_found") {
      return reply.code(404).send({ error: "Conversation not found" });
    }
    if (result.kind === "forbidden") {
      return reply
        .code(403)
        .send({ error: "You cannot access this conversation" });
    }
    if (result.kind === "idempotency_conflict") {
      return reply.code(409).send({ error: "Message ID was already used" });
    }
    return reply
      .code(result.kind === "created" ? 201 : 200)
      .send({ data: result.data, duplicate: result.kind === "duplicate" });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      const duplicate = await prisma.message.findUnique({
        where: {
          conversationId_clientMessageId: { conversationId, clientMessageId },
        },
      });
      if (
        duplicate &&
        duplicate.senderId === senderId &&
        duplicate.body === text
      ) {
        return reply.code(200).send({ data: duplicate, duplicate: true });
      }
      return reply.code(409).send({ error: "Message ID was already used" });
    }
    request.log.error({ err: error }, "Could not persist message");
    return reply
      .code(500)
      .send({ error: "Could not send message. Retry safely." });
  }
}

export function sendStudentMessage(
  request: FastifyRequest<{ Params: ConversationParams }>,
  reply: FastifyReply,
) {
  return sendMessage(request, reply, "student");
}

export function sendAdminMessage(
  request: FastifyRequest<{ Params: ConversationParams }>,
  reply: FastifyReply,
) {
  return sendMessage(request, reply, "admin");
}
