"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteMegaNavigation.module.css";

type MenuItem = { label: string; href: string; strong?: boolean };
type MenuGroup = { title: string; items: MenuItem[] };
type MenuConfig = { id: string; label: string; groups: MenuGroup[]; promo?: { title: string; text: string; action: string; href: string; mark: string } };

const menus: MenuConfig[] = [
  { id: "rent", label: "اجاره", groups: [
    { title: "اجاره بلندمدت", items: [{label:"آپارتمان",href:"/search?deal=RENT&property=APARTMENT"},{label:"خانه و ویلا",href:"/search?deal=RENT&property=HOUSE"},{label:"اتاق",href:"/search?deal=RENT"},{label:"اجاره روزانه",href:"/stays"}] },
    { title: "اجاره و مالکیت", items: [{label:"ثبت ملک برای اجاره",href:"/listings/new",strong:true},{label:"مدیریت آگهی‌های من",href:"/dashboard/listings"},{label:"راهنمای اجاره",href:"/help/renting"},{label:"خانه من",href:"/my-home"}] },
  ], promo:{title:"ملکت را هوشمندانه اجاره بده",text:"آگهی ثبت کن و درخواست‌های متقاضیان را در خانه‌یار مدیریت کن.",action:"ثبت آگهی رایگان",href:"/listings/new",mark:"⌂"} },
  { id: "sale", label: "خرید و فروش", groups: [
    { title:"خرید ملک",items:[{label:"آپارتمان برای خرید",href:"/search?deal=SALE&property=APARTMENT"},{label:"خانه و ویلا",href:"/search?deal=SALE&property=HOUSE"},{label:"زمین",href:"/search?deal=SALE&property=LAND"},{label:"املاک تجاری",href:"/search?deal=SALE&property=COMMERCIAL"}]},
    { title:"فروش ملک",items:[{label:"ثبت آگهی فروش",href:"/listings/new",strong:true},{label:"ارزش‌گذاری و تحلیل ملک",href:"/my-home"},{label:"مشاوران املاک",href:"/agents"},{label:"راهنمای فروش",href:"/help/buying"}]}
  ],promo:{title:"برای فروش آماده‌ای؟",text:"ملکت را معرفی کن و آگهی‌ات را به هزاران جست‌وجوگر نشان بده.",action:"ثبت آگهی",href:"/listings/new",mark:"↗"}},
  { id:"new",label:"نوسازها",groups:[{title:"پروژه‌های ساختمانی",items:[{label:"همه پروژه‌ها",href:"/projects"},{label:"پروژه‌های در حال ساخت",href:"/projects?status=BUILDING"},{label:"پروژه‌های آماده تحویل",href:"/projects?status=READY"}]},{title:"راهنمای خرید",items:[{label:"مقایسه پروژه‌ها",href:"/projects"},{label:"مشاوره خرید",href:"/agents"},{label:"راهنمای پیش‌خرید",href:"/help"}]}]},
  { id:"land",label:"خانه و زمین",groups:[{title:"ملک مسکونی",items:[{label:"خانه و ویلا",href:"/search?property=HOUSE"},{label:"زمین",href:"/search?property=LAND"},{label:"باغ و زمین کشاورزی",href:"/search?property=LAND"}]},{title:"خدمات",items:[{label:"ثبت ملک",href:"/listings/new"},{label:"مشاوران املاک",href:"/agents"},{label:"خانه من",href:"/my-home"}]}]},
  { id:"commercial",label:"تجاری",groups:[{title:"املاک تجاری",items:[{label:"دفتر و واحد اداری",href:"/search?property=COMMERCIAL"},{label:"مغازه و فضای تجاری",href:"/search?property=COMMERCIAL"},{label:"انبار و کارگاه",href:"/search?property=COMMERCIAL"}]},{title:"معاملات تجاری",items:[{label:"اجاره تجاری",href:"/search?deal=RENT&property=COMMERCIAL"},{label:"فروش تجاری",href:"/search?deal=SALE&property=COMMERCIAL"},{label:"ثبت آگهی",href:"/listings/new"}]}]},
  { id:"mortgage",label:"وام و رهن",groups:[{title:"ابزارهای مالی",items:[{label:"محاسبه‌گر وام مسکن",href:"/help"},{label:"راهنمای وام مسکن",href:"/help"},{label:"هزینه‌های معامله",href:"/help"}]},{title:"مدیریت ملک",items:[{label:"ارزش ملک من",href:"/my-home"},{label:"درآمد احتمالی اجاره",href:"/my-home"}]}]},
  { id:"myhome",label:"خانه من",groups:[{title:"مدیریت دارایی ملکی",items:[{label:"نمای کلی املاک من",href:"/my-home",strong:true},{label:"ثبت خانه یا آپارتمان",href:"/listings/new"},{label:"آگهی‌های من",href:"/dashboard/listings"},{label:"علاقه‌مندی‌ها",href:"/dashboard/favorites"}]},{title:"تحلیل و تصمیم‌گیری",items:[{label:"برآورد ارزش ملک",href:"/my-home#valuation"},{label:"بررسی درآمد اجاره",href:"/my-home#rent"},{label:"آگهی‌های مشابه",href:"/search"},{label:"راهنمای فروش و اجاره",href:"/help"}]}],promo:{title:"مرکز مدیریت املاک شما",text:"اطلاعات ملک، آگهی‌ها و مسیر فروش یا اجاره را یکجا مدیریت کن.",action:"ورود به خانه من",href:"/my-home",mark:"⌂"}},
  { id:"deal",label:"معامله",groups:[{title:"خدمات معامله",items:[{label:"مشاوران املاک",href:"/agents"},{label:"گفت‌وگو با فروشنده",href:"/my/messages"},{label:"ثبت درخواست مشاوره",href:"/contact"}]},{title:"امنیت معامله",items:[{label:"راهنمای معامله امن",href:"/safety"},{label:"بررسی مدارک ملک",href:"/help"},{label:"سؤالات متداول",href:"/faq"}]}]},
  { id:"services",label:"خدمات",groups:[{title:"ابزارها",items:[{label:"جست‌وجو روی نقشه",href:"/search?view=map"},{label:"محاسبه‌گر وام",href:"/help"},{label:"خانه من",href:"/my-home"}]},{title:"پشتیبانی",items:[{label:"مرکز راهنما",href:"/help"},{label:"تماس با ما",href:"/contact"},{label:"درباره خانه‌یار",href:"/about"}]}]},
];

