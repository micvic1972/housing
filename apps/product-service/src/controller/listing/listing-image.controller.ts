import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@repo/product-db";
import {
  allowedImageType,
  deleteListingImageObjects,
  isValidImageBytes,
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
  listingImageObjectKey,
  listingImageStorageReference,
  StorageConfigurationError,
  StorageRequestError,
  uploadListingImage,
} from "../../lib/supabase-storage.js";

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

function storageFailureMessage(error: unknown): string {
  if (error instanceof StorageConfigurationError) {
    return error.message;
  }
  if (error instanceof StorageRequestError) {
    const upstream = error.upstreamMessage.toLowerCase();
    if (error.statusCode === 401) {
      return "Supabase rejected SUPABASE_SERVICE_ROLE_KEY. Verify it is the current server-side key for this project.";
    }
    if (error.statusCode === 403) {
      return "SUPABASE_SERVICE_ROLE_KEY does not have permission for this Storage operation. Verify the server-side key and Storage access.";
    }
    if (
      error.operation.startsWith("bucket") ||
      upstream.includes("bucket") ||
      upstream.includes("object not found")
    ) {
      return `The configured storage bucket was not found. Check SUPABASE_STORAGE_BUCKET (current default: listing-images) or create that public bucket in Supabase.`;
    }
    if (error.statusCode === 404) {
      return "Supabase did not recognize the configured project endpoint. Verify SUPABASE_URL.";
    }
    return `Supabase Storage ${error.operation} failed (HTTP ${error.statusCode}). Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.`;
  }
  return "Supabase Storage could not be reached. Check SUPABASE_URL and the product-service network connection.";
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
    if (code === "FST_REQ_FILE_TOO_LARGE" || code === "FST_FILES_LIMIT") {
      return reply.code(413).send({
        error: "Upload up to 8 images, each no larger than 5 MB",
      });
    }
    return reply
      .code(400)
      .send({ error: "Could not read the uploaded images" });
  }

  if (invalidImage || files.length === 0) {
    return reply.code(400).send({
      error: "Choose JPEG, PNG, or WebP image files",
    });
  }
  let references: Array<BufferedImage & { key: string; url: string }>;
  try {
    references = files
      .map((file) => ({
        ...file,
        ...listingImageStorageReference(id, file.contentType, file.bytes),
      }))
      .filter(
        (image, index, list) =>
          list.findIndex((candidate) => candidate.url === image.url) === index,
      );
  } catch (error) {
    request.log.error(error);
    return reply.code(503).send({
      error: `Image storage is unavailable. ${storageFailureMessage(error)}`,
    });
  }

  let existingImages: Array<{ url: string }> = [];
  let lastImage: Array<{ position: number }> = [];
  try {
    existingImages = await prisma.listingImage.findMany({
      where: {
        listingId: id,
        url: { in: references.map((image) => image.url) },
      },
      select: { url: true },
    });
    lastImage = await prisma.listingImage.findMany({
      where: { listingId: id },
      orderBy: { position: "desc" },
      take: 1,
      select: { position: true },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: "Could not check existing listing photos",
    });
  }
  const existingUrls = new Set(existingImages.map((image) => image.url));
  const missingReferences = references.filter(
    (image) => !existingUrls.has(image.url),
  );
  if (listing.imageCount + missingReferences.length > MAX_LISTING_IMAGES) {
    return reply.code(413).send({
      error: `A listing can have at most ${MAX_LISTING_IMAGES} photos`,
    });
  }

  const stored: Array<{ key: string; url: string }> = [];
  try {
    for (const image of missingReferences) {
      stored.push(await uploadListingImage(id, image.contentType, image.bytes));
    }
  } catch (error) {
    if (error instanceof StorageRequestError) {
      request.log.error(
        {
          statusCode: error.statusCode,
          operation: error.operation,
          message: error.upstreamMessage,
        },
        "Supabase Storage request failed",
      );
    } else if (error instanceof StorageConfigurationError) {
      request.log.error(
        { setting: error.setting, message: error.message },
        "Supabase Storage configuration error",
      );
    } else {
      request.log.error(
        { message: error instanceof Error ? error.message : "Unknown error" },
        "Supabase Storage upload failed",
      );
    }
    try {
      await deleteListingImageObjects(stored.map((image) => image.key));
    } catch (cleanupError) {
      request.log.error(cleanupError);
    }
    return reply.code(503).send({
      error: `Image storage is unavailable; no image records were added. ${storageFailureMessage(error)}`,
    });
  }

  if (stored.length > 0) {
    try {
      const startPosition = (lastImage[0]?.position ?? -1) + 1;
      await prisma.listingImage.createMany({
        data: stored.map((image, index) => ({
          listingId: id,
          url: image.url,
          alt: `${listing.name} - photo ${startPosition + index + 1}`,
          position: startPosition + index,
        })),
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
  }

  try {
    const images = await prisma.listingImage.findMany({
      where: {
        listingId: id,
        url: { in: references.map((image) => image.url) },
      },
      orderBy: { position: "asc" },
      select: { id: true, url: true, alt: true, position: true },
    });
    return reply.code(stored.length > 0 ? 201 : 200).send({
      data: images,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: "Photos were saved but their references could not be returned",
    });
  }
}

export async function deleteListingImage(
  request: FastifyRequest<{
    Params: { id: string; imageId: string };
  }>,
  reply: FastifyReply,
) {
  const { id, imageId } = request.params;
  let image: { id: string; url: string } | null;
  try {
    image = await prisma.listingImage.findFirst({
      where: { id: imageId, listingId: id },
      select: { id: true, url: true },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: "Could not load the listing photo",
    });
  }
  if (!image) {
    return reply.code(404).send({ error: "Listing photo not found" });
  }

  const key = listingImageObjectKey(image.url);
  if (!key || !key.startsWith(`${id}/`) || key.split("/").includes("..")) {
    return reply.code(409).send({
      error: "This photo is not stored in the listing image bucket",
    });
  }

  try {
    await deleteListingImageObjects([key]);
  } catch (error) {
    request.log.error(error);
    return reply.code(503).send({
      error:
        "The photo could not be removed from storage; its listing record was kept",
    });
  }

  try {
    await prisma.listingImage.delete({ where: { id: image.id } });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error:
        "The stored photo was removed, but its listing record could not be deleted. Retry removal.",
    });
  }

  return reply.code(200).send({ data: { id: image.id, removed: true } });
}
