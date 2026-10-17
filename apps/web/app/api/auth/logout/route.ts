import { NextResponse } from "next/server";
import { sessionCookie } from "../../../../src/lib/session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);

  if (origin && origin !== target.origin) {
    return NextResponse.json(
      { message: "درخواست غیرمجاز است." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    message: "با موفقیت از حساب خارج شدید.",
  });

  response.cookies.set(sessionCookie.name, "", {
    ...sessionCookie.options,
    maxAge: 0,
  });

  return response;
}