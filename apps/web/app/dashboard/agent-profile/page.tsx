import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import AgentProfileForm from "./AgentProfileForm";
import "../../marketplace.css";
export const metadata={title:"صفحه حرفه‌ای مشاور یا املاک | خانه‌یار",robots:{index:false,follow:false}};
export default async function AgentProfilePage(){const user=await getCurrentUser();if(!user)redirect("/login?next=%2Fdashboard%2Fagent-profile");return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>صفحهٔ مشاور یا دفتر املاک</h1><p>پروفایل حرفه‌ای بساز تا کاربران مشخصات عمومی و آگهی‌های منتسب به تو را ببینند.</p></section><AgentProfileForm/></main>}
