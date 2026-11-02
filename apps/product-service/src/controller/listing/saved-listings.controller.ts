import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";

export async function listSavedListings(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const studentId = request.clerkUserId;
  if (!studentId) {
    return reply.code(401).send({ error: "Sign-in required" });
  }

  try {
    const saved = await prisma.savedListing.findMany({
      where: { studentId },
      select: {
        id: true,
        listingId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.code(200).send({ data: saved });
  } catch (error) {
    request.log.error({ err: error }, "Could not load saved listings");
    return reply.code(500).send({ error: "Could not load saved listings" });
  }
}

export async function saveListing(
  request: FastifyRequest<{ Params: { listingId: string } }>,
  reply: FastifyReply,
) {
  const studentId = request.clerkUserId;
  const listingId = request.params.listingId;

  if (!studentId) {
    return reply.code(401).send({ error: "Sign-in required" });
  }
  if (typeof listingId !== "string" || listingId.trim().length === 0) {
    return reply.code(400).send({ error: "A listing ID is required" });
  }

  try {
    const listingExists = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });

    if (!listingExists) {
      return reply.code(404).send({ error: "Listing not found" });
    }

    const saved = await prisma.savedListing.upsert({
      where: {
        studentId_listingId: {
          studentId,
          listingId,
        },
      },
      update: {},
      create: {
        studentId,
        listingId,
      },
      select: {
        id: true,
        listingId: true,
        createdAt: true,
      },
    });

    return reply.code(200).send({ data: saved, saved: true });
  } catch (error) {
    request.log.error({ err: error }, "Could not save listing");
    return reply.code(500).send({ error: "Could not save listing" });
  }
}

export async function unsaveListing(
  request: FastifyRequest<{ Params: { listingId: string } }>,
  reply: FastifyReply,
) {
  const studentId = request.clerkUserId;
  const listingId = request.params.listingId;

  if (!studentId) {
    return reply.code(401).send({ error: "Sign-in required" });
  }
  if (typeof listingId !== "string" || listingId.trim().length === 0) {
    return reply.code(400).send({ error: "A listing ID is required" });
  }

  try {
    const result = await prisma.savedListing.deleteMany({
      where: {
        studentId,
        listingId,
      },
    });

    if (result.count === 0) {
      return reply.code(404).send({ error: "Saved listing not found" });
    }

    return reply.code(200).send({
      data: { listingId, removed: true },
      saved: false,
    });
  } catch (error) {
    request.log.error({ err: error }, "Could not unsave listing");
    return reply.code(500).send({ error: "Could not unsave listing" });
  }
}
