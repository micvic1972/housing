CREATE TABLE "InspectionRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InspectionRequest_studentId_clientRequestId_key"
ON "InspectionRequest"("studentId", "clientRequestId");

CREATE INDEX "InspectionRequest_studentId_status_scheduledFor_idx"
ON "InspectionRequest"("studentId", "status", "scheduledFor");

CREATE INDEX "InspectionRequest_listingId_status_scheduledFor_idx"
ON "InspectionRequest"("listingId", "status", "scheduledFor");

ALTER TABLE "InspectionRequest"
ADD CONSTRAINT "InspectionRequest_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
