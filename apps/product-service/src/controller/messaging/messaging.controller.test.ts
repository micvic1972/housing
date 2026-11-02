import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { prisma } from "@repo/product-db";
import { messagingRoutes } from "../../routes/messaging.routes/messaging.routes.js";
import {
  createStudentConversation,
  getAdminConversation,
  getStudentConversation,
  listStudentConversations,
  sendAdminMessage,
  sendStudentMessage,
} from "./messaging.controller.js";

type TestMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "student" | "admin";
  clientMessageId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

function createReply() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return payload;
    },
  };
}

function request(clerkUserId: string | undefined, body?: unknown, id?: string) {
  return {
    clerkUserId,
    body,
    params: { id },
    log: { error() {}, warn() {} },
  };
}

test("messaging is persisted and scoped to the student and assigned administrator", async () => {
  const saved = {
    listingFindUnique: prisma.listing.findUnique,
    conversationUpsert: prisma.conversation.upsert,
    conversationFindMany: prisma.conversation.findMany,
    conversationFindFirst: prisma.conversation.findFirst,
    conversationFindUnique: prisma.conversation.findUnique,
    conversationUpdateMany: prisma.conversation.updateMany,
    conversationUpdate: prisma.conversation.update,
    messageGroupBy: prisma.message.groupBy,
    messageUpdateMany: prisma.message.updateMany,
    messageFindUnique: prisma.message.findUnique,
    messageCreate: prisma.message.create,
    transaction: prisma.$transaction,
  };
  const conversations = new Map<
    string,
    {
      id: string;
      listingId: string;
      studentId: string;
      assignedAdminId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  const messages: TestMessage[] = [];
  let nextId = 0;
  const listing = {
    id: "listing-1",
    name: "Test listing",
    area: "Alihame",
    campus: "alihame",
  };

  const detail = (conversationId: string) => {
    const item = conversations.get(conversationId);
    if (!item) return null;
    return {
      ...item,
      listing,
      messages: messages
        .filter((message) => message.conversationId === conversationId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    };
  };

  Reflect.set(
    prisma.listing,
    "findUnique",
    async ({ where }: { where: { id: string } }) =>
      where.id === listing.id ? { id: listing.id } : null,
  );
  Reflect.set(
    prisma.conversation,
    "upsert",
    async ({
      where,
      create,
    }: {
      where: { studentId_listingId: { studentId: string; listingId: string } };
      create: { studentId: string; listingId: string };
    }) => {
      const { studentId, listingId } = where.studentId_listingId;
      let existing = [...conversations.values()].find(
        (item) => item.studentId === studentId && item.listingId === listingId,
      );
      if (!existing) {
        existing = {
          id: `conversation-${++nextId}`,
          studentId: create.studentId,
          listingId: create.listingId,
          assignedAdminId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        conversations.set(existing.id, existing);
      }
      return detail(existing.id);
    },
  );
  Reflect.set(
    prisma.conversation,
    "findMany",
    async ({ where }: { where: { studentId?: string } }) =>
      [...conversations.values()]
        .filter(
          (item) => !where.studentId || item.studentId === where.studentId,
        )
        .map((item) => ({
          ...detail(item.id),
          messages: messages
            .filter((message) => message.conversationId === item.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 1),
        })),
  );
  Reflect.set(
    prisma.conversation,
    "findFirst",
    async ({
      where,
    }: {
      where: {
        id: string;
        studentId?: string;
        OR?: Array<{ assignedAdminId: string | null }>;
      };
    }) => {
      const item = conversations.get(where.id);
      if (!item) return null;
      if (where.studentId && item.studentId !== where.studentId) return null;
      if (
        where.OR &&
        !where.OR.some(
          (condition) => item.assignedAdminId === condition.assignedAdminId,
        )
      ) {
        return null;
      }
      return { id: item.id };
    },
  );
  Reflect.set(
    prisma.conversation,
    "findUnique",
    async ({ where }: { where: { id: string } }) => detail(where.id),
  );
  Reflect.set(
    prisma.conversation,
    "updateMany",
    async ({
      where,
      data,
    }: {
      where: { id: string; assignedAdminId: null };
      data: { assignedAdminId: string };
    }) => {
      const item = conversations.get(where.id);
      if (!item || item.assignedAdminId !== where.assignedAdminId) {
        return { count: 0 };
      }
      item.assignedAdminId = data.assignedAdminId;
      return { count: 1 };
    },
  );
  Reflect.set(
    prisma.conversation,
    "update",
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { updatedAt: Date };
    }) => {
      const item = conversations.get(where.id);
      assert.ok(item);
      item.updatedAt = data.updatedAt;
      return item;
    },
  );
  Reflect.set(
    prisma.message,
    "groupBy",
    async ({
      where,
    }: {
      where: { conversationId: { in: string[] }; senderRole: string };
    }) =>
      where.conversationId.in.flatMap((id) => {
        const count = messages.filter(
          (message) =>
            message.conversationId === id &&
            message.senderRole === where.senderRole &&
            message.readAt === null,
        ).length;
        return count ? [{ conversationId: id, _count: { _all: count } }] : [];
      }),
  );
  Reflect.set(
    prisma.message,
    "updateMany",
    async ({
      where,
      data,
    }: {
      where: { conversationId: string; senderRole: string; readAt: null };
      data: { readAt: Date };
    }) => {
      let count = 0;
      for (const message of messages) {
        if (
          message.conversationId === where.conversationId &&
          message.senderRole === where.senderRole &&
          message.readAt === null
        ) {
          message.readAt = data.readAt;
          count += 1;
        }
      }
      return { count };
    },
  );
  Reflect.set(
    prisma.message,
    "findUnique",
    async ({
      where,
    }: {
      where: {
        conversationId_clientMessageId: {
          conversationId: string;
          clientMessageId: string;
        };
      };
    }) =>
      messages.find(
        (message) =>
          message.conversationId ===
            where.conversationId_clientMessageId.conversationId &&
          message.clientMessageId ===
            where.conversationId_clientMessageId.clientMessageId,
      ) ?? null,
  );
  Reflect.set(
    prisma.message,
    "create",
    async ({
      data,
    }: {
      data: Omit<TestMessage, "id" | "readAt" | "createdAt">;
    }) => {
      const message: TestMessage = {
        ...data,
        id: `message-${++nextId}`,
        readAt: null,
        createdAt: new Date(),
      };
      messages.push(message);
      return message;
    },
  );
  Reflect.set(
    prisma,
    "$transaction",
    async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
  );

  try {
    const createA = createReply();
    await createStudentConversation(
      request("student-a", { listingId: "listing-1" }) as never,
      createA as never,
    );
    const firstId = (createA.payload as { data: { id: string } }).data.id;
    const createB = createReply();
    await createStudentConversation(
      request("student-b", { listingId: "listing-1" }) as never,
      createB as never,
    );
    const secondId = (createB.payload as { data: { id: string } }).data.id;
    assert.notEqual(firstId, secondId);

    const firstMessage = {
      body: "Is this listing still available?",
      clientMessageId: "request-0001",
    };
    const sendStudent = async (studentId: string, messageId: string) => {
      const result = createReply();
      await sendStudentMessage(
        request(
          studentId,
          { ...firstMessage, clientMessageId: messageId },
          firstId,
        ) as never,
        result as never,
      );
      return result;
    };
    const sent = await sendStudent("student-a", "request-0001");
    assert.equal(sent.statusCode, 201);
    assert.equal(messages.length, 1);
    const duplicate = await sendStudent("student-a", "request-0001");
    assert.equal(duplicate.statusCode, 200);
    assert.equal((duplicate.payload as { duplicate: boolean }).duplicate, true);
    assert.equal(messages.length, 1);
    const crossStudent = await sendStudent("student-b", "request-0002");
    assert.equal(crossStudent.statusCode, 403);
    assert.equal(messages.length, 1);

    const reply = createReply();
    await sendAdminMessage(
      request(
        "admin-a",
        { body: "Yes, it is available.", clientMessageId: "admin-msg-0001" },
        firstId,
      ) as never,
      reply as never,
    );
    assert.equal(reply.statusCode, 201);
    assert.equal(conversations.get(firstId)?.assignedAdminId, "admin-a");

    const otherAdminReply = createReply();
    await sendAdminMessage(
      request(
        "admin-b",
        { body: "I am another admin.", clientMessageId: "admin-msg-0002" },
        firstId,
      ) as never,
      otherAdminReply as never,
    );
    assert.equal(otherAdminReply.statusCode, 403);

    const studentThread = createReply();
    await getStudentConversation(
      request("student-a", undefined, firstId) as never,
      studentThread as never,
    );
    assert.equal(studentThread.statusCode, 200);
    assert.ok(messages.find((item) => item.senderRole === "admin")?.readAt);

    const adminThread = createReply();
    await getAdminConversation(
      request("admin-a", undefined, firstId) as never,
      adminThread as never,
    );
    assert.equal(adminThread.statusCode, 200);
    assert.ok(messages.find((item) => item.senderRole === "student")?.readAt);

    const studentList = createReply();
    await listStudentConversations(
      request("student-b") as never,
      studentList as never,
    );
    const studentBData = (
      studentList.payload as {
        data: Array<{ id: string }>;
      }
    ).data;
    assert.deepEqual(
      studentBData.map((item) => item.id),
      [secondId],
    );
  } finally {
    Reflect.set(prisma.listing, "findUnique", saved.listingFindUnique);
    Reflect.set(prisma.conversation, "upsert", saved.conversationUpsert);
    Reflect.set(prisma.conversation, "findMany", saved.conversationFindMany);
    Reflect.set(prisma.conversation, "findFirst", saved.conversationFindFirst);
    Reflect.set(
      prisma.conversation,
      "findUnique",
      saved.conversationFindUnique,
    );
    Reflect.set(
      prisma.conversation,
      "updateMany",
      saved.conversationUpdateMany,
    );
    Reflect.set(prisma.conversation, "update", saved.conversationUpdate);
    Reflect.set(prisma.message, "groupBy", saved.messageGroupBy);
    Reflect.set(prisma.message, "updateMany", saved.messageUpdateMany);
    Reflect.set(prisma.message, "findUnique", saved.messageFindUnique);
    Reflect.set(prisma.message, "create", saved.messageCreate);
    Reflect.set(prisma, "$transaction", saved.transaction);
  }
});

test("messaging routes reject unauthenticated student and admin requests", async () => {
  const keys = [
    "CLERK_SECRET_KEY",
    "CLERK_AUTHORIZED_PARTIES",
    "CLERK_ADMIN_USER_IDS",
  ] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]] as const));
  process.env.CLERK_SECRET_KEY = "test-secret";
  process.env.CLERK_AUTHORIZED_PARTIES = "https://example.test";
  process.env.CLERK_ADMIN_USER_IDS = "admin-a";

  const app = Fastify();
  try {
    await app.register(messagingRoutes);
    const studentPost = await app.inject({
      method: "POST",
      url: "/conversations",
      payload: { listingId: "listing-1" },
    });
    const studentGet = await app.inject({
      method: "GET",
      url: "/conversations",
    });
    const adminGet = await app.inject({
      method: "GET",
      url: "/admin/conversations",
    });
    assert.equal(studentPost.statusCode, 401);
    assert.equal(studentGet.statusCode, 401);
    assert.equal(adminGet.statusCode, 401);
  } finally {
    await app.close();
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
