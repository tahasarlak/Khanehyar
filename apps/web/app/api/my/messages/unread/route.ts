import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "ابتدا وارد حساب شوید." },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }

  const unread = await prisma.inquiry.count({
    where: {
      recipientId: user.id,
      isRead: false,
    },
  });

  return NextResponse.json(
    { unread },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}