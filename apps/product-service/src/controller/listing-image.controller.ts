import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";
import {
  allowedImageType,
  deleteListingImageObjects,
  isValidImageBytes,
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
  uploadListingImage,
} from "../lib/supabase-storage.js";

type ListingImageRequest = FastifyRequest<{
  Params: { id: string };
}>;

type BufferedImage = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
};

function errorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

export async function uploadListingImages(
  request: ListingImageRequest,
  reply: FastifyReply,
) {
  const { id } = request.params;

  let listing: { id: string; name: string; imageCount: number } | null;
  try {
    const row = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: { select: { images: true } },
      },
    });
    listing = row
      ? { id: row.id, name: row.name, imageCount: row._count.images }
      : null;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Could not prepare listing images" });
  }

  if (!listing) {
    return reply.code(404).send({ error: "Listing not found" });
  }

  const files: BufferedImage[] = [];
  let invalidImage = false;
  try {
    for await (const part of request.files({
      limits: {
        files: MAX_LISTING_IMAGES,
        fileSize: MAX_LISTING_IMAGE_BYTES,
      },
    })) {
      const contentType = part.mimetype;
      const bytes = await part.toBuffer();
      if (
        part.fieldname !== "images" ||
        !allowedImageType(contentType) ||
        !isValidImageBytes(contentType, bytes)
      ) {
        invalidImage = true;
        continue;
      }
      files.push({ contentType, bytes });
    }
  } catch (error) {
    const code = errorCode(error);
    request.log.warn(error);
    if (
      code === "FST_REQ_FILE_TOO_LARGE" ||
      code === "FST_FILES_LIMIT"
    ) {
      return reply.code(413).send({
        error: "Upload up to 8 images, each no larger than 5 MB",
      });
    }
    return reply.code(400).send({ error: "Could not read the uploaded images" });
  }

  if (invalidImage || files.length === 0) {
    return reply.code(400).send({
      error: "Choose JPEG, PNG, or WebP image files",
    });
  }
  if (listing.imageCount + files.length > MAX_LISTING_IMAGES) {
    return reply.code(413).send({
      error: `A listing can have at most ${MAX_LISTING_IMAGES} photos`,
    });
  }

  const stored: Array<{ key: string; url: string }> = [];
  try {
    for (const file of files) {
      stored.push(
        await uploadListingImage(id, file.contentType, file.bytes),
      );
    }
  } catch (error) {
    request.log.error(error);
    try {
      await deleteListingImageObjects(stored.map((image) => image.key));
    } catch (cleanupError) {
      request.log.error(cleanupError);
    }
    return reply.code(503).send({
      error: "Image storage is unavailable. The listing was not changed.",
    });
  }

  try {
    await prisma.listingImage.createMany({
      data: stored.map((image, index) => {
        const position = listing.imageCount + index;
        return {
          listingId: id,
          url: image.url,
          alt: `${listing.name} - photo ${position + 1}`,
          position,
        };
      }),
    });
  } catch (error) {
    request.log.error(error);
    try {
      await deleteListingImageObjects(stored.map((image) => image.key));
    } catch (cleanupError) {
      request.log.error(cleanupError);
    }
    return reply.code(500).send({
      error: "Photos could not be linked to the listing",
    });
  }

  return reply.code(201).send({ data: { count: stored.length } });
}
  



