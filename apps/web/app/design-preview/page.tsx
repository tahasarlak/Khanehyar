import Link from "next/link";

const features = [
  {
    icon: "🏙️",
    title: "آپارتمان‌های مدرن",
    text: "طراحی ساده، کارت‌های مرتب و نمایش واضح اطلاعات ملک",
    color: "#d9e8ef",
  },
  {
    icon: "🏡",
    title: "خانه‌های ویلایی",
    text: "فضای بصری آرام برای تجربه‌ای جذاب هنگام جست‌وجو",
    color: "#dcece4",
  },
  {
    icon: "🏢",
    title: "املاک تجاری",
    text: "ساختار قابل توسعه برای دسته‌بندی‌های مختلف املاک",
    color: "#e7e3f1",
  },
];

const palette = [
  { name: "سرمه‌ای اصلی", hex: "#142F56" },
  { name: "سبز یشمی", hex: "#167D66" },
  { name: "پس‌زمینه", hex: "#F4F7FB" },
  { name: "سفید", hex: "#FFFFFF" },
];

export default function DesignPreviewPage() {
  return (
    <div className="kh-page">
      <header className="kh-header">
        <div className="kh-container kh-header-inner">
          <Link href="/" className="kh-brand">
            <span className="kh-brand-mark">⌂</span>
            <span>
              <span className="kh-brand-name" style={{ display: "block" }}>
                خانه‌یار
              </span>
              <span className="kh-brand-caption">
                جایی برای پیدا کردن خانه
              </span>
            </span>
          </Link>

          <nav className="kh-nav" aria-label="منوی پیش‌نمایش">
            <Link href="/">صفحه اصلی</Link>
            <a href="#features">دسته‌بندی‌ها</a>
            <Link href="/login">ورود</Link>
            <Link href="/listings/new" className="kh-btn kh-btn-primary">
              + ثبت آگهی
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="kh-hero">
          <div className="kh-container kh-hero-grid">
            <div>
              <span className="kh-eyebrow">
                ✦ تجربه‌ای متفاوت در بازار املاک
              </span>

              <h1 className="kh-hero-title">
                خانه رؤیایی‌ات را
                <br />
                با <span className="kh-accent">خانه‌یار</span> پیدا کن
              </h1>

              <p className="kh-lead">
                طراحی زیبا، جست‌وجوی آسان و اطلاعات شفاف.
                این پیش‌نمایش، شروع ساخت نسل جدید خانه‌یار است.
              </p>

              <form
                action="/"
                method="get"
                className="kh-search-panel"
                role="search"
              >
                <input
                  name="city"
                  className="kh-input"
                  placeholder="نام شهر یا منطقه موردنظر..."
                  aria-label="شهر موردنظر"
                />
                <button className="kh-btn kh-btn-primary" type="submit">
                  جست‌وجوی ملک ←
                </button>
              </form>

              <p className="kh-card-text">
                این صفحه نمایشی است؛ جست‌وجوی نهایی در فاز سوم تکمیل می‌شود.
              </p>
            </div>

            <div className="kh-showcase">
              <div className="kh-showcase-art" aria-hidden="true">
                🏡
              </div>
              <div className="kh-showcase-info">
                <span className="kh-pill">نمونه طراحی</span>
                <h2 className="kh-card-title" style={{ marginTop: 10 }}>
                  خانه‌ای برای شروع یک زندگی تازه
                </h2>
                <p className="kh-card-text">
                  طراحی کارت معرفی ملک در نسخه جدید
                </p>
                <div
                  className="kh-showcase-price"
                  style={{ marginTop: 14 }}
                >
                  ساده، زیبا و کاربردی
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="kh-section">
          <div className="kh-container">
            <span className="kh-eyebrow">دسته‌بندی ملک</span>
            <h2 className="kh-section-title">
              هر ملکی که دنبالش هستی
            </h2>
            <p className="kh-section-desc">
              نمونه کارت‌هایی که در بخش‌های مختلف سایت استفاده می‌کنیم.
            </p>

            <div className="kh-grid">
              {features.map((item) => (
                <article key={item.title} className="kh-card">
                  <div
                    className="kh-card-art"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </div>
                  <div className="kh-card-body">
                    <h3 className="kh-card-title">{item.title}</h3>
                    <p className="kh-card-text">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="kh-section" style={{ background: "#fff" }}>
          <div className="kh-container">
            <span className="kh-eyebrow">هویت بصری</span>
            <h2 className="kh-section-title">
              رنگ‌های رسمی خانه‌یار
            </h2>
            <p className="kh-section-desc">
              رنگ‌هایی ثابت برای همه صفحات و اجزای رابط کاربری.
            </p>

            <div className="kh-color-grid">
              {palette.map((item) => (
                <div key={item.hex} className="kh-color">
                  <div
                    className="kh-color-swatch"
                    style={{ background: item.hex }}
                  />
                  <div className="kh-color-info">
                    <strong>{item.name}</strong>
                    <div dir="ltr">{item.hex}</div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 35,
              }}
            >
              <Link href="/" className="kh-btn kh-btn-primary">
                دکمه اصلی
              </Link>
              <Link href="/login" className="kh-btn kh-btn-dark">
                دکمه سرمه‌ای
              </Link>
              <Link href="/register" className="kh-btn kh-btn-outline">
                دکمه ثانویه
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="kh-footer">
        <div className="kh-container kh-footer-inner">
          <strong>خانه‌یار — همراه انتخاب خانه بهتر</strong>
          <span>پیش‌نمایش سیستم طراحی | نسخه ۱</span>
        </div>
      </footer>
    </div>
  );
}