const utilityLinks = [
  {label:"جست‌وجو روی نقشه",href:"/search?view=map"},
  {label:"مرکز راهنما",href:"/help"},
  {label:"کاتالوگ پروژه‌ها",href:"/projects"},
  {label:"مشاوران املاک",href:"/agents"},
  {label:"سؤالات متداول",href:"/faq"},
  {label:"تماس با ما",href:"/contact"},
];

export default function SiteMegaNavigation() {
  const [active, setActive] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  const pathname = usePathname() || "/";

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setActive(null);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);

  const selected = menus.find((menu) => menu.id === active);
  return (
    <>
      <nav ref={root} className={styles.root} aria-label="دسته‌بندی‌های اصلی" dir="rtl" onMouseLeave={() => setActive(null)}>
        <div className={styles.bar}>
          {menus.map((menu) => (
            <button key={menu.id} type="button" className={`${styles.navButton} ${active === menu.id ? styles.selected : ""} ${menu.id === "myhome" ? styles.myHome : ""}`} aria-expanded={active === menu.id} onMouseEnter={() => setActive(menu.id)} onFocus={() => setActive(menu.id)} onClick={() => setActive(active === menu.id ? null : menu.id)}>
              {menu.label}<span className={styles.chevron} aria-hidden="true">⌄</span>
            </button>
          ))}
          <Link className={styles.partner} href="/projects">همکاران</Link>
        </div>
        {selected && <div className={styles.panel}>
          <div className={styles.panelMain}>
            {selected.groups.map((group) => <section className={styles.group} key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((item) => <Link key={`${item.href}-${item.label}`} className={item.strong ? styles.strongLink : styles.itemLink} href={item.href} onClick={() => setActive(null)}>{item.label}</Link>)}
            </section>)}
            {selected.promo && <aside className={styles.promo}>
              <span className={styles.promoMark}>{selected.promo.mark}</span>
              <div><strong>{selected.promo.title}</strong><p>{selected.promo.text}</p><Link href={selected.promo.href} onClick={() => setActive(null)}>{selected.promo.action} <span>←</span></Link></div>
            </aside>}
          </div>
          <div className={styles.utilityRow}>{utilityLinks.map((item) => <Link key={item.href + item.label} href={item.href} onClick={() => setActive(null)}>{item.label}</Link>)}</div>
        </div>}
      </nav>
      {active && <button className={styles.scrim} aria-label="بستن منو" onClick={() => setActive(null)} tabIndex={-1} />}
    </>
  );
}
