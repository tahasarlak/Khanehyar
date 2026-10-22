import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./prisma";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 10;

type BucketResult = {
  count: number;
  resetAt: Date;
};

let cleanupCounter = 0;

export async function checkRateLimit(
  scope: string,
  identity: string,
  options: { windowMs?: number; maxAttempts?: number } = {},
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const key = createHash("sha256")
    .update(`${scope}:${identity}`)
    .digest("hex");

  // One atomic PostgreSQL upsert prevents concurrent requests from
  // independently passing the same per-key limit.
  const rows = await prisma.$queryRaw<BucketResult[]>`
    INSERT INTO "RateLimitBucket"
      ("key", "count", "resetAt", "updatedAt")
    VALUES
      (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  const bucket = rows[0];

  if (!bucket) {
    throw new Error("Rate-limit database operation returned no row.");
  }

  cleanupCounter += 1;

  // Periodically remove expired buckets. Cleanup failure must not
  // turn an otherwise valid rate-limit decision into an API failure.
  if (cleanupCounter >= 100) {
    cleanupCounter = 0;

    await prisma.rateLimitBucket
      .deleteMany({ where: { resetAt: { lte: now } } })
      .catch(() => undefined);
  }

  if (bucket.count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    {
      message:
        "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    },
  );
}

export function getRequestIdentity(request: Request): string {
  // These headers are safe to trust only when the deployment proxy
  // strips client-supplied values and sets them itself.
  const forwarded = request.headers.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim();

  const realIp = request.headers.get("x-real-ip")?.trim();

  return address || realIp || "unknown";
}
