import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import StayForm from "./StayForm";
import "../../../marketplace.css";
export const metadata={title:"ثبت هتل یا اقامتگاه | خانه‌یار",robots:{index:false,follow:false}};
export default async function NewStayPage(){const user=await getCurrentUser();if(!user)redirect("/login?next=%2Fdashboard%2Fstays%2Fnew");return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>ثبت هتل، مسافرخانه یا اقامتگاه</h1><p>نرخ شبانه، هفتگی، ساعتی و ماهانه را وارد کن؛ حداقل یک نرخ را مشخص کن.</p></section><StayForm/></main>}
