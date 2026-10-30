// Listing routes: each URL is attached to one handler.
// POST runs the validation middleware first, then the controller.

import type { FastifyInstance } from "fastify";
import {
  createListing,
  deleteListing,
  getListing,
  listListings,
  updateListing,
} from "../../controller/listing/listing.controller.js";
import {
  deleteListingImage,
  uploadListingImages,
} from "../../controller/listing/listing-image.controller.js";
import {
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
} from "../../lib/supabase-storage.js";
import { requireClerkAdmin } from "../../middleware/require-clerk-admin.js";
import { validateListing } from "../../middleware/validate-listings.js";

export async function listingRoutes(app: FastifyInstance) {
  app.get("/listings", listListings);
  app.get("/listings/:id", getListing);
  app.post(
    "/listings",
    { preHandler: [requireClerkAdmin, validateListing] },
    createListing,
  );
  app.patch<{ Params: { id: string } }>(
    "/listings/:id",
    { preHandler: [requireClerkAdmin, validateListing] },
    updateListing,
  );
  app.post<{ Params: { id: string } }>(
    "/listings/:id/images",
    {
      preHandler: requireClerkAdmin,
      bodyLimit: MAX_LISTING_IMAGE_BYTES * MAX_LISTING_IMAGES + 1024 * 1024,
    },
    uploadListingImages,
  );
  app.delete<{ Params: { id: string; imageId: string } }>(
    "/listings/:id/images/:imageId",
    { preHandler: requireClerkAdmin },
    deleteListingImage,
  );
  app.delete("/listings/:id", { preHandler: requireClerkAdmin }, deleteListing);
}
