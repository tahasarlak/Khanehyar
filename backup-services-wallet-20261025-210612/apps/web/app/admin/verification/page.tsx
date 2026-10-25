import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import ReviewQueue from "./ReviewQueue";
import "../../marketplace.css";
export const metadata={title:"بررسی احراز هویت | خانه‌یار",robots:{index:false,follow:false}};
export default async function AdminVerificationPage(){const user=await getCurrentUser();if(!user)redirect("/login?next=%2Fadmin%2Fverification");if(user.role!=="ADMIN")redirect("/dashboard");return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>بررسی احراز هویت</h1><p>اطلاعات شخصی را فقط برای تصمیم بررسی استفاده کن. این صف صرفاً داده‌های محدودی را نشان می‌دهد و مدرک هویتی در آن بارگذاری نمی‌شود.</p></section><ReviewQueue/></main>}
