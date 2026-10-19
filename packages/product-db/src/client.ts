import { config } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { validateDatabaseUrl } from "./database-url.js";

// Support both source execution and the compiled package layout.
const here = dirname(fileURLToPath(import.meta.url));
const envPath = [
  resolve(here, "../.env"),
  resolve(here, "../../.env"),
].find(existsSync);
if (envPath) config({ path: envPath });

const connectionString = validateDatabaseUrl(
  process.env.DATABASE_URL,
  "DATABASE_URL",
);

const pool = new pg.Pool({
  connectionString,
  max: 10,
  ssl: { rejectUnauthorized: false },
});

// Pass the safe configuration pool directly into your Prisma driver adapter
const adapter = new PrismaPg(pool);

// Export single shared client instance for the UniNest service apps
export const prisma = new PrismaClient({ adapter });
