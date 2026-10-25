-- Add optional property lifestyle, furnishing, rental-term, view and neighborhood access details.
-- Existing listings remain valid; arrays default to empty and all other fields are nullable.
ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "furnishedItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "interiorStyle" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "windowView" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "rentalDurationMonths" INTEGER,
  ADD COLUMN IF NOT EXISTS "nearbyPlaces" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "nearbyDetails" VARCHAR(1000);

CREATE INDEX IF NOT EXISTS "Listing_furnished_status_idx" ON "Listing"("furnished", "status");
CREATE INDEX IF NOT EXISTS "Listing_interiorStyle_status_idx" ON "Listing"("interiorStyle", "status");
CREATE INDEX IF NOT EXISTS "Listing_windowView_status_idx" ON "Listing"("windowView", "status");
CREATE INDEX IF NOT EXISTS "Listing_rentalDurationMonths_status_idx" ON "Listing"("rentalDurationMonths", "status");
