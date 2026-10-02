// ============================================================================
// product-service: the listing routes.
//
// A Fastify plugin. It does not start a server, it just attaches two URL
// patterns to the two handlers. index.ts registers this plugin.
// ============================================================================

import type { FastifyInstance } from "fastify";
import { createListing, listListings } from "../controller/listing.controller.js";

export async function listingRoutes(app: FastifyInstance) {
  app.get("/listings", listListings);
  app.post("/listings", createListing);
}