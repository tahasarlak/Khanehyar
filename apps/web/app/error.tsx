"use client";
import Link from "next/link";
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}){
 return <main dir="rtl" style={{minHeight:"80vh",display:"grid",placeContent:"center",textAlign:"center",padding:24,fontFamily:"Tahoma,sans-serif"}}><h1>مشکلی پیش آمده است</h1><p>لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، به پشتیبانی اطلاع دهید.</p><button onClick={()=>reset()} type="button" style={{padding:12,cursor:"pointer"}}>تلاش دوباره</button><p><Link href="/">بازگشت به صفحه اصلی</Link></p></main>;
}
