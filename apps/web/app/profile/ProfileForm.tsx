"use client";

import { useState, type FormEvent } from "react";
import styles from "./ProfileForm.module.css";

type Props = {
  initialName: string;
  initialPhone: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function ProfileForm({
  initialName,
  initialPhone,
  email,
  role,
  createdAt,
}: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [savedName, setSavedName] = useState(initialName);
  const [savedPhone, setSavedPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirty = name !== savedName || phone !== savedPhone;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!dirty || loading) return;

    if (!name.trim() || name.trim().length > 100) {
      setError("نام باید بین ۱ تا ۱۰۰ نویسه باشد.");
      return;
    }

    if (phone.length > 30) {
      setError("شماره تلفن بیش از حد طولانی است.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof result.message === "string"
            ? result.message
            : "ذخیره اطلاعات انجام نشد. دوباره تلاش کن."
        );
        return;
      }

      const updatedName = result.user.name ?? "";
      const updatedPhone = result.user.phone ?? "";

      setName(updatedName);
      setPhone(updatedPhone);
      setSavedName(updatedName);
      setSavedPhone(updatedPhone);
      setMessage("اطلاعات پروفایل با موفقیت ذخیره شد.");
    } catch {
      setError("ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن.");
    } finally {
      setLoading(false);
    }
  }

  const joinedDate = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(createdAt));

  return (
    <>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.sectionTitle}>
          <div>
            <h3>اطلاعات شخصی</h3>
            <p>نام و شماره تماس خود را مدیریت کن.</p>
          </div>
          <span className={styles.editLabel}>قابل ویرایش</span>
        </div>

        <div className={styles.fields}>
          <label className={styles.field}>
            <span>نام و نام خانوادگی</span>
            <input
              autoComplete="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              disabled={loading}
              placeholder="نام خود را وارد کن"
            />
          </label>

          <label className={styles.field}>
            <span>شماره تلفن</span>
            <input
              autoComplete="tel"
              name="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={30}
              disabled={loading}
              placeholder="مثلاً +7 900 123 45 67"
              dir="ltr"
            />
            <small>برای حذف شماره تلفن، این فیلد را خالی بگذار.</small>
          </label>

          <label className={styles.field}>
            <span>ایمیل حساب</span>
            <input
              type="email"
              value={email}
              readOnly
              dir="ltr"
              className={styles.readOnly}
            />
            <small>تغییر ایمیل در این فرم امکان‌پذیر نیست.</small>
          </label>
        </div>

        <div className={styles.feedback} aria-live="polite" role="status">
          {error && <p className={styles.error}>{error}</p>}
          {message && <p className={styles.success}>{message}</p>}
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={loading || !dirty}
          >
            {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>

          <button
            type="button"
            className={styles.cancelButton}
            disabled={loading || !dirty}
            onClick={() => {
              setName(savedName);
              setPhone(savedPhone);
              setError("");
              setMessage("");
            }}
          >
            لغو تغییرات
          </button>
        </div>
      </form>

      <div className={styles.accountDetails}>
        <h3>جزئیات حساب</h3>

        <div className={styles.detailRow}>
          <span>تاریخ عضویت</span>
          <strong>{joinedDate}</strong>
        </div>

        <div className={styles.detailRow}>
          <span>نوع حساب</span>
          <strong>{role === "ADMIN" ? "مدیر" : "کاربر عادی"}</strong>
        </div>
      </div>
    </>
  );
}