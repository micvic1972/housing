import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";

type CreateInspectionBody = {
  listingId?: unknown;
  clientRequestId?: unknown;
  scheduledFor?: unknown;
  notes?: unknown;
};

type UpdateInspectionBody = {
  status?: unknown;
  scheduledFor?: unknown;
  adminResponse?: unknown;
};

type InspectionTransaction = Pick<
  typeof prisma,
  "$executeRaw" | "$queryRaw" | "listing" | "inspectionRequest"
>;

const activeStatuses = ["requested", "confirmed"] as const;
const transactionOptions = { maxWait: 15_000, timeout: 30_000 } as const;

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function lockListing(
  transaction: InspectionTransaction,
  listingId: string,
) {
  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${listingId}, 0))
  `;
  await transaction.$queryRaw`
    SELECT "id" FROM "Listing" WHERE "id" = ${listingId} FOR SHARE
  `;
}

async function hasSlotConflict(
  transaction: InspectionTransaction,
  listingId: string,
  scheduledFor: Date,
  excludeRequestId?: string,
) {
  const conflict = await transaction.inspectionRequest.findFirst({
    where: {
      listingId,
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      OR: [
        {
          status: { in: [...activeStatuses] },
          scheduledFor,
        },
        {
          status: { in: [...activeStatuses] },
          rescheduleProposedFor: scheduledFor,
        },
      ],
    },
    select: { id: true },
  });
  return conflict !== null;
}

function matchesCreateRequest(
  existing: {
    listingId: string;
    scheduledFor: Date;
    notes: string | null;
  },
  listingId: string,
  scheduledFor: Date,
  notes: string | null,
) {
  return (
    existing.listingId === listingId &&
    existing.scheduledFor.getTime() === scheduledFor.getTime() &&
    existing.notes === notes
  );
}

export async function createInspectionRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = request.body as CreateInspectionBody | undefined;
  const listingId = body?.listingId;
  const clientRequestId = body?.clientRequestId;
  const scheduledFor = body?.scheduledFor;
  const notes = body?.notes;

  if (
    typeof listingId !== "string" ||
    listingId.length === 0 ||
    typeof clientRequestId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(clientRequestId) ||
    !isValidDate(scheduledFor) ||
    (notes !== undefined && notes !== null && typeof notes !== "string") ||
    (typeof notes === "string" && notes.trim().length > 1000)
  ) {
    return reply.code(400).send({ error: "Invalid inspection request" });
  }

  const requestedDate = new Date(scheduledFor);
  if (requestedDate.getTime() < Date.now() + 30 * 60 * 1000) {
    return reply.code(400).send({
      error: "Choose an inspection time at least 30 minutes from now",
    });
  }
  const normalizedNotes =
    typeof notes === "string" && notes.trim() ? notes.trim() : null;
  const studentId = request.clerkUserId!;

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await lockListing(transaction, listingId);
      const listing = await transaction.listing.findUnique({
        where: { id: listingId },
        select: { id: true, kind: true, status: true },
      });
      if (!listing) return { kind: "not_found" as const };
      if (
        listing.kind === "rented" ||
        ["rented", "unavailable", "archived"].includes(listing.status)
      ) {
        return { kind: "unavailable" as const };
      }

      const existing = await transaction.inspectionRequest.findUnique({
        where: {
          studentId_clientRequestId: { studentId, clientRequestId },
        },
      });
      if (existing) {
        return matchesCreateRequest(
          existing,
          listingId,
          requestedDate,
          normalizedNotes,
        )
          ? { kind: "duplicate" as const, data: existing }
          : { kind: "idempotency_conflict" as const };
      }

      if (await hasSlotConflict(transaction, listingId, requestedDate)) {
        return { kind: "slot_conflict" as const };
      }

      const data = await transaction.inspectionRequest.create({
        data: {
          listingId,
          studentId,
          clientRequestId,
          scheduledFor: requestedDate,
          notes: normalizedNotes,
        },
        include: {
          listing: {
            select: { id: true, name: true, area: true, campus: true },
          },
        },
      });
      return { kind: "created" as const, data };
    }, transactionOptions);

    if (result.kind === "not_found") {
      return reply.code(404).send({ error: "Listing not found" });
    }
    if (result.kind === "unavailable") {
      return reply.code(409).send({
        error: "This listing is not accepting inspection requests",
      });
    }
    if (result.kind === "idempotency_conflict") {
      return reply.code(409).send({
        error: "The request ID was already used for a different request",
      });
    }
    if (result.kind === "slot_conflict") {
      return reply.code(409).send({
        error: "That inspection time is already requested for this listing",
      });
    }
    return reply
      .code(result.kind === "created" ? 201 : 200)
      .send({ data: result.data, duplicate: result.kind === "duplicate" });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      const duplicate = await prisma.inspectionRequest.findUnique({
        where: {
          studentId_clientRequestId: { studentId, clientRequestId },
        },
        include: {
          listing: {
            select: { id: true, name: true, area: true, campus: true },
          },
        },
      });
      if (
        duplicate &&
        matchesCreateRequest(
          duplicate,
          listingId,
          requestedDate,
          normalizedNotes,
        )
      ) {
        return reply.code(200).send({ data: duplicate, duplicate: true });
      }
      if (duplicate) {
        return reply.code(409).send({
          error: "The request ID was already used for a different request",
        });
      }
    }
    request.log.error(error);
    return reply.code(500).send({ error: "Could not save inspection request" });
  }
}

export async function listStudentInspectionRequests(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = await prisma.inspectionRequest.findMany({
      where: { studentId: request.clerkUserId! },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: { id: true, name: true, area: true, campus: true },
        },
      },
    });
    return reply.send({ data });
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "Could not load inspection requests" });
  }
}

export async function cancelStudentInspectionRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await prisma.inspectionRequest.updateMany({
      where: {
        id: request.params.id,
        studentId: request.clerkUserId!,
        status: "requested",
      },
      data: { status: "cancelled", rescheduleProposedFor: null },
    });
    if (result.count === 0) {
      return reply.code(404).send({
        error: "A cancellable inspection request was not found",
      });
    }
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "Could not cancel inspection request" });
  }
}

export async function acceptStudentInspectionReschedule(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const owned = await transaction.inspectionRequest.findFirst({
        where: { id: request.params.id, studentId: request.clerkUserId! },
        select: { listingId: true },
      });
      if (!owned) return { kind: "not_found" as const };
      await lockListing(transaction, owned.listingId);

      const current = await transaction.inspectionRequest.findFirst({
        where: { id: request.params.id, studentId: request.clerkUserId! },
      });
      if (!current) return { kind: "not_found" as const };
      if (
        !current.rescheduleProposedFor ||
        !activeStatuses.includes(
          current.status as (typeof activeStatuses)[number],
        )
      ) {
        return { kind: "no_proposal" as const };
      }
      if (
        await hasSlotConflict(
          transaction,
          current.listingId,
          current.rescheduleProposedFor,
          current.id,
        )
      ) {
        return { kind: "slot_conflict" as const };
      }

      const updated = await transaction.inspectionRequest.updateMany({
        where: {
          id: current.id,
          studentId: request.clerkUserId!,
          status: current.status,
          rescheduleProposedFor: current.rescheduleProposedFor,
        },
        data: {
          scheduledFor: current.rescheduleProposedFor,
          rescheduleProposedFor: null,
          status: "confirmed",
        },
      });
      if (updated.count === 0) return { kind: "changed" as const };
      const data = await transaction.inspectionRequest.findUnique({
        where: { id: current.id },
        include: {
          listing: {
            select: { id: true, name: true, area: true, campus: true },
          },
        },
      });
      return { kind: "updated" as const, data };
    }, transactionOptions);

    if (result.kind === "not_found") {
      return reply.code(404).send({ error: "Inspection request not found" });
    }
    if (result.kind === "no_proposal") {
      return reply.code(409).send({
        error: "There is no pending reschedule proposal to accept",
      });
    }
    if (result.kind === "slot_conflict") {
      return reply.code(409).send({
        error: "That inspection time is no longer available",
      });
    }
    if (result.kind === "changed") {
      return reply.code(409).send({
        error: "Inspection request changed; reload and try again",
      });
    }
    return reply.send({ data: result.data });
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "Could not accept the reschedule proposal" });
  }
}

export async function declineStudentInspectionReschedule(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const owned = await transaction.inspectionRequest.findFirst({
        where: { id: request.params.id, studentId: request.clerkUserId! },
        select: { listingId: true },
      });
      if (!owned) return { kind: "not_found" as const };
      await lockListing(transaction, owned.listingId);

      const updated = await transaction.inspectionRequest.updateMany({
        where: {
          id: request.params.id,
          studentId: request.clerkUserId!,
          status: { in: [...activeStatuses] },
          rescheduleProposedFor: { not: null },
        },
        data: { rescheduleProposedFor: null },
      });
      if (updated.count === 0) return { kind: "not_found" as const };
      const data = await transaction.inspectionRequest.findFirst({
        where: { id: request.params.id, studentId: request.clerkUserId! },
        include: {
          listing: {
            select: { id: true, name: true, area: true, campus: true },
          },
        },
      });
      return { kind: "updated" as const, data };
    }, transactionOptions);
    if (result.kind === "not_found") {
      return reply.code(404).send({
        error: "A pending reschedule proposal was not found",
      });
    }
    return reply.send({ data: result.data });
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "Could not decline the reschedule proposal" });
  }
}

export async function listAdminInspectionRequests(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const data = await prisma.inspectionRequest.findMany({
      orderBy: [{ status: "asc" }, { scheduledFor: "asc" }],
      include: {
        listing: {
          select: { id: true, name: true, area: true, campus: true },
        },
      },
    });
    return reply.send({ data });
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "Could not load inspection requests" });
  }
}

export async function updateAdminInspectionRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const body = request.body as UpdateInspectionBody | undefined;
  const status = body?.status;
  const scheduledFor = body?.scheduledFor;
  const adminResponse = body?.adminResponse;
  if (
    (status !== undefined &&
      !["confirmed", "declined", "completed"].includes(String(status))) ||
    (scheduledFor !== undefined && !isValidDate(scheduledFor)) ||
    (status === undefined && scheduledFor === undefined) ||
    (adminResponse !== undefined &&
      (typeof adminResponse !== "string" || adminResponse.trim().length > 1000))
  ) {
    return reply.code(400).send({ error: "Invalid inspection update" });
  }
  const responseText =
    typeof adminResponse === "string" ? adminResponse.trim() : "";
  if (
    (status === "confirmed" || status === "declined" || scheduledFor) &&
    !responseText
  ) {
    return reply.code(400).send({
      error: "Add a response for the student before saving this decision",
    });
  }
  if (isValidDate(scheduledFor)) {
    const proposedDate = new Date(scheduledFor);
    if (proposedDate.getTime() < Date.now() + 30 * 60 * 1000) {
      return reply.code(400).send({
        error: "Choose a proposed inspection time at least 30 minutes from now",
      });
    }
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const initial = await transaction.inspectionRequest.findUnique({
        where: { id: request.params.id },
        select: { listingId: true },
      });
      if (!initial) return { kind: "not_found" as const };
      await lockListing(transaction, initial.listingId);

      const current = await transaction.inspectionRequest.findUnique({
        where: { id: request.params.id },
      });
      if (!current) return { kind: "not_found" as const };
      if (status === "confirmed" && current.status !== "requested") {
        return {
          kind: "invalid_transition" as const,
          message: "Only requested inspections can be confirmed",
        };
      }
      if (status === "declined" && current.status !== "requested") {
        return {
          kind: "invalid_transition" as const,
          message: "Only requested inspections can be declined",
        };
      }
      if (status === "completed" && current.status !== "confirmed") {
        return {
          kind: "invalid_transition" as const,
          message: "Only confirmed inspections can be completed",
        };
      }
      if (
        scheduledFor !== undefined &&
        !activeStatuses.includes(
          current.status as (typeof activeStatuses)[number],
        )
      ) {
        return {
          kind: "invalid_transition" as const,
          message: "Only active requests can be rescheduled",
        };
      }
      if (
        scheduledFor !== undefined &&
        new Date(scheduledFor).getTime() === current.scheduledFor.getTime()
      ) {
        return {
          kind: "invalid_transition" as const,
          message: "Choose a different time to propose",
        };
      }
      if (status === "confirmed" && current.rescheduleProposedFor !== null) {
        return {
          kind: "invalid_transition" as const,
          message: "The student must accept or decline the proposed time first",
        };
      }

      if (isValidDate(scheduledFor)) {
        const proposedDate = new Date(scheduledFor);
        if (
          await hasSlotConflict(
            transaction,
            current.listingId,
            proposedDate,
            current.id,
          )
        ) {
          return { kind: "slot_conflict" as const };
        }
      }

      const updated = await transaction.inspectionRequest.updateMany({
        where: {
          id: current.id,
          status: current.status,
          scheduledFor: current.scheduledFor,
          rescheduleProposedFor: current.rescheduleProposedFor,
        },
        data: {
          ...(status ? { status } : {}),
          ...(status === "declined" ? { rescheduleProposedFor: null } : {}),
          ...(isValidDate(scheduledFor)
            ? { rescheduleProposedFor: new Date(scheduledFor) }
            : {}),
          ...(responseText ? { adminResponse: responseText } : {}),
        },
      });
      if (updated.count === 0) return { kind: "changed" as const };
      const data = await transaction.inspectionRequest.findUnique({
        where: { id: current.id },
        include: {
          listing: {
            select: { id: true, name: true, area: true, campus: true },
          },
        },
      });
      return { kind: "updated" as const, data };
    }, transactionOptions);

    if (result.kind === "not_found") {
      return reply.code(404).send({ error: "Inspection request not found" });
    }
    if (result.kind === "invalid_transition") {
      return reply.code(409).send({ error: result.message });
    }
    if (result.kind === "slot_conflict") {
      return reply.code(409).send({
        error: "That inspection time is already requested for this listing",
      });
    }
    if (result.kind === "changed") {
      return reply.code(409).send({
        error: "Inspection request changed; reload and try again",
      });
    }
    return reply.send({ data: result.data });
  } catch (error) {
    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "Could not update inspection request" });
  }
}
