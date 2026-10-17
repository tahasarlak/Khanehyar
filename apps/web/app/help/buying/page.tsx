import InfoPage from "../../_components/InfoPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "راهنمای جست‌وجو و خرید ملک" + " | خانه‌یار", description: "نکات اولیه انتخاب و بررسی آگهی‌ها." };

const data = {
  "eyebrow": "راهنمای خریداران",
  "title": "راهنمای جست‌وجو و خرید ملک",
  "intro": "نکات اولیه انتخاب و بررسی آگهی‌ها.",
  "sections": [
    {
      "heading": "انتخاب مناسب",
      "paragraphs": [],
      "points": [
        "محدوده بودجه و موقعیت را تعیین کنید",
        "متراژ، اتاق، امکانات و دسترسی‌ها را مقایسه کنید",
        "چند آگهی مشابه را کنار هم بررسی کنید"
      ]
    },
    {
      "heading": "بررسی و تصمیم",
      "paragraphs": [],
      "points": [
        "بازدید حضوری را در اولویت قرار دهید",
        "مدارک و مالکیت را از مسیر معتبر بررسی کنید",
        "پیش از تعهد مالی با متخصص مرتبط مشورت کنید"
      ]
    }
  ]
};

export default function Page() {
  return <InfoPage data={data} />;
}
