import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/src/lib/prisma";
import "./seller-profile.css";

type Props = { params: Promise<{ sellerId: string }> };
export const instant = false;

export default async function SellerProfilePage({ params }: Props) {
  await connection();
  const { sellerId } = await params;
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: {
      id: true, name: true, avatarUrl: true, createdAt: true,
      listings: {
        where: { status: "PUBLISHED", deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, city: true, listingType: true, propertyType: true,
          price: true, currency: true, area: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });
  if (!seller) notFound();
  const displayName = seller.name?.trim() || "کاربر خانه‌یار";
  return <main className="kh-seller-page" dir="rtl" lang="fa">
    <header className="kh-seller-top"><Link href="/dashboard/messages">← بازگشت به گفتگوها</Link><Link href="/search">مشاهده آگهی‌ها</Link></header>
    <section className="kh-seller-profile">
      <div className="kh-seller-avatar">{seller.avatarUrl ? <img src={seller.avatarUrl} alt="" /> : displayName.slice(0, 1)}</div>
      <div><p className="kh-seller-eyebrow">خانه‌یار · صفحه فروشنده</p><h1>{displayName}</h1><p className="kh-seller-meta">عضویت از {new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long" }).format(seller.createdAt)}</p><p className="kh-seller-meta">{new Intl.NumberFormat("fa-IR").format(seller.listings.length)} آگهی منتشرشده</p></div>
    </section>
    <section className="kh-seller-listings"><div className="kh-seller-section-head"><div><p className="kh-seller-eyebrow">فهرست املاک</p><h2>آگهی‌های {displayName}</h2></div><span>{seller.listings.length}</span></div>
      {seller.listings.length === 0 ? <p className="kh-seller-empty">این فروشنده هنوز آگهی منتشرشده‌ای ندارد.</p> : <div className="kh-seller-grid">{seller.listings.map((listing) => <Link className="kh-seller-listing" href={`/listings/${encodeURIComponent(listing.id)}`} key={listing.id}>
        <div className="kh-seller-listing-image">{listing.images[0]?.url ? <img src={listing.images[0].url} alt={listing.title} /> : <span>⌂</span>}</div>
        <div className="kh-seller-listing-body"><span className="kh-seller-tag">{listing.listingType === "RENT" ? "برای اجاره" : "برای فروش"} · {listing.city}</span><h3>{listing.title}</h3><strong>{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Number(listing.price))} {listing.currency}</strong><small>{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Number(listing.area))} متر مربع · مشاهده جزئیات و نظرات ↗</small></div>
      </Link>)}</div>}
    </section>
  </main>;
}