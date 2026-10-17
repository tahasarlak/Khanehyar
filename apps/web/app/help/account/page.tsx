import InfoPage from "../../_components/InfoPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ورود و مدیریت حساب" + " | خانه‌یار", description: "نکات کاربردی برای حفاظت از حساب کاربری." };

const data = {
  "eyebrow": "راهنمای حساب",
  "title": "ورود و مدیریت حساب",
  "intro": "نکات کاربردی برای حفاظت از حساب کاربری.",
  "sections": [
    {
      "heading": "ورود",
      "paragraphs": [],
      "points": [
        "از صفحه ورود استفاده کنید",
        "در دستگاه‌های عمومی پس از پایان کار خارج شوید",
        "از رمز امن و یکتا استفاده کنید"
      ]
    },
    {
      "heading": "مشکلات ورود",
      "paragraphs": [
        "اگر دسترسی از دست رفته است، فقط از مسیر رسمی بازیابی حساب استفاده کنید؛ قابلیت بازیابی باید پیش از انتشار کامل شود."
      ],
      "points": []
    }
  ]
};

export default function Page() {
  return <InfoPage data={data} />;
}
