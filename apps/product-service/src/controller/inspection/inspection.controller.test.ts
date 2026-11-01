import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { prisma } from "@repo/product-db";
import {
  acceptStudentInspectionReschedule,
  cancelStudentInspectionRequest,
  createInspectionRequest,
  listStudentInspectionRequests,
  updateAdminInspectionRequest,
} from "./inspection.controller.js";
import { inspectionRoutes } from "../../routes/inspection.routes/inspection.routes.js";

async function withTransactionMock<T>(
  transaction: object,
  run: () => Promise<T>,
) {
  const original = prisma.$transaction;
  Reflect.set(
    prisma,
    "$transaction",
    async (callback: (tx: object) => Promise<unknown>) => callback(transaction),
  );
  try {
    return await run();
  } finally {
    Reflect.set(prisma, "$transaction", original);
  }
}

function transaction(
  overrides: {
    listing?: Record<string, unknown>;
    inspectionRequest?: Record<string, unknown>;
  } = {},
) {
  return {
    $executeRaw: async () => 1,
    $queryRaw: async () => [],
    listing: {
      findUnique: async () => ({
        id: "listing-1",
        kind: "available",
        status: "active",
      }),
      ...overrides.listing,
    },
    inspectionRequest: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async () => ({
        id: "inspection-1",
        listingId: "listing-1",
        studentId: "student-1",
        clientRequestId: "request-key-123",
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
        status: "requested",
        notes: null,
        adminResponse: null,
        rescheduleProposedFor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateMany: async () => ({ count: 1 }),
      ...overrides.inspectionRequest,
    },
  };
}

test("inspection creation is idempotent and uses the verified student identity", async () => {
  let created = 0;
  const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
  const saved = {
    id: "inspection-1",
    listingId: "listing-1",
    studentId: "student-1",
    clientRequestId: "request-key-123",
    scheduledFor,
    status: "requested",
    notes: null,
    adminResponse: null,
    rescheduleProposedFor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const tx = transaction({
    inspectionRequest: {
      findUnique: async () => (created === 0 ? null : saved),
      create: async () => {
        created += 1;
        return saved;
      },
    },
  });
  const app = Fastify({ logger: false });
  app.post(
    "/inspections",
    {
      preHandler: async (request) => {
        request.clerkUserId = "student-1";
      },
    },
    createInspectionRequest,
  );
  try {
    await withTransactionMock(tx, async () => {
      const body = {
        listingId: "listing-1",
        clientRequestId: "request-key-123",
        scheduledFor: scheduledFor.toISOString(),
      };
      const first = await app.inject({
        method: "POST",
        url: "/inspections",
        payload: body,
      });
      const retry = await app.inject({
        method: "POST",
        url: "/inspections",
        payload: body,
      });
      assert.equal(first.statusCode, 201);
      assert.equal(retry.statusCode, 200);
      assert.equal(retry.json().duplicate, true);
      assert.equal(created, 1);
    });
  } finally {
    await app.close();
  }
});

test("inspection creation rejects unavailable listings and conflicting slots", async () => {
  const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
  const app = Fastify({ logger: false });
  app.post(
    "/inspections",
    { preHandler: async (request) => void (request.clerkUserId = "student-1") },
    createInspectionRequest,
  );
  try {
    const body = {
      listingId: "listing-1",
      clientRequestId: "request-key-123",
      scheduledFor: scheduledFor.toISOString(),
    };
    const unavailableTx = transaction({
      listing: {
        findUnique: async () => ({
          id: "listing-1",
          kind: "rented",
          status: "rented",
        }),
      },
    });
    await withTransactionMock(unavailableTx, async () => {
      const response = await app.inject({
        method: "POST",
        url: "/inspections",
        payload: body,
      });
      assert.equal(response.statusCode, 409);
      assert.match(response.json().error, /not accepting/);
    });

    const conflictTx = transaction({
      inspectionRequest: {
        findFirst: async () => ({ id: "existing-request" }),
      },
    });
    await withTransactionMock(conflictTx, async () => {
      const response = await app.inject({
        method: "POST",
        url: "/inspections",
        payload: body,
      });
      assert.equal(response.statusCode, 409);
      assert.match(response.json().error, /already requested/);
    });
  } finally {
    await app.close();
  }
});

test("student inspection listing and cancellation are scoped to the verified student", async () => {
  const originalFindMany = prisma.inspectionRequest.findMany;
  const originalUpdateMany = prisma.inspectionRequest.updateMany;
  let listArgs: Record<string, unknown> | undefined;
  let updateArgs: Record<string, unknown> | undefined;
  Reflect.set(prisma.inspectionRequest, "findMany", async (args: unknown) => {
    listArgs = args as Record<string, unknown>;
    return [];
  });
  Reflect.set(prisma.inspectionRequest, "updateMany", async (args: unknown) => {
    updateArgs = args as Record<string, unknown>;
    return { count: 1 };
  });

  const app = Fastify({ logger: false });
  app.get(
    "/inspections",
    { preHandler: async (request) => void (request.clerkUserId = "student-1") },
    listStudentInspectionRequests,
  );
  app.patch(
    "/inspections/:id/cancel",
    { preHandler: async (request) => void (request.clerkUserId = "student-1") },
    cancelStudentInspectionRequest,
  );
  try {
    assert.equal((await app.inject("/inspections")).statusCode, 200);
    assert.deepEqual(listArgs?.where, { studentId: "student-1" });

    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/inspections/request-2/cancel",
        })
      ).statusCode,
      204,
    );
    assert.deepEqual(updateArgs?.where, {
      id: "request-2",
      studentId: "student-1",
      status: "requested",
    });
  } finally {
    await app.close();
    Reflect.set(prisma.inspectionRequest, "findMany", originalFindMany);
    Reflect.set(prisma.inspectionRequest, "updateMany", originalUpdateMany);
  }
});

