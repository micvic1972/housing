ALTER TABLE "Listing"
    ADD COLUMN "latitude" DOUBLE PRECISION,
    ADD COLUMN "longitude" DOUBLE PRECISION,
    ADD COLUMN "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "locationVerifiedBy" TEXT,
    ADD COLUMN "locationVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_coordinate_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_verified_coordinates_check"
    CHECK (
        ("locationVerified" = false AND "latitude" IS NULL AND "longitude" IS NULL)
        OR
        ("locationVerified" = true AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL)
    );

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_location_verification_audit_check"
    CHECK (
        ("locationVerified" = false AND "locationVerifiedBy" IS NULL AND "locationVerifiedAt" IS NULL)
        OR
        ("locationVerified" = true AND "locationVerifiedBy" IS NOT NULL AND "locationVerifiedAt" IS NOT NULL)
    );
