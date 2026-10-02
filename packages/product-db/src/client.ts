// ============================================================================
// product-db: the shared Prisma client.
//
// One client for the whole repo. Anything that needs to talk to the database
// (product-service today; more later) imports `prisma` from here, rather than
// constructing its own.
//
// Prisma 7 with the pg driver adapter: we can't use `new PrismaClient()` on
// its own any more. We pass the adapter explicitly, and the adapter reads
// DATABASE_URL from the environment.
//
// We load .env ourselves by absolute path (not just `import "dotenv/config"`),
// because when product-service is started from apps/product-service, plain
// dotenv would look for a .env THERE, find nothing, and DATABASE_URL would be
// undefined. This file lives in packages/product-db/src, so `../.env` from
// here is packages/product-db/.env — the one true place the DB URL lives.
// ============================================================================

import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// Order matters: load the env BEFORE constructing the adapter below.
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../.env") });

// `pg` gives us a pool we hand to Prisma. The adapter is what actually
// speaks to Postgres.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// One shared client.
export const prisma = new PrismaClient({ adapter });