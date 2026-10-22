-- Additive messenger product features: per-user preferences, moderation,
-- notifications, message replies/edit/delete metadata and attachment metadata.
ALTER TABLE "User" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "Message"
  ADD COLUMN "editedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "replyToId" TEXT,
  ADD COLUMN "attachmentUrl" VARCHAR(2048),
  ADD COLUMN "attachmentName" VARCHAR(255),
  ADD COLUMN "attachmentMime" VARCHAR(100),
  ADD COLUMN "attachmentSize" INTEGER;

CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ConversationPreference" (
  "userId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "mutedUntil" TIMESTAMP(3),
  "pinnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversationPreference_pkey" PRIMARY KEY ("userId", "conversationId")
);
CREATE INDEX "ConversationPreference_userId_archivedAt_updatedAt_idx" ON "ConversationPreference"("userId", "archivedAt", "updatedAt");
CREATE INDEX "ConversationPreference_userId_mutedUntil_idx" ON "ConversationPreference"("userId", "mutedUntil");
ALTER TABLE "ConversationPreference" ADD CONSTRAINT "ConversationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationPreference" ADD CONSTRAINT "ConversationPreference_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BlockedUser" (
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" VARCHAR(500),
  CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("blockerId", "blockedId")
);
CREATE INDEX "BlockedUser_blockedId_createdAt_idx" ON "BlockedUser"("blockedId", "createdAt");
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockerId_fkey"
  FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockedId_fkey"
  FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MessageReport" (
  "id" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "reason" VARCHAR(1000) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageReport_reporterId_messageId_key" ON "MessageReport"("reporterId", "messageId");
CREATE INDEX "MessageReport_status_createdAt_idx" ON "MessageReport"("status", "createdAt");
CREATE INDEX "MessageReport_messageId_idx" ON "MessageReport"("messageId");
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" VARCHAR(40) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "href" VARCHAR(2048),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
