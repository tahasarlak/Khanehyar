import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import ReviewQueue from "./ReviewQueue";
import "../../marketplace.css";
export const metadata={title:"بررسی پروژه‌ها و اقامتگاه‌ها | خانه‌یار",robots:{index:false,follow:false}};
export default async function AdminMarketplacePage(){const user=await getCurrentUser();if(!user)redirect("/login?next=%2Fadmin%2Fmarketplace");if(user.role!=="ADMIN")redirect("/dashboard");return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>بررسی پروژه‌ها و اقامتگاه‌ها</h1><p>پیش از انتشار، اطلاعات، مجوزها و قیمت‌ها را بررسی کن.</p></section><ReviewQueue/></main>}
