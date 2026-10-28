"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

type Props = { title: string; images: string[] };

export default function PropertyGallery({ title, images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const previous = useCallback(() => setActiveIndex((index) => (index - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActiveIndex((index) => (index + 1) % images.length), [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        next();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        previous();
        return;
      }

      if (event.key === "Tab") {
        const dialog = document.querySelector(".hd-lightbox");
        if (!dialog) return;

        const controls = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((element) => element.offsetParent !== null);

        if (controls.length === 0) {
          event.preventDefault();
          return;
        }

        const first = controls[0];
        const last = controls[controls.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [lightboxOpen, closeLightbox, next, previous]);

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || images.length < 2) return;
    const delta = end - start;
    if (Math.abs(delta) < 45) return;
    // RTL gallery: swipe direction follows the visual direction of the carousel.
    if (delta > 0) previous();
    else next();
  };

  if (images.length === 0) {
    return <div className="hd-gallery-empty" role="img" aria-label="تصویر ملک موجود نیست"><span aria-hidden="true">⌂</span><strong>خانه‌یار</strong><p>هنوز تصویری برای این ملک ثبت نشده است.</p></div>;
  }

  const selected = images[activeIndex] ?? images[0];

  return <>
    <section className="hd-gallery" aria-label="گالری تصاویر ملک">
      <div className="hd-gallery-main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button type="button" className="hd-gallery-open" onClick={() => setLightboxOpen(true)} aria-label="نمایش تصویر در اندازه بزرگ">
          <Image key={selected} src={selected} alt={`${title} - تصویر ${activeIndex + 1}`} fill unoptimized priority={activeIndex === 0} sizes="(max-width: 900px) 100vw, 760px" className="hd-gallery-image" />
        </button>
        <div className="hd-gallery-counter">{(activeIndex + 1).toLocaleString("fa-IR")} / {images.length.toLocaleString("fa-IR")}</div>
        <button type="button" className="hd-gallery-fullscreen" onClick={() => setLightboxOpen(true)} aria-label="باز کردن گالری تمام صفحه">⛶ نمایش بزرگ</button>
        {images.length > 1 && <div className="hd-gallery-arrows">
          <button type="button" aria-label="تصویر قبلی" onClick={previous}>→</button>
          <button type="button" aria-label="تصویر بعدی" onClick={next}>←</button>
        </div>}
      </div>
      {images.length > 1 && <div className="hd-thumbnails" aria-label="انتخاب تصویر">
        {images.map((url, index) => <button type="button" key={`${url}-${index}`} onClick={() => setActiveIndex(index)} className={index === activeIndex ? "hd-thumbnail hd-thumbnail-active" : "hd-thumbnail"} aria-label={`نمایش تصویر ${index + 1}`} aria-pressed={index === activeIndex}>
          <Image src={url} alt="" fill unoptimized sizes="90px" className="hd-thumbnail-image" />
        </button>)}
      </div>}
    </section>
    {lightboxOpen && <div className="hd-lightbox" role="dialog" aria-modal="true" aria-label={`گالری تصاویر ${title}`} onClick={(event) => { if (event.target === event.currentTarget) closeLightbox(); }}>
      <button type="button" className="hd-lightbox-close" ref={closeButtonRef} onClick={closeLightbox} aria-label="بستن گالری">×</button>
      <div className="hd-lightbox-count">{(activeIndex + 1).toLocaleString("fa-IR")} / {images.length.toLocaleString("fa-IR")}</div>
      {images.length > 1 && <button type="button" className="hd-lightbox-arrow hd-lightbox-prev" onClick={previous} aria-label="تصویر قبلی">→</button>}
      <div className="hd-lightbox-image" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}><Image src={selected} alt={`${title} - تصویر ${activeIndex + 1}`} fill unoptimized sizes="100vw" /></div>
      {images.length > 1 && <button type="button" className="hd-lightbox-arrow hd-lightbox-next" onClick={next} aria-label="تصویر بعدی">←</button>}
    </div>}
  </>;
}

export function ShareListing({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  useEffect(() => { setCurrentUrl(window.location.href); }, []);
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedText = encodeURIComponent(`${title} | خانه‌یار`);
  const shareLinks = [
    { name: "تلگرام", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, mark: "TG" },
    { name: "واتساپ", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`, mark: "WA" },
    { name: "فیسبوک", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, mark: "f" },
    { name: "ایکس", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, mark: "X" },
    { name: "لینکدین", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, mark: "in" },
    { name: "ایمیل", href: `mailto:?subject=${encodedText}&body=${encodedUrl}`, mark: "@" },
  ];
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true); setStatus("لینک آگهی کپی شد.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setStatus("کپی خودکار ممکن نیست؛ آدرس صفحه را از نوار مرورگر کپی کن."); }
  }
  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title} | خانه‌یار`, url: window.location.href });
        setOpen(false);
      } else {
        await copyLink();
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("اشتراک‌گذاری انجام نشد.");
    }
  }
  return <div className="hd-share-control">
    <button type="button" onClick={() => { setOpen((value) => !value); setStatus(""); }} className="hd-icon-action hd-share" aria-label="اشتراک‌گذاری آگهی" title="اشتراک‌گذاری آگهی" aria-expanded={open} aria-haspopup="dialog">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4"/></svg>
    </button>
    {open && <div className="hd-share-popover" role="dialog" aria-label="روش‌های اشتراک‌گذاری">
      <div className="hd-share-popover-head"><strong>اشتراک‌گذاری آگهی</strong><button type="button" onClick={() => setOpen(false)} aria-label="بستن">×</button></div>
      <button type="button" className="hd-share-native" onClick={() => void nativeShare()}><span aria-hidden="true">↗</span> برنامه‌های گوشی و سایر روش‌ها</button>
      <div className="hd-share-services">{shareLinks.map((item) => <a key={item.name} href={item.href} target={item.name === "ایمیل" ? undefined : "_blank"} rel="noreferrer" aria-label={`اشتراک‌گذاری در ${item.name}`}><span>{item.mark}</span><small>{item.name}</small></a>)}</div>
      <button type="button" className="hd-share-copy" onClick={() => void copyLink()}><span aria-hidden="true">{copied ? "✓" : "▢"}</span>{copied ? "کپی شد" : "کپی لینک آگهی"}</button>
      <p className="hd-share-note">در گوشی، گزینهٔ اشتراک‌گذاری سیستم می‌تواند پیام‌رسان‌های نصب‌شده از جمله برنامه‌های ایرانی را نمایش دهد.</p>
      {status && <p className="hd-share-status" role="status">{status}</p>}
    </div>}
  </div>;
}
