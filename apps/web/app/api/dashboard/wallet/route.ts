import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } } });
  return NextResponse.json({ wallet: wallet ? { id: wallet.id, balance: wallet.balance.toString(), currency: wallet.currency, transactions: wallet.transactions.map((t) => ({ id: t.id, type: t.type, amount: t.amount.toString(), currency: t.currency, description: t.description, createdAt: t.createdAt })) } : { id: null, balance: "0", currency: "IRR", transactions: [] }, paymentsEnabled: false, message: "درگاه پرداخت هنوز فعال نشده است؛ موجودی فقط پس از تراکنش تأییدشده تغییر می‌کند." }, { headers: { "Cache-Control": "no-store" } });
}
