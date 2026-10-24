import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import FavoriteExplorer, { type FavoriteListingItem } from "./FavoriteExplorer";
import "../../market.css";
import "./favorites.css";
export const instant = false;
export default async function FavoritesPage() {
 const user=await getCurrentUser(); if(!user) redirect("/login?next=%2Fdashboard%2Ffavorites");
 const favorites=await prisma.favorite.findMany({where:{userId:user.id,listing:{status:"PUBLISHED",deletedAt:null}},orderBy:{createdAt:"desc"},take:100,select:{listing:{select:{id:true,title:true,city:true,area:true,price:true,currency:true,rooms:true,propertyType:true,listingType:true,images:{take:1,orderBy:{sortOrder:"asc"},select:{url:true}}}}}});
 const items:FavoriteListingItem[]=favorites.map(({listing})=>({id:listing.id,title:listing.title,city:listing.city,area:listing.area.toString(),price:listing.price.toString(),currency:listing.currency,rooms:listing.rooms,propertyType:listing.propertyType,listingType:listing.listingType,imageUrl:listing.images[0]?.url??null}));
 return <main className="hy-site hy-favorites-page kh-favorites-dashboard" dir="rtl"><div className="hy-wrap hy-favorites-inner"><header className="hy-section-heading"><div><span className="hy-overline">فهرست شخصی</span><h1>علاقه‌مندی‌های من</h1><p>{items.length.toLocaleString("fa-IR")} آگهی ذخیره‌شده برای بررسی بعدی</p></div><Link href="/search" className="hy-text-link">جست‌وجوی ملک جدید ←</Link></header><FavoriteExplorer listings={items}/></div></main>;
}
