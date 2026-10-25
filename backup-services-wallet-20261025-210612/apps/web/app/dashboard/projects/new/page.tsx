import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import ProjectForm from "./ProjectForm";
import "../../../marketplace.css";
export const metadata={title:"ثبت پروژه ساختمانی | خانه‌یار",robots:{index:false,follow:false}};
export default async function NewProjectPage(){const user=await getCurrentUser();if(!user)redirect("/login?next=%2Fdashboard%2Fprojects%2Fnew");return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>ثبت پروژهٔ ساختمانی</h1><p>پیش‌فروش، پروژهٔ در حال ساخت یا مشارکت در ساخت را ثبت کن.</p></section><ProjectForm/></main>}
