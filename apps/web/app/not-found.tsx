import Link from "next/link";
export default function NotFound() {
 return <main dir="rtl" style={{minHeight:"80vh",display:"grid",placeContent:"center",textAlign:"center",padding:24,fontFamily:"Tahoma,sans-serif"}}><h1>صفحه موردنظر پیدا نشد</h1><p>ممکن است آگهی یا صفحه حذف شده باشد.</p><Link href="/search">بازگشت به جست‌وجوی املاک ←</Link></main>;
}
