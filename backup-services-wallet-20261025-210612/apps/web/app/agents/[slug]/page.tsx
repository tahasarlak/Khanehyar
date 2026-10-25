import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import "../../marketplace.css";
export default async function AgentPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const agent=await prisma.agentProfile.findUnique({where:{slug},include:{memberships:{where:{status:"ACTIVE"},include:{agencyProfile:{select:{name:true,slug:true,city:true}}}},listingAssignments:{where:{status:"ACTIVE",listing:{is:{status:"PUBLISHED",deletedAt:null}}},include:{listing:{select:{id:true,title:true,city:true,price:true,currency:true,listingType:true,images:{take:1,orderBy:{sortOrder:"asc"},select:{url:true}}}}},orderBy:{createdAt:"desc"}}}});
 if(!agent) notFound();
 return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><span className="marketplace-tag">{agent.verifiedAt?"مشاور تأییدشده":"مشاور ثبت‌شده"}</span><h1>{agent.displayName}</h1><p>📍 {agent.city}</p><p>{agent.bio||"اطلاعات تکمیلی این مشاور ثبت نشده است."}</p>{agent.publicPhone&&<p>شمارهٔ تماس عمومی: {agent.publicPhone}</p>}{agent.memberships.map(m=><p key={m.id}>عضو {m.agencyProfile.name} — {m.agencyProfile.city} <Link href={`/agencies/${m.agencyProfile.slug}`}>صفحهٔ املاکی</Link></p>)}</section><h2>آگهی‌های منتسب به این مشاور</h2>{agent.listingAssignments.length?<section className="marketplace-grid">{agent.listingAssignments.map(a=><article className="marketplace-card" key={a.id}><h2>{a.listing.title}</h2><div className="marketplace-meta"><span>{a.listing.city}</span><span>{a.listing.listingType==="SALE"?"فروش":"اجاره"}</span></div><div className="marketplace-price">{Number(a.listing.price.toString()).toLocaleString("fa-IR")} {a.listing.currency}</div><Link className="marketplace-link" href={`/listings/${a.listing.id}`}>جزئیات ملک</Link></article>)}</section>:<div className="marketplace-empty">هنوز آگهی فعالی به این مشاور منتسب نشده است.</div>}</main>;
}
