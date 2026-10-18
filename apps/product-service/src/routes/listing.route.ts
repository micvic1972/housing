// Listing routes: each URL is attached to one handler.
// POST runs the validation middleware first, then the controller.

import type { FastifyInstance } from "fastify";
import {
  createListing,
  deleteListing,
  getListing,
  listListings,
} from "../controller/listing.controller.js";
import { uploadListingImages } from "../controller/listing-image.controller.js";
import {
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
} from "../lib/supabase-storage.js";
import { requireClerkAdmin } from "../middleware/require-clerk-admin.js";
import { validateListing } from "../middleware/validate-listings.js";

export async function listingRoutes(app: FastifyInstance) {
  app.get("/listings", listListings);
  app.get("/listings/:id", getListing);
  app.post(
    "/listings",
    { preHandler: [requireClerkAdmin, validateListing] },
    createListing,
  );
  app.post<{ Params: { id: string } }>(
    "/listings/:id/images",
    {
      preHandler: requireClerkAdmin,
      bodyLimit:
        MAX_LISTING_IMAGE_BYTES * MAX_LISTING_IMAGES + 1024 * 1024,
    },
    uploadListingImages,
  );
  app.delete(
    "/listings/:id",
    { preHandler: requireClerkAdmin },
    deleteListing,
  );
}