
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
import "./dashboard.css";

export const metadata = {
  title: "داشبورد کاربری | خانه‌یار",
  robots: { index: false, follow: false },
};

const statusText: Record<string, string> = {
  PENDING: "در انتظار تأیید",
  PUBLISHED: "منتشرشده",
  REJECTED: "ردشده",
  ARCHIVED: "بایگانی‌شده",
};

function number(value: number): string {
  return value.toLocaleString("fa-IR");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
  }).format(value);
}

async function DashboardContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fdashboard");
  }

  const [
    totalListings,
    publishedListings,
    pendingListings,
    rejectedListings,
    favoriteCount,
    receivedMessages,
    unreadMessages,
    sentMessages,
    recentListings,
  ] = await Promise.all([
    prisma.listing.count({
      where: { ownerId: user.id },
    }),
    prisma.listing.count({
      where: { ownerId: user.id, status: "PUBLISHED" },
    }),
    prisma.listing.count({
      where: { ownerId: user.id, status: "PENDING" },
    }),
    prisma.listing.count({
      where: { ownerId: user.id, status: "REJECTED" },
    }),
    prisma.favorite.count({
      where: {
        userId: user.id,
        listing: { status: "PUBLISHED" },
      },
    }),
    prisma.inquiry.count({
      where: { recipientId: user.id },
    }),
    prisma.inquiry.count({
      where: {
        recipientId: user.id,
        isRead: false,
      },
    }),
    prisma.inquiry.count({
      where: { senderId: user.id },
    }),
    prisma.listing.findMany({
      where: { ownerId: user.id },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const cards = [
    {
      label: "کل آگهی‌های من",
      value: totalListings,
      detail: "تمام آگهی‌های ثبت‌شده",
      icon: "⌂",
      href: "/dashboard/listings",
      color: "navy",
    },
    {
      label: "آگهی‌های منتشرشده",
      value: publishedListings,
      detail: "قابل مشاهده برای عموم",
      icon: "✓",
      href: "/dashboard/listings",
      color: "green",
    },
    {
      label: "در انتظار بررسی",
      value: pendingListings,
      detail: "منتظر تصمیم مدیر",
      icon: "◷",
      href: "/dashboard/listings",
      color: "gold",
    },
    {
      label: "آگهی‌های ردشده",
      value: rejectedListings,
      detail: "نیازمند بررسی مجدد",
      icon: "!",
      href: "/dashboard/listings",
      color: "rose",
    },
  ];

  return (
    <div className="ud-shell ud-shell-embedded" dir="rtl">
      


      <div className="ud-main">
        <div className="ud-content">
          <div className="ud-welcome">
            <div>
              <span className="ud-eyebrow">داشبورد شخصی خانه‌یار</span>
              <h1>خوش آمدی، {user.name || "کاربر خانه‌یار"}</h1>
              <p>
                آگهی‌ها، پیام‌ها و علاقه‌مندی‌هایت را از همین‌جا
                مدیریت کن.
              </p>
            </div>

            <Link href="/listings/new" className="ud-primary-button">
              + ثبت آگهی جدید
            </Link>
          </div>

          <section aria-labelledby="ud-stats-heading">
            <div className="ud-section-heading">
              <div>
                <span>نمای کلی</span>
                <h2 id="ud-stats-heading">وضعیت آگهی‌های من</h2>
              </div>
            </div>

            <div className="ud-stats-grid">
              {cards.map((card) => (
                <Link
                  href={card.href}
                  className={`ud-stat-card ud-stat-${card.color}`}
                  key={card.label}
                >
                  <div className="ud-stat-top">
                    <span className="ud-stat-icon">{card.icon}</span>
                    <span className="ud-stat-arrow">←</span>
                  </div>
                  <strong>{number(card.value)}</strong>
                  <h3>{card.label}</h3>
                  <p>{card.detail}</p>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="ud-activity-heading">
            <div className="ud-section-heading">
              <div>
                <span>فعالیت حساب</span>
                <h2 id="ud-activity-heading">پیام‌ها و علاقه‌مندی‌ها</h2>
              </div>
            </div>

            <div className="ud-activity-grid">
              <Link href="/my/messages" className="ud-activity-card">
                <div className="ud-activity-icon">✉</div>
                <div>
                  <h3>صندوق پیام‌ها</h3>
                  <p>{number(receivedMessages)} پیام دریافتی</p>
                  <p>{number(sentMessages)} پیام ارسالی</p>
                  <strong>
                    {unreadMessages > 0
                      ? `${number(unreadMessages)} پیام خوانده‌نشده`
                      : "پیام خوانده‌نشده‌ای نداری"}
                  </strong>
                </div>
                <span className="ud-activity-arrow">←</span>
              </Link>

              <Link href="/favorites" className="ud-activity-card">
                <div className="ud-activity-icon">♡</div>
                <div>
                  <h3>علاقه‌مندی‌های من</h3>
                  <p>خانه‌هایی که برای بررسی بعدی ذخیره کرده‌ای.</p>
                  <strong>
                    {number(favoriteCount)} آگهی ذخیره‌شده قابل مشاهده
                  </strong>
                </div>
                <span className="ud-activity-arrow">←</span>
              </Link>
            </div>
          </section>

          <section
            className="ud-recent-section"
            aria-labelledby="ud-recent-heading"
          >
            <div className="ud-section-heading">
              <div>
                <span>مدیریت املاک</span>
                <h2 id="ud-recent-heading">آخرین آگهی‌های من</h2>
              </div>
              <Link href="/dashboard/listings" className="ud-text-link">
                مشاهده همه آگهی‌ها ←
              </Link>
            </div>

            {recentListings.length === 0 ? (
              <div className="ud-empty">
                <span>⌂</span>
                <h3>هنوز آگهی ثبت نکرده‌ای</h3>
                <p>
                  اولین آگهی‌ات را ثبت کن تا در این بخش نمایش داده شود.
                </p>
                <Link href="/listings/new" className="ud-primary-button">
                  ثبت اولین آگهی
                </Link>
              </div>
            ) : (
              <div className="ud-listing-table-wrap">
                <table className="ud-listing-table">
                  <thead>
                    <tr>
                      <th scope="col">عنوان آگهی</th>
                      <th scope="col">شهر</th>
                      <th scope="col">تاریخ ثبت</th>
                      <th scope="col">وضعیت</th>
                      <th scope="col">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentListings.map((listing) => (
                      <tr key={listing.id}>
                        <td>
                          <strong>{listing.title}</strong>
                        </td>
                        <td>{listing.city}</td>
                        <td>{formatDate(listing.createdAt)}</td>
                        <td>
                          <span
                            className={`ud-status ud-status-${listing.status.toLowerCase()}`}
                          >
                            {statusText[listing.status] ?? listing.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/listings/${encodeURIComponent(
                              listing.id
                            )}/edit`}
                            className="ud-row-link"
                          >
                            مدیریت آگهی ←
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="ud-loading" dir="rtl" role="status">
          در حال بارگذاری داشبورد خانه‌یار...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}