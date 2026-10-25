import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import VerificationForm from "./VerificationForm";
import "../../marketplace.css";
export const metadata={title:"احراز هویت | خانه‌یار",robots:{index:false,follow:false}};
export default async function VerificationPage(){const user=await getCurrentUser();if(!user)redirect("/login?next=%2Fdashboard%2Fverification");return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>احراز هویت</h1><p>برای فعال‌سازی قابلیت‌های مالی یا خدمات نیازمند تأیید هویت، درخواست بررسی ثبت کن.</p></section><VerificationForm/></main>}
