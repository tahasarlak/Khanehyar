import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") ?? "").trim().slice(0, 100);
  const type = url.searchParams.get("type");
  const types = ["HOTEL", "MOTEL", "INN", "GUESTHOUSE", "APARTMENT_HOTEL", "VILLA", "ECOTOURISM_LODGE"] as const;
  const stays = await prisma.stayListing.findMany({ where: { status: "PUBLISHED", ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}), ...(types.includes(type as typeof types[number]) ? { stayType: type as typeof types[number] } : {}) }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, slug: true, description: true, stayType: true, city: true, nightlyRate: true, weeklyRate: true, hourlyRate: true, monthlyRate: true, currency: true, roomCount: true, maxGuests: true, amenities: true, imageUrls: true } });
  return NextResponse.json({ stays: stays.map((s) => ({ ...s, nightlyRate: s.nightlyRate?.toString() ?? null, weeklyRate: s.weeklyRate?.toString() ?? null, hourlyRate: s.hourlyRate?.toString() ?? null, monthlyRate: s.monthlyRate?.toString() ?? null })) }, { headers: { "Cache-Control": "no-store" } });
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
  const type = ["HOTEL","MOTEL","INN","GUESTHOUSE","APARTMENT_HOTEL","VILLA","ECOTOURISM_LODGE"].includes(String(v.stayType)) ? String(v.stayType) as "HOTEL"|"MOTEL"|"INN"|"GUESTHOUSE"|"APARTMENT_HOTEL"|"VILLA"|"ECOTOURISM_LODGE" : null;
  const rate = (key:string) => { if (v[key] === "" || v[key] == null) return null; const n=Number(v[key]); return Number.isFinite(n)&&n>=0?n:NaN; };
  const nightlyRate=rate("nightlyRate"),weeklyRate=rate("weeklyRate"),hourlyRate=rate("hourlyRate"),monthlyRate=rate("monthlyRate");
  if(title.length<3||description.length<20||city.length<2||!type||[nightlyRate,weeklyRate,hourlyRate,monthlyRate].some(n=>Number.isNaN(n))||[nightlyRate,weeklyRate,hourlyRate,monthlyRate].every(n=>n===null)) return NextResponse.json({error:"عنوان، توضیحات، شهر، نوع اقامتگاه و قیمت‌های معتبر را وارد کن."},{status:400});
  const slug=`stay-${user.id.slice(-6)}-${Date.now()}`;
  const amenities=Array.isArray(v.amenities)?v.amenities.filter((x):x is string=>typeof x==="string").map(x=>x.trim().slice(0,60)).filter(Boolean).slice(0,30):[];
  const stay=await prisma.stayListing.create({data:{title,slug,description,city,stayType:type,status:"PENDING",ownerId:user.id,currency:"IRR",nightlyRate,weeklyRate,hourlyRate,monthlyRate,roomCount:Number.isInteger(Number(v.roomCount))&&Number(v.roomCount)>0?Number(v.roomCount):null,maxGuests:Number.isInteger(Number(v.maxGuests))&&Number(v.maxGuests)>0?Number(v.maxGuests):null,amenities},select:{id:true,title:true,status:true,createdAt:true}});
  return NextResponse.json({stay,message:"اقامتگاه ثبت شد و پس از بررسی مدیر منتشر می‌شود."},{status:201});
}
