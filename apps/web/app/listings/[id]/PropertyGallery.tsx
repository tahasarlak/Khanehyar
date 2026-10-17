"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  title: string;
  images: string[];
};

export default function PropertyGallery({ title, images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="hd-gallery-empty" role="img" aria-label="تصویر ملک موجود نیست">
        <span aria-hidden="true">⌂</span>
        <strong>خانه‌یار</strong>
        <p>هنوز تصویری برای این ملک ثبت نشده است.</p>
      </div>
    );
  }

  const selected = images[activeIndex] ?? images[0];

  return (
    <section className="hd-gallery" aria-label="گالری تصاویر ملک">
      <div className="hd-gallery-main">
        <Image
          key={selected}
          src={selected}
          alt={`${title} - تصویر ${activeIndex + 1}`}
          fill
          unoptimized
          priority={activeIndex === 0}
          sizes="(max-width: 900px) 100vw, 760px"
          className="hd-gallery-image"
        />

        <div className="hd-gallery-counter">
          {(activeIndex + 1).toLocaleString("fa-IR")}
          {" / "}
          {images.length.toLocaleString("fa-IR")}
        </div>

        {images.length > 1 && (
          <div className="hd-gallery-arrows">
            <button
              type="button"
              aria-label="تصویر قبلی"
              onClick={() =>
                setActiveIndex((index) =>
                  (index - 1 + images.length) % images.length
                )
              }
            >
              →
            </button>

            <button
              type="button"
              aria-label="تصویر بعدی"
              onClick={() =>
                setActiveIndex((index) => (index + 1) % images.length)
              }
            >
              ←
            </button>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="hd-thumbnails" aria-label="انتخاب تصویر">
          {images.map((url, index) => (
            <button
              type="button"
              key={`${url}-${index}`}
              onClick={() => setActiveIndex(index)}
              className={
                index === activeIndex
                  ? "hd-thumbnail hd-thumbnail-active"
                  : "hd-thumbnail"
              }
              aria-label={`نمایش تصویر ${index + 1}`}
              aria-pressed={index === activeIndex}
            >
              <Image
                src={url}
                alt=""
                fill
                unoptimized
                sizes="90px"
                className="hd-thumbnail-image"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function ShareListing() {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="hd-share"
      aria-label="اشتراک‌گذاری لینک آگهی"
    >
      {copied ? "✓ لینک کپی شد" : "↗ اشتراک‌گذاری"}
    </button>
  );
}