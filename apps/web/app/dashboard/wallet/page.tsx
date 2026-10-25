import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import "../../marketplace.css";
export const metadata = { title: "کیف پول | خانه‌یار", robots: { index: false, follow: false } };
const labels: Record<string,string>={CREDIT:"واریز",DEBIT:"پرداخت",HOLD:"مسدودی موقت",RELEASE:"آزادسازی",REFUND:"بازپرداخت",ADJUSTMENT:"اصلاح حساب"};
export default async function WalletPage(){
 const user=await getCurrentUser(); if(!user) redirect("/login?next=%2Fdashboard%2Fwallet");
 const wallet=await prisma.wallet.findUnique({where:{userId:user.id},include:{transactions:{orderBy:{createdAt:"desc"},take:50}}});
 return <main className="marketplace-page" dir="rtl"><section className="marketplace-hero"><h1>کیف پول خانه‌یار</h1><p>برای پرداخت خدمات آینده و قابلیت‌های ویژه آماده شده است. تا زمان اتصال درگاه پرداخت معتبر، امکان واریز یا برداشت واقعی فعال نیست.</p><div className="marketplace-balance">{Number(wallet?.balance.toString()??"0").toLocaleString("fa-IR")} تومان</div><span>موجودی ثبت‌شده</span></section><div className="marketplace-note">امنیت مالی: موجودی فقط از تراکنش تأییدشدهٔ سمت سرور تغییر می‌کند. این صفحه هیچ امکان شارژ آزمایشی یا تغییر موجودی از سمت مرورگر ندارد.</div><h2 style={{marginTop:24}}>تاریخچه تراکنش‌ها</h2>{wallet?.transactions.length?<div style={{overflowX:"auto"}}><table className="marketplace-table"><thead><tr><th>نوع</th><th>شرح</th><th>مبلغ</th><th>تاریخ</th></tr></thead><tbody>{wallet.transactions.map(t=><tr key={t.id}><td>{labels[t.type]??t.type}</td><td>{t.description}</td><td>{Number(t.amount.toString()).toLocaleString("fa-IR")} تومان</td><td>{new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(t.createdAt)}</td></tr>)}</tbody></table></div>:<div className="marketplace-empty">هنوز تراکنشی ثبت نشده است.</div>}<div className="marketplace-links"><a className="marketplace-link" href="/dashboard/verification">احراز هویت برای خدمات مالی</a></div></main>;
}
