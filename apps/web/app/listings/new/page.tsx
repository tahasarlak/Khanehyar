"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import "./new-listing.css";

export default function NewListingPage() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData(form);
      const response = await fetch("/api/listings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "ثبت آگهی انجام نشد. اطلاعات را بررسی کن.",
        );
        return;
      }

      setMessage(
        `${result.message} کد آگهی: ${result.listing.id}`,
      );
      form.reset();
    } catch {
      setError("ارتباط با سرور برقرار نشد. دوباره تلاش کن.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="nl-page" dir="rtl">
      <div className="nl-heading">
        <div>
          <span className="nl-eyebrow">مدیریت املاک</span>
          <h1>ثبت آگهی جدید</h1>
          <p>
            مشخصات ملک را وارد کن تا آگهی برای بررسی و انتشار ثبت شود.
          </p>
        </div>

        <Link href="/dashboard/listings" className="nl-back">
          بازگشت به آگهی‌های من
        </Link>
      </div>

      <div className="nl-notice">
        <span className="nl-notice-icon" aria-hidden="true">i</span>
        <div>
          <strong>قبل از ثبت آگهی</strong>
          <p>
            اطلاعات و قیمت را با دقت وارد کن. فیلدهای ستاره‌دار الزامی هستند.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="nl-form">
        <section className="nl-section">
          <div className="nl-section-heading">
            <span className="nl-section-number">۱</span>
            <div>
              <h2>اطلاعات اصلی ملک</h2>
              <p>عنوان، نوع معامله و موقعیت ملک را مشخص کن.</p>
            </div>
          </div>

          <div className="nl-grid">
            <label className="nl-field">
              عنوان آگهی *
              <input
                name="title"
                required
                minLength={5}
                maxLength={120}
                placeholder="مثلاً آپارتمان دوخوابه نزدیک مترو"
              />
            </label>

            <label className="nl-field">
              نوع معامله *
              <select name="listingType" required defaultValue="SALE">
                <option value="SALE">فروش</option>
                <option value="RENT">اجاره</option>
              </select>
            </label>

            <label className="nl-field">
              نوع ملک *
              <select name="propertyType" required defaultValue="APARTMENT">
                <option value="APARTMENT">آپارتمان</option>
                <option value="HOUSE">خانه</option>
                <option value="VILLA">ویلا</option>
                <option value="LAND">زمین</option>
                <option value="COMMERCIAL">تجاری</option>
              </select>
            </label>

            <label className="nl-field">
              شهر *
              <input
                name="city"
                required
                minLength={2}
                maxLength={100}
                placeholder="نام شهر"
              />
            </label>

            <label className="nl-field nl-full">
              توضیحات ملک *
              <textarea
                name="description"
                required
                minLength={20}
                maxLength={5000}
                rows={5}
                placeholder="درباره موقعیت، امکانات، وضعیت و ویژگی‌های ملک بنویس..."
              />
            </label>
          </div>
        </section>

        <section className="nl-section">
          <div className="nl-section-heading">
            <span className="nl-section-number">۲</span>
            <div>
              <h2>قیمت و مشخصات</h2>
              <p>اطلاعات مالی و جزئیات ساختمان را وارد کن.</p>
            </div>
          </div>

          <div className="nl-grid">
            <label className="nl-field">
              قیمت *
              <input
                name="price"
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="مبلغ قیمت"
              />
            </label>

            <label className="nl-field">
              واحد پول *
              <select name="currency" required defaultValue="RUB">
                <option value="RUB">روبل روسیه (RUB)</option>
                <option value="IRR">ریال ایران (IRR)</option>
                <option value="USD">دلار آمریکا (USD)</option>
              </select>
            </label>

            <label className="nl-field">
              مساحت (متر مربع) *
              <input
                name="area"
                type="number"
                required
                min="0.01"
                step="0.01"
                placeholder="مثلاً ۸۶"
              />
            </label>

            <label className="nl-field">
              تعداد اتاق
              <input
                name="rooms"
                type="number"
                min="0"
                step="1"
                placeholder="مثلاً ۳"
              />
            </label>

            <label className="nl-field">
              طبقه
              <input
                name="floor"
                type="number"
                min="0"
                step="1"
                placeholder="مثلاً ۴"
              />
            </label>

            <label className="nl-field">
              تعداد کل طبقات ساختمان
              <input
                name="totalFloors"
                type="number"
                min="1"
                step="1"
                placeholder="مثلاً ۹"
              />
            </label>

            <label className="nl-field nl-full">
              آدرس دقیق
              <input
                name="address"
                maxLength={300}
                placeholder="خیابان، منطقه یا نشانی ملک (اختیاری)"
              />
            </label>
          </div>
        </section>

        {message && (
          <div className="nl-message nl-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="nl-message nl-error" role="alert">
            {error}
          </div>
        )}

        <div className="nl-actions">
          <button
            type="submit"
            disabled={submitting}
            className="nl-submit"
          >
            {submitting ? "در حال ثبت آگهی..." : "ثبت آگهی"}
          </button>

          <Link href="/dashboard/listings" className="nl-cancel">
            انصراف
          </Link>
        </div>
      </form>
    </div>
  );
}