-- Native messaging: keep Inquiry as an immutable legacy/audit source.
-- Existing inquiry records are copied into conversations and messages.
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_listingId_buyerId_sellerId_key"
  ON "Conversation"("listingId", "buyerId", "sellerId");
CREATE INDEX "Conversation_buyerId_updatedAt_idx"
  ON "Conversation"("buyerId", "updatedAt");
CREATE INDEX "Conversation_sellerId_updatedAt_idx"
  ON "Conversation"("sellerId", "updatedAt");
CREATE INDEX "Message_conversationId_createdAt_idx"
  ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_conversationId_readAt_idx"
  ON "Message"("conversationId", "readAt");
CREATE INDEX "Message_senderId_createdAt_idx"
  ON "Message"("senderId", "createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stable IDs make the data migration deterministic. Seller is always the listing owner.
WITH pairs AS (
  SELECT
    i."listingId",
    CASE WHEN i."senderId" = l."ownerId" THEN i."recipientId" ELSE i."senderId" END AS "buyerId",
    l."ownerId" AS "sellerId",
    MIN(i."createdAt") AS "createdAt",
    MAX(i."createdAt") AS "updatedAt"
  FROM "Inquiry" i
  JOIN "Listing" l ON l."id" = i."listingId"
  WHERE CASE WHEN i."senderId" = l."ownerId" THEN i."recipientId" ELSE i."senderId" END <> l."ownerId"
  GROUP BY i."listingId",
    CASE WHEN i."senderId" = l."ownerId" THEN i."recipientId" ELSE i."senderId" END,
    l."ownerId"
)
INSERT INTO "Conversation" ("id", "listingId", "buyerId", "sellerId", "createdAt", "updatedAt")
SELECT
  md5('khanehyar-conversation:' || p."listingId" || ':' || p."buyerId" || ':' || p."sellerId"),
  p."listingId", p."buyerId", p."sellerId", p."createdAt", p."updatedAt"
FROM pairs p;

INSERT INTO "Message" ("id", "conversationId", "senderId", "body", "createdAt", "readAt")
SELECT
  md5('khanehyar-message:' || i."id"),
  c."id",
  i."senderId",
  i."message",
  i."createdAt",
  CASE WHEN i."isRead" THEN i."createdAt" ELSE NULL END
FROM "Inquiry" i
JOIN "Listing" l ON l."id" = i."listingId"
JOIN "Conversation" c
  ON c."listingId" = i."listingId"
 AND c."sellerId" = l."ownerId"
 AND c."buyerId" = CASE WHEN i."senderId" = l."ownerId" THEN i."recipientId" ELSE i."senderId" END
WHERE CASE WHEN i."senderId" = l."ownerId" THEN i."recipientId" ELSE i."senderId" END <> l."ownerId";
