ALTER TABLE "Listing"
  ADD COLUMN "ceilingHeight" DECIMAL(4,2),
  ADD COLUMN "architecturalStyle" VARCHAR(80),
  ADD COLUMN "windowView" VARCHAR(80),
  ADD COLUMN "furnishedItems" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "accessibilitySuitable" BOOLEAN,
  ADD COLUMN "accessibilityFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
