-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "landmark" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "priceAmount" INTEGER NOT NULL,
    "priceCurrency" TEXT NOT NULL DEFAULT 'NGN',
    "pricePeriod" TEXT NOT NULL,
    "amenities" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedChecks" TEXT[],
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "contactType" TEXT,
    "inspectionFeeStatus" TEXT NOT NULL DEFAULT 'unknown',
    "inspectionFeeAmount" INTEGER,
    "acceptedPeriods" TEXT[],
    "requiresUpfrontYears" INTEGER,
    "hasSecurityPost" BOOLEAN,
    "isGatedCompound" BOOLEAN,
    "popularityScore" INTEGER,
    "constructionProgress" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "insight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_kind_idx" ON "Listing"("kind");

-- CreateIndex
CREATE INDEX "Listing_area_idx" ON "Listing"("area");

-- CreateIndex
CREATE INDEX "Listing_priceAmount_idx" ON "Listing"("priceAmount");

-- CreateIndex
CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
