import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "").slice(0, 140) || `agent-${Date.now()}`; }
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const [agent, agency] = await Promise.all([prisma.agentProfile.findUnique({ where: { userId: user.id } }), prisma.agencyProfile.findUnique({ where: { userId: user.id } })]);
  return NextResponse.json({ agent, agency }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "درخواست معتبر نیست." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "اطلاعات نامعتبر است." }, { status: 400 }); }
  const input = body as Record<string, unknown>;
  const kind = input.kind === "agency" ? "agency" : "agent";
  const displayName = typeof input.displayName === "string" ? input.displayName.trim().slice(0, 160) : "";
  const city = typeof input.city === "string" ? input.city.trim().slice(0, 100) : "";
  const bio = typeof input.bio === "string" ? input.bio.trim().slice(0, 3000) : "";
  const publicPhone = typeof input.publicPhone === "string" ? input.publicPhone.trim().slice(0, 30) : "";
  if (displayName.length < 3 || city.length < 2) return NextResponse.json({ error: "نام و شهر را وارد کن." }, { status: 400 });
  const baseSlug = slugify(displayName);
  if (kind === "agency") {
    const current = await prisma.agencyProfile.findUnique({ where: { userId: user.id }, select: { id: true, slug: true } });
    const slug = current?.slug ?? `${baseSlug}-${user.id.slice(-6)}`;
    const agency = await prisma.agencyProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, slug, name: displayName, city, description: bio || null, publicPhone: publicPhone || null }, update: { name: displayName, city, description: bio || null, publicPhone: publicPhone || null } });
    return NextResponse.json({ agency, verified: Boolean(agency.verifiedAt) }, { status: 200 });
  }
  const current = await prisma.agentProfile.findUnique({ where: { userId: user.id }, select: { id: true, slug: true } });
  const slug = current?.slug ?? `${baseSlug}-${user.id.slice(-6)}`;
  const agent = await prisma.agentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, slug, displayName, city, bio: bio || null, publicPhone: publicPhone || null }, update: { displayName, city, bio: bio || null, publicPhone: publicPhone || null } });
  return NextResponse.json({ agent, verified: Boolean(agent.verifiedAt) }, { status: 200 });
}