test("students can accept only their own proposed reschedule", async () => {
  const scheduledFor = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const originalFindFirst = prisma.inspectionRequest.findFirst;
  let updateArgs: Record<string, unknown> | undefined;
  const tx = transaction({
    inspectionRequest: {
      findFirst: async (args: unknown) => {
        const where = (args as { where: Record<string, unknown> }).where;
        if (!("studentId" in where)) return null;
        assert.equal(where.studentId, "student-1");
        if ("select" in (args as Record<string, unknown>)) {
          return { listingId: "listing-1" };
        }
        return {
          id: "request-1",
          listingId: "listing-1",
          studentId: "student-1",
          status: "requested",
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
          rescheduleProposedFor: scheduledFor,
        };
      },
      updateMany: async (args: unknown) => {
        updateArgs = args as Record<string, unknown>;
        return { count: 1 };
      },
      findUnique: async () => ({ id: "request-1", status: "confirmed" }),
    },
  });
  const app = Fastify({ logger: false });
  app.patch(
    "/inspections/:id/accept-reschedule",
    { preHandler: async (request) => void (request.clerkUserId = "student-1") },
    acceptStudentInspectionReschedule,
  );
  try {
    await withTransactionMock(tx, async () => {
      Reflect.set(prisma.inspectionRequest, "findFirst", async () => null);
      const response = await app.inject({
        method: "PATCH",
        url: "/inspections/request-1/accept-reschedule",
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().data.status, "confirmed");
      assert.deepEqual(
        (updateArgs?.where as { studentId: string }).studentId,
        "student-1",
      );
    });
  } finally {
    await app.close();
    Reflect.set(prisma.inspectionRequest, "findFirst", originalFindFirst);
  }
});

test("admin inspection transitions enforce the lifecycle and require a response", async () => {
  const originalFindUnique = prisma.inspectionRequest.findUnique;
  const current = {
    id: "request-1",
    listingId: "listing-1",
    status: "requested",
    scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
    rescheduleProposedFor: null,
  };
  let updateCalled = false;
  const tx = transaction({
    inspectionRequest: {
      findUnique: async () => current,
      updateMany: async () => {
        updateCalled = true;
        return { count: 1 };
      },
    },
  });
  const app = Fastify({ logger: false });
  app.patch<{ Params: { id: string } }>(
    "/admin/inspections/:id",
    { preHandler: async (request) => void (request.clerkUserId = "admin-1") },
    updateAdminInspectionRequest,
  );
  try {
    await withTransactionMock(tx, async () => {
      const invalid = await app.inject({
        method: "PATCH",
        url: "/admin/inspections/request-1",
        payload: { status: "completed" },
      });
      assert.equal(invalid.statusCode, 409);
      assert.equal(updateCalled, false);

      const noResponse = await app.inject({
        method: "PATCH",
        url: "/admin/inspections/request-1",
        payload: { status: "confirmed" },
      });
      assert.equal(noResponse.statusCode, 400);
      assert.match(noResponse.json().error, /response/);
    });
  } finally {
    await app.close();
    Reflect.set(prisma.inspectionRequest, "findUnique", originalFindUnique);
  }
});

test("admin rescheduling persists a proposed time and student response without confirming it", async () => {
  const scheduledFor = new Date(Date.now() + 60 * 60 * 1000);
  const proposedFor = new Date(Date.now() + 2 * 60 * 60 * 1000);
  let updateArgs: Record<string, unknown> | undefined;
  const current = {
    id: "request-1",
    listingId: "listing-1",
    status: "requested",
    scheduledFor,
    rescheduleProposedFor: null,
  };
  const tx = transaction({
    inspectionRequest: {
      findUnique: async () => current,
      updateMany: async (args: unknown) => {
        updateArgs = args as Record<string, unknown>;
        return { count: 1 };
      },
    },
  });
  const app = Fastify({ logger: false });
  app.patch<{ Params: { id: string } }>(
    "/admin/inspections/:id",
    { preHandler: async (request) => void (request.clerkUserId = "admin-1") },
    updateAdminInspectionRequest,
  );
  try {
    await withTransactionMock(tx, async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/admin/inspections/request-1",
        payload: {
          scheduledFor: proposedFor.toISOString(),
          adminResponse: "Could you visit at the proposed time instead?",
        },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(
        (updateArgs?.data as Record<string, unknown>).status,
        undefined,
      );
      assert.equal(
        (
          (updateArgs?.data as Record<string, unknown>)
            .rescheduleProposedFor as Date
        ).getTime(),
        proposedFor.getTime(),
      );
      assert.equal(
        (updateArgs?.data as Record<string, unknown>).adminResponse,
        "Could you visit at the proposed time instead?",
      );
    });
  } finally {
    await app.close();
  }
});

test("inspection API rejects unauthenticated student and admin requests", async () => {
  const previous = {
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES,
    adminIds: process.env.CLERK_ADMIN_USER_IDS,
  };
  process.env.CLERK_SECRET_KEY = "sk_test_dummy";
  process.env.CLERK_AUTHORIZED_PARTIES = "http://localhost:3000";
  process.env.CLERK_ADMIN_USER_IDS = "user_test_admin";
  const app = Fastify({ logger: false });
  try {
    await app.register(inspectionRoutes);
    assert.equal((await app.inject("/inspections")).statusCode, 401);
    assert.equal((await app.inject("/admin/inspections")).statusCode, 401);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/inspections",
          payload: {},
        })
      ).statusCode,
      401,
    );
  } finally {
    await app.close();
    if (previous.secretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previous.secretKey;
    if (previous.authorizedParties === undefined) {
      delete process.env.CLERK_AUTHORIZED_PARTIES;
    } else process.env.CLERK_AUTHORIZED_PARTIES = previous.authorizedParties;
    if (previous.adminIds === undefined)
      delete process.env.CLERK_ADMIN_USER_IDS;
    else process.env.CLERK_ADMIN_USER_IDS = previous.adminIds;
  }
});
