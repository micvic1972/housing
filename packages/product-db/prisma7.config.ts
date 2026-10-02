// Prisma 7 moved the database connection URL out of schema.prisma and into
// this config file. The schema describes the shape; this file describes
// how to connect. `env` is Prisma's own helper for reading environment
// variables — it is clearer than process.env and it fails loudly if the
// variable is missing, which is what we want.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});