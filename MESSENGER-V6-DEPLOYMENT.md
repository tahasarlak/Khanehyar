# Khanehyar Messenger V6.3.1 — type-serialization hotfix and deployment notes

This bundle adds the following messenger capabilities:

- Per-user archive, mute, and pin preferences (archive list is available from `/dashboard/messages?view=archived`).
- In-app notifications for new messages, notification center, unread count, mark-one-read, and mark-all-read.
- Reply-to-message previews, 15-minute message editing, one-hour soft delete, report-message moderation records, and user blocking.
- Image/PDF attachment upload with size/MIME/signature checks and authenticated attachment delivery.
- Optional transactional email via Resend, only when environment variables are configured.
- Existing access control, rate limiting, message pagination, polling, read receipts, and duplicate-send protection remain in place.

## Required deployment steps

1. Take a PostgreSQL backup before changing the database.
2. Set `DATABASE_URL` for the target database and install workspace dependencies.
3. Validate and generate Prisma Client:

   ```powershell
   pnpm --filter web exec prisma validate
   pnpm --filter web exec prisma generate
   ```

4. Review the additive SQL in `apps/web/prisma/migrations/20261021130000_messenger_pro_features/migration.sql`, then apply it:

   ```powershell
   pnpm --filter web exec prisma migrate deploy
   pnpm --filter web exec prisma migrate status
   ```

5. Build and start the app:

   ```powershell
   pnpm --filter web build
   pnpm dev:web
   ```

## Attachments and storage

For local development, files are written to `apps/web/.data/message-uploads` (depending on the web app working directory). This directory is ignored by Git. In production, set `MESSAGE_UPLOAD_DIR` to a **persistent private directory** mounted on the web service. The app refuses uploads in production if this variable is absent. Keep the directory outside the public web root. Back it up and set disk quotas/monitoring. For multi-instance/serverless deployments, replace this local disk adapter with private object storage (e.g. S3-compatible storage) before launch; a local directory is not shared across instances and is not a substitute for object storage.

## Optional email notifications

Configure all of the following to enable email notifications:

- `RESEND_API_KEY`: Resend API key.
- `MAIL_FROM`: verified sender, e.g. `Khanehyar <notifications@example.com>`.
- `NEXT_PUBLIC_SITE_URL`: canonical HTTPS origin, e.g. `https://example.com`.

Email delivery is best-effort; failure must not prevent message delivery. Confirm sender-domain verification and privacy/consent wording before production use. Browser notifications require user permission and work only while a messenger page is running; true push notifications when the site is closed require a service worker plus Web Push/VAPID infrastructure, which is not included in this bundle.

## Manual QA checklist

- Buyer and seller can only access conversations in which they participate.
- A message cannot be sent after either participant blocks the other.
- Text-only and attachment-only messages send; malformed files, unsupported MIME types, mismatched file signatures, and files over 5 MiB are rejected.
- Reply previews work and references cannot cross conversations.
- Sender can edit within 15 minutes and soft-delete within one hour; other users cannot edit/delete the sender's messages.
- Deleted attachment access is denied and the local file is removed where possible.
- Archive removes a thread from the inbox and it appears in the Archived tab; unarchiving can be done by opening it only if an explicit restore control is added, or by changing the preference API (`archived:false`).
- Mute and pin are per-user, not shared with the other participant.
- Notifications are private to their recipient and can be marked read individually or in bulk.
- Test with two separate user accounts and two different listings, including mobile viewport and network interruption.

## Operational limitations to resolve before a global launch

- The bundled attachment adapter is local persistent-disk storage, not a distributed object-storage implementation. Use private object storage for multi-instance/serverless production.
- Browser notifications are not Web Push while the browser/site is closed.
- Message reports are stored for moderation; a staff/admin review queue and documented response process should be added before opening reports to the public.
- Email preferences/unsubscribe workflow, retention policy, GDPR/privacy notice, virus scanning, observability, load testing, and a full automated test suite remain launch requirements.
