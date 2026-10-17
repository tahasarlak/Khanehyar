import InfoPage from "../../_components/InfoPage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "راهنمای جست‌وجو و اجاره" + " | خانه‌یار", description: "مقایسه هزینه‌ها و شرایط اجاره املاک." };

const data = {
  "eyebrow": "راهنمای مستأجران",
  "title": "راهنمای جست‌وجو و اجاره",
  "intro": "مقایسه هزینه‌ها و شرایط اجاره املاک.",
  "sections": [
    {
      "heading": "معیارهای جست‌وجو",
      "paragraphs": [],
      "points": [
        "هزینه ماهانه و ودیعه را جداگانه بسنجید",
        "موقعیت، حمل‌ونقل و خدمات اطراف را بررسی کنید",
        "شرایط قرارداد و هزینه‌های جانبی را روشن کنید"
      ]
    },
    {
      "heading": "قبل از توافق",
      "paragraphs": [],
      "points": [
        "ملک را حضوری بررسی کنید",
        "شرایط تحویل و تعمیرات را ثبت کنید",
        "پیش از پرداخت، مجوز و اختیار موجر را بررسی کنید"
      ]
    }
  ]
};

export default function Page() {
  return <InfoPage data={data} />;
}
