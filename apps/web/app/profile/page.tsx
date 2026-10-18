import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../src/lib/auth";
import ProfileForm from "./ProfileForm";
import styles from "./ProfileForm.module.css";

export const metadata: Metadata = {
  title: "پروفایل من | خانه‌یار",
  description: "مشاهده و مدیریت اطلاعات حساب کاربری خانه‌یار",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fprofile");
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.container}>
        <header className={styles.heading}>
          <h1>پروفایل من</h1>
          <p>
            اطلاعات حساب کاربری خود را مشاهده و به‌روز نگه دار.
          </p>
        </header>

        <section className={styles.profileCard}>
          <div className={styles.identity}>
            <div className={styles.avatar} aria-hidden="true">
              {(user.name?.trim().charAt(0) || user.email.charAt(0))
                .toLocaleUpperCase("fa-IR")}
            </div>

            <div className={styles.identityText}>
              <h2>{user.name?.trim() || "کاربر خانه‌یار"}</h2>
              <p>{user.email}</p>
              <span className={styles.role}>
                {user.role === "ADMIN" ? "مدیر سامانه" : "عضو خانه‌یار"}
              </span>
            </div>
          </div>

          <div className={styles.separator} />

          <ProfileForm
            initialName={user.name ?? ""}
            initialPhone={user.phone ?? ""}
            email={user.email}
            role={user.role}
            createdAt={user.createdAt.toISOString()}
          />
        </section>

        <aside className={styles.securityNote}>
          <span aria-hidden="true">◇</span>
          <div>
            <strong>امنیت حساب شما مهم است</strong>
            <p>
              رمز عبور و اطلاعات ورود خود را در اختیار دیگران قرار نده.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}