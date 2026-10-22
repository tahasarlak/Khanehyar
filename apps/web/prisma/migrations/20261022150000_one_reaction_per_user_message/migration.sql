-- Keep only the newest reaction when a user had multiple reactions on one message.
DELETE FROM "MessageReaction" older
USING "MessageReaction" newer
WHERE older."messageId" = newer."messageId"
  AND older."userId" = newer."userId"
  AND (
    older."createdAt" < newer."createdAt"
    OR (older."createdAt" = newer."createdAt" AND older."id" < newer."id")
  );

-- Replace the previous (message, user, emoji) uniqueness with one reaction per user/message.
DROP INDEX IF EXISTS "MessageReaction_messageId_userId_emoji_key";

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key"
  ON "MessageReaction"("messageId", "userId");
