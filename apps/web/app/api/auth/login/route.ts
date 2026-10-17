import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../../../src/lib/prisma";
import {
  createSessionToken,
  sessionCookie,
} from "../../../../src/lib/session";

const loginSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(1).max(1024),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "ایمیل یا رمز عبور معتبر نیست." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    const validPassword =
      user &&
      (await compare(parsed.data.password, user.passwordHash)
        .catch(() => false));

    if (!user || !validPassword) {
      return NextResponse.json(
        { message: "ایمیل یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(user.id);

    const response = NextResponse.json({
      message: "ورود با موفقیت انجام شد.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(
      sessionCookie.name,
      token,
      sessionCookie.options,
    );

    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: "ساختار درخواست معتبر نیست." },
        { status: 400 },
      );
    }

    console.error("Login failed:", error);

    return NextResponse.json(
      { message: "خطای داخلی سرور." },
      { status: 500 },
    );
  }
}