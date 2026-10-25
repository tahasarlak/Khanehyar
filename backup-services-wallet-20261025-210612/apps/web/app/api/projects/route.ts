import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") ?? "").trim().slice(0, 100);
  const type = url.searchParams.get("type");
  const allowedTypes = ["PRE_SALE", "UNDER_CONSTRUCTION", "PARTICIPATION"] as const;
  const projects = await prisma.developmentProject.findMany({
    where: { status: "PUBLISHED", ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}), ...(allowedTypes.includes(type as typeof allowedTypes[number]) ? { projectType: type as typeof allowedTypes[number] } : {}) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 100,
    select: { id: true, title: true, slug: true, description: true, projectType: true, city: true, developerName: true, expectedCompletion: true, totalUnits: true, availableUnits: true, minimumInvestment: true, priceFrom: true, currency: true, imageUrls: true, createdAt: true },
  });
  return NextResponse.json({ projects: projects.map((p) => ({ ...p, minimumInvestment: p.minimumInvestment?.toString() ?? null, priceFrom: p.priceFrom?.toString() ?? null })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب شوید." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "درخواست معتبر نیست." }, { status: 403 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "اطلاعات نامعتبر است." }, { status: 400 }); }
  const v = body as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title.trim().slice(0,160) : "";
  const description = typeof v.description === "string" ? v.description.trim().slice(0,12000) : "";
  const city = typeof v.city === "string" ? v.city.trim().slice(0,100) : "";
  const developerName = typeof v.developerName === "string" ? v.developerName.trim().slice(0,160) : "";
  const type = ["PRE_SALE","UNDER_CONSTRUCTION","PARTICIPATION"].includes(String(v.projectType)) ? String(v.projectType) as "PRE_SALE"|"UNDER_CONSTRUCTION"|"PARTICIPATION" : null;
  const priceFrom = v.priceFrom === "" || v.priceFrom == null ? null : Number(v.priceFrom);
  const minimumInvestment = v.minimumInvestment === "" || v.minimumInvestment == null ? null : Number(v.minimumInvestment);
  if (title.length < 5 || description.length < 20 || city.length < 2 || developerName.length < 2 || !type || (priceFrom !== null && (!Number.isFinite(priceFrom)||priceFrom<0)) || (minimumInvestment !== null && (!Number.isFinite(minimumInvestment)||minimumInvestment<0))) return NextResponse.json({ error: "عنوان، توضیحات کامل، شهر، سازنده و نوع پروژه را بررسی کن." }, { status: 400 });
  const completion = typeof v.expectedCompletion === "string" && v.expectedCompletion ? new Date(v.expectedCompletion) : null;
  if (completion && Number.isNaN(completion.getTime())) return NextResponse.json({ error: "تاریخ تحویل معتبر نیست." }, { status: 400 });
  const slug = `project-${user.id.slice(-6)}-${Date.now()}`;
  const project = await prisma.developmentProject.create({ data: { title, slug, description, city, developerName, projectType: type, status: "PENDING", ownerId: user.id, currency: "IRR", priceFrom, minimumInvestment, totalUnits: Number.isInteger(Number(v.totalUnits)) && Number(v.totalUnits)>0 ? Number(v.totalUnits) : null, availableUnits: Number.isInteger(Number(v.availableUnits)) && Number(v.availableUnits)>=0 ? Number(v.availableUnits) : null, expectedCompletion: completion } , select: { id:true, title:true, status:true, createdAt:true } });
  return NextResponse.json({ project, message: "پروژه ثبت شد و پس از بررسی مدیر منتشر می‌شود." }, { status: 201 });
}
