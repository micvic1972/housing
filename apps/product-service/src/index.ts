// ============================================================================
// product-service: the main file.
//
// /health           -> "are you alive?"
// /listings (GET)   -> list all listings
// /listings (POST)  -> save a new listing
//
// CORS is what lets the admin (port 3001) and the student app (port 3000)
// talk to this service (port 4000). Without it the browser blocks every
// request, and the admin form says "Could not reach the API".
// Development keeps LAN testing convenient. Production requires an explicit
// CORS_ALLOWED_ORIGINS allowlist.
//
// The database does not have to be running for /health to work. It does for
// /listings, so you can start the service and check /health before opening
// Docker.
// ============================================================================

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { resolveCorsOrigins } from "./lib/cors-config.js";
import { listingRoutes } from "./routes/listing.routes/listing.route.js";

// logger: true prints every request in the terminal, which helps while learning.
const app = Fastify({ logger: true });

// CORS must be registered BEFORE the routes. The methods list matters:
// the plugin's default only allows GET, HEAD and POST, and we list them
// explicitly so nothing surprises us later.
await app.register(cors, {
  origin: resolveCorsOrigins(),
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(multipart, {
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024,
  },
});

// The health check. Every service gets one, so tools can ask "are you up?".
app.get("/health", async () => {
  return { status: "ok", service: "product-service" };
});

// Attach the listing routes. register() is how Fastify groups them.
await app.register(listingRoutes);

// 4000 keeps it away from the student app (3000) and the admin (3001).
const port = Number(process.env.PORT ?? 4000);

try {
  // 0.0.0.0 means "accept connections from outside this machine too",
  // which we will need later when it runs in a container.
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}