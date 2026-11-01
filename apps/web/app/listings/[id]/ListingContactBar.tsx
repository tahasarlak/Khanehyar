"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ListingContactBar({listingId}:{listingId:string}){
 const router=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 async function openChat(){if(busy)return;setBusy(true);setError("");try{const r=await fetch(`/api/listings/${encodeURIComponent(listingId)}/inquiries`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"open"})});const d=await r.json().catch(()=>({}));if(r.status===401){router.push(`/login?next=${encodeURIComponent(location.pathname)}`);return;}if(!r.ok||!d.conversationId)throw new Error(d.error||"باز کردن گفت‌وگو ممکن نشد.");router.push(`/dashboard/messages/${encodeURIComponent(d.conversationId)}`);}catch(e){setError(e instanceof Error?e.message:"ارتباط برقرار نشد.");}finally{setBusy(false);}}
 return <div className="hd-contact-actions hd-mobile-dock" aria-label="ارتباط با آگهی‌دهنده"><button type="button" className="hd-mobile-message-cta" onClick={openChat} disabled={busy}>{busy?"در حال ورود به چت…":"پیام به آگهی‌دهنده"}</button><button type="button" className="hd-mobile-call-cta" disabled title="تماس صوتی درون‌برنامه‌ای پس از راه‌اندازی زیرساخت تماس فعال می‌شود">تماس صوتی · به‌زودی</button>{error&&<span role="alert" className="hd-mobile-contact-error">{error}</span>}</div>;
}
