ALTER TABLE "InspectionRequest"
ADD COLUMN "rescheduleProposedFor" TIMESTAMP(3),
ADD COLUMN "adminResponse" TEXT;
