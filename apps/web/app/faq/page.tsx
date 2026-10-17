import InfoPage from "../_components/InfoPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "سؤالات متداول" + " | خانه‌یار", description: "راهنمای سریع برای ابهام‌های رایج کاربران." };

const data = {
  "eyebrow": "پرسش‌های متداول",
  "title": "سؤالات متداول",
  "intro": "راهنمای سریع برای ابهام‌های رایج کاربران.",
  "sections": [
    {
      "heading": "آیا بدون حساب می‌توان ملک‌ها را دید؟",
      "paragraphs": [
        "بله، آگهی‌های عمومی را می‌توان بدون ورود مشاهده و جست‌وجو کرد."
      ],
      "points": []
    },
    {
      "heading": "چرا آگهی من بلافاصله نمایش داده نمی‌شود؟",
      "paragraphs": [
        "آگهی‌ها ممکن است در انتظار بررسی مدیر باشند. وضعیت را در بخش «آگهی‌های من» مشاهده کنید."
      ],
      "points": []
    },
    {
      "heading": "چرا ارسال پیام نیاز به ورود دارد؟",
      "paragraphs": [
        "برای حفاظت از مکالمات، جلوگیری از سوءاستفاده و حفظ تاریخچه پیام‌ها."
      ],
      "points": []
    },
    {
      "heading": "چطور آگهی را ویرایش کنم؟",
      "paragraphs": [
        "از داشبورد به «آگهی‌های من» بروید و گزینه مدیریت یا ویرایش را انتخاب کنید."
      ],
      "points": []
    }
  ]
};

export default function Page() {
  return <InfoPage data={data} />;
}
