import InfoPage from "../../_components/InfoPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "چطور آگهی ثبت کنیم؟" + " | خانه‌یار", description: "مسیر عملی ثبت و پیگیری آگهی در خانه‌یار." };

const data = {
  "eyebrow": "راهنمای آگهی‌دهندگان",
  "title": "چطور آگهی ثبت کنیم؟",
  "intro": "مسیر عملی ثبت و پیگیری آگهی در خانه‌یار.",
  "sections": [
    {
      "heading": "پیش از شروع",
      "paragraphs": [],
      "points": [
        "مدارک و مشخصات ملک را برای ورود اطلاعات آماده کنید",
        "عکس‌های روشن و واقعی انتخاب کنید",
        "قیمت و شرایط معامله را دقیق بررسی کنید"
      ]
    },
    {
      "heading": "ثبت",
      "paragraphs": [
        "از «ثبت آگهی» وارد فرم شوید؛ اگر وارد حساب نیستید ابتدا ورود انجام دهید."
      ],
      "points": []
    },
    {
      "heading": "پس از ثبت",
      "paragraphs": [
        "وضعیت تأیید را در داشبورد دنبال کنید و در صورت درخواست اصلاح، اطلاعات را به‌روز کنید."
      ],
      "points": []
    }
  ]
};

export default function Page() {
  return <InfoPage data={data} />;
}
