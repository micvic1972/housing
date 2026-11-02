CREATE TABLE "SavedListing" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedListing_studentId_listingId_key"
    ON "SavedListing"("studentId", "listingId");

CREATE INDEX "SavedListing_studentId_idx"
    ON "SavedListing"("studentId");

ALTER TABLE "SavedListing"
    ADD CONSTRAINT "SavedListing_listingId_fkey"
    FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
