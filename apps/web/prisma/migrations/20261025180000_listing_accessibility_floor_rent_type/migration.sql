-- Extend listing metadata without changing existing rows or requiring data backfills.
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'CLUNKER';

ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "ceilingHeight" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "architecturalStyle" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "rentalPaymentType" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "wheelchairAccessible" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "accessibilityFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "Listing_architecturalStyle_status_idx" ON "Listing"("architecturalStyle", "status");
CREATE INDEX IF NOT EXISTS "Listing_rentalPaymentType_status_idx" ON "Listing"("rentalPaymentType", "status");
CREATE INDEX IF NOT EXISTS "Listing_wheelchairAccessible_status_idx" ON "Listing"("wheelchairAccessible", "status");
