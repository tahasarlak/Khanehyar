-- Soft-delete fields and append-only listing audit history.
ALTER TABLE "Listing" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN "deleteExpiresAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN "deletedById" TEXT;
CREATE INDEX "Listing_deletedAt_deleteExpiresAt_idx" ON "Listing"("deletedAt", "deleteExpiresAt");

CREATE TYPE "ListingAuditAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'DELETED', 'RESTORED', 'PERMANENTLY_DELETED');
CREATE TABLE "ListingAuditLog" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "listingTitle" VARCHAR(120) NOT NULL,
  "actorId" TEXT,
  "actorRole" "UserRole",
  "action" "ListingAuditAction" NOT NULL,
  "reason" VARCHAR(1000),
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListingAuditLog_listingId_createdAt_idx" ON "ListingAuditLog"("listingId", "createdAt");
CREATE INDEX "ListingAuditLog_actorId_createdAt_idx" ON "ListingAuditLog"("actorId", "createdAt");
CREATE INDEX "ListingAuditLog_action_createdAt_idx" ON "ListingAuditLog"("action", "createdAt");
ALTER TABLE "ListingAuditLog" ADD CONSTRAINT "ListingAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
