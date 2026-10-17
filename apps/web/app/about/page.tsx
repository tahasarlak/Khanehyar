import InfoPage from "../_components/InfoPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "درباره خانه‌یار" + " | خانه‌یار", description: "خانه‌یار بستری برای جست‌وجو، معرفی و ارتباط درباره املاک است." };

const data = {
  "eyebrow": "آشنایی با خانه‌یار",
  "title": "درباره خانه‌یار",
  "intro": "خانه‌یار بستری برای جست‌وجو، معرفی و ارتباط درباره املاک است.",
  "sections": [
    {
      "heading": "مأموریت ما",
      "paragraphs": [
        "کمک به کاربران برای مقایسه دقیق آگهی‌ها و ارتباط شفاف با آگهی‌دهندگان.",
        "هدف ما ارائه اطلاعات منظم و تجربه ساده در موبایل و دسکتاپ است."
      ],
      "points": []
    },
    {
      "heading": "خانه‌یار چه کاری انجام می‌دهد؟",
      "paragraphs": [],
      "points": [
        "نمایش و جست‌وجوی آگهی‌های ملک",
        "ارائه ابزار ثبت و مدیریت آگهی",
        "فراهم‌کردن راه ارتباطی میان کاربران"
      ]
    }
  ]
};

export default function Page() {
  return <InfoPage data={data} />;
}
