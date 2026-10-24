import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "../../../../../src/lib/auth";
import { prisma } from "../../../../../src/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

const decisionSchema = z
  .object({
    status: z.enum(["PUBLISHED", "REJECTED"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === "REJECTED" && (!data.reason || data.reason.length < 10)) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "برای رد آگهی، توضیح حداقل ۱۰ کاراکتری لازم است.",
      });
    }
  });

export async function PATCH(request: Request, context: Context) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json(
      { error: "مبدأ درخواست معتبر نیست." },
      { status: 403 },
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      { status: 401 },
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "دسترسی مدیر لازم است." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  if (!id || id.length > 100) {
    return NextResponse.json(
      { error: "شناسه آگهی نامعتبر است." },
      { status: 400 },
    );
  }

  if (!(request.headers.get("content-type") ?? "")
    .toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "درخواست باید JSON باشد." },
      { status: 415 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON نامعتبر است." },
      { status: 400 },
    );
  }

  const parsed = decisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "اطلاعات تصمیم مدیریت معتبر نیست.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { status, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await tx.listing.findFirst({ where: { id, status: "PENDING", deletedAt: null }, select: { id: true, title: true, status: true } });
      if (!before) return false;
      const updated = await tx.listing.updateMany({
        where: { id, status: "PENDING", deletedAt: null },
        data: { status },
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.listingReview.create({
        data: { listingId: id, reviewerId: user.id, decision: status, reason: reason || null },
      });
      await tx.listingAuditLog.create({
        data: { listingId: id, listingTitle: before.title, actorId: user.id, actorRole: user.role, action: "STATUS_CHANGED", reason: reason || (status === "PUBLISHED" ? "تأیید مدیر" : "رد توسط مدیر"), before: { status: before.status }, after: { status } },
      });
      return true;
    });

    if (!result) {
      return NextResponse.json(
        { error: "آگهی پیدا نشد یا قبلاً بررسی شده است." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message:
        status === "PUBLISHED"
          ? "آگهی با موفقیت منتشر شد."
          : "آگهی رد شد و دلیل آن ثبت گردید.",
      id,
      status,
    });
  } catch (error) {
    console.error("Admin review failed:", error);

    return NextResponse.json(
      { error: "ثبت تصمیم مدیریت ناموفق بود." },
      { status: 500 },
    );
  }
}