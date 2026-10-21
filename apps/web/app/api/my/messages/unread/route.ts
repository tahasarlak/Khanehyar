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

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    select: { id: true },
  });
  const unread = conversations.length ? await prisma.message.count({
    where: {
      conversationId: { in: conversations.map((conversation) => conversation.id) },
      senderId: { not: user.id },
      readAt: null,
    },
  }) : 0;

  return NextResponse.json(
    { unread },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}