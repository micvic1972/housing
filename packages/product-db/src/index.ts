// ============================================================================
// product-db: the public doorway into this package.
//
// Anything outside this package imports from "@repo/product-db", which lands
// here. That means if the internal file layout changes later (say client.ts
// gets split in two), the rest of the repo doesn't notice — only this file
// changes.
// ============================================================================

export { prisma } from "./client.js";