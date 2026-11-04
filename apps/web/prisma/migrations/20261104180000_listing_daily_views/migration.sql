CREATE TABLE "ListingDailyView" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "date" VARCHAR(10) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListingDailyView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListingDailyView_listingId_date_key" ON "ListingDailyView"("listingId", "date");
CREATE INDEX "ListingDailyView_date_idx" ON "ListingDailyView"("date");
ALTER TABLE "ListingDailyView" ADD CONSTRAINT "ListingDailyView_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
