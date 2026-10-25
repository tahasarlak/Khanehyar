CREATE TYPE "RentalPeriod" AS ENUM ('LONG_TERM', 'DAILY', 'WEEKLY', 'HOURLY');

ALTER TABLE "Listing"
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "urgentSale" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rentalPeriod" "RentalPeriod",
  ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Listing" SET "publishedAt" = "createdAt" WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;
ALTER TABLE "Listing" ALTER COLUMN "currency" SET DEFAULT 'IRT';

ALTER TABLE "Inquiry"
  ADD COLUMN "offerAmount" DECIMAL(14,2),
  ADD COLUMN "offerCurrency" VARCHAR(3);

CREATE TABLE "ListingPriceHistory" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "oldPrice" DECIMAL(14,2) NOT NULL,
  "newPrice" DECIMAL(14,2) NOT NULL,
  "oldCurrency" VARCHAR(3) NOT NULL,
  "newCurrency" VARCHAR(3) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingPriceHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Listing_publishedAt_idx" ON "Listing"("publishedAt");
CREATE INDEX "Listing_urgentSale_status_listingType_idx" ON "Listing"("urgentSale", "status", "listingType");
CREATE INDEX "Listing_rentalPeriod_status_idx" ON "Listing"("rentalPeriod", "status");
CREATE INDEX "ListingPriceHistory_listingId_changedAt_idx" ON "ListingPriceHistory"("listingId", "changedAt");
ALTER TABLE "ListingPriceHistory" ADD CONSTRAINT "ListingPriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
