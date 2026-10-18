import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDatabaseUrl } from "./src/database-url.js";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, ".env") });

const directUrl = process.env.DIRECT_URL;
const datasourceUrl = directUrl || process.env.DATABASE_URL;
const datasourceName = directUrl ? "DIRECT_URL" : "DATABASE_URL";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: validateDatabaseUrl(datasourceUrl, datasourceName),
  },
});
