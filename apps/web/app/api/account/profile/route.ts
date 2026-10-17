import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "../../../../src/lib/rate-limit";
import { z } from "zod";
import { getCurrentUser } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";



const profileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30),
}).strict();

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function normalizePhone(value: string): string | null {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .trim();

  if (!normalized) return null;

  if (!/^[+0-9().\-\s]+$/.test(normalized)) {
    throw new Error("PHONE_FORMAT");
  }

  const digits = normalized.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    throw new Error("PHONE_FORMAT");
  }

  return normalized;
}

export async function PATCH(request: Request) {
  const limit = await checkRateLimit("update-profile", getRequestIdentity(request));
  if (!limit.allowed) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }
  const origin = request.headers.get("origin");

  let expectedOrigin: string;

  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    return jsonError("درخواست معتبر نیست.", 400);
  }

  if (!origin || origin !== expectedOrigin) {
    return jsonError("درخواست از مبدأ مجاز ارسال نشده است.", 403);
  }

  const user = await getCurrentUser();

  if (!user) {
    return jsonError("ابتدا وارد حساب خود شوید.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("ساختار درخواست معتبر نیست.", 400);
  }

  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("نام یا شماره تلفن معتبر نیست.", 400);
  }

  let phone: string | null;

  try {
    phone = normalizePhone(parsed.data.phone);
  } catch {
    return jsonError(
      "شماره تلفن باید شامل ارقام و نویسه‌های مجاز باشد و ۷ تا ۱۵ رقم داشته باشد.",
      400,
    );
  }

  try {
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: user.id },
        },
        select: { id: true },
      });

      if (existingPhone) {
        return jsonError("این شماره تلفن قبلاً ثبت شده است.", 409);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "اطلاعات پروفایل ذخیره شد.",
        user: {
          ...updatedUser,
          createdAt: updatedUser.createdAt.toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const databaseError = error as { code?: string };

    if (databaseError.code === "P2002") {
      return jsonError("این شماره تلفن قبلاً ثبت شده است.", 409);
    }

    console.error("Profile update failed:", error);
    return jsonError("ذخیره اطلاعات با خطا مواجه شد.", 500);
  }
}