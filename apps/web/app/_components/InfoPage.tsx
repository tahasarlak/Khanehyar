import Link from "next/link";
import styles from "./InfoPage.module.css";

export type InfoSection = { heading: string; paragraphs?: string[]; points?: string[] };
export type InfoData = { eyebrow: string; title: string; intro: string; sections: InfoSection[]; caution?: string };

export default function InfoPage({ data }: { data: InfoData }) {
  return (
    <main className={styles.shell} dir="rtl">
      <nav aria-label="مسیر صفحه" className={styles.breadcrumb}>
        <Link href="/">خانه‌یار</Link><span aria-hidden="true">/</span><span aria-current="page">{data.title}</span>
      </nav>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>{data.eyebrow}</span>
        <h1>{data.title}</h1>
        <p>{data.intro}</p>
      </header>
      <div className={styles.layout}>
        <article className={styles.article}>
          {data.caution && <aside className={styles.notice} role="note">{data.caution}</aside>}
          {data.sections.map((section, i) => (
            <section className={styles.section} key={`${i}-${section.heading}`}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
              {section.points && <ul>{section.points.map((p,j)=><li key={j}>{p}</li>)}</ul>}
            </section>
          ))}
        </article>
        <aside className={styles.aside} aria-label="لینک‌های مفید">
          <h2>دسترسی سریع</h2>
          <Link href="/search">جست‌وجوی املاک ←</Link>
          <Link href="/listings/new">ثبت آگهی ←</Link>
          <Link href="/help">مرکز راهنما ←</Link>
          <Link href="/safety">معامله امن ←</Link>
          <Link href="/contact">تماس و پشتیبانی ←</Link>
        </aside>
      </div>
    </main>
  );
}
