import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
type Context={params:Promise<{id:string}>};
type ImageFormat = { mime: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };
async function detectImageFormat(file: File): Promise<ImageFormat | null> {
 const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
 // Detect the real format from file bytes, not the browser-supplied MIME type.
 if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
 if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index) => bytes[index] === value)) return { mime: "image/png", extension: "png" };
 if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
 return null;
}
export async function POST(request:NextRequest,context:Context){
 const limit=await checkRateLimit("upload-listing-images",getRequestIdentity(request));if(!limit.allowed)return rateLimitResponse(limit.retryAfterSeconds);
 if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"مبدأ درخواست معتبر نیست."},{status:403});
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"ابتدا وارد حساب شوید."},{status:401});
 const {id}=await context.params;const listing=await prisma.listing.findFirst({where:{id,ownerId:user.id,deletedAt:null},select:{id:true,title:true,_count:{select:{images:true}}}});if(!listing)return NextResponse.json({error:"آگهی پیدا نشد یا متعلق به شما نیست."},{status:404});
 let formData:FormData;try{formData=await request.formData()}catch{return NextResponse.json({error:"فرم تصاویر معتبر نیست."},{status:400})}
 const entries=formData.getAll("images");const files=entries.filter((entry):entry is File=>entry instanceof File&&entry.size>0);
 if(entries.some(entry=>typeof entry==="string"&&entry.trim()!==""))return NextResponse.json({error:"فایل تصویر نامعتبر است."},{status:400});
 const allowedLabels=new Set(["نمای بیرونی","پذیرایی","آشپزخانه","اتاق خواب","سرویس بهداشتی","حمام","بالکن و تراس","حیاط و باغ","منظره","نقشهٔ ملک","سایر"]);
 let labels:(string|null)[]=files.map(()=>null);const rawLabels=formData.get("imageLabels");
 if(typeof rawLabels==="string"&&rawLabels.trim()){try{const parsed:unknown=JSON.parse(rawLabels);if(!Array.isArray(parsed)||parsed.length!==files.length||parsed.some(label=>label!==null&&label!==""&&(typeof label!=="string"||!allowedLabels.has(label))))return NextResponse.json({error:"برچسب یکی از تصاویر معتبر نیست."},{status:400});labels=parsed.map(label=>typeof label==="string"&&label?label:null)}catch{return NextResponse.json({error:"اطلاعات برچسب تصاویر معتبر نیست."},{status:400})}}
 if(!files.length)return NextResponse.json({error:"حداقل یک تصویر انتخاب کن."},{status:400});
 if(listing._count.images+files.length>8)return NextResponse.json({error:"هر آگهی حداکثر ۸ تصویر می‌تواند داشته باشد."},{status:400});
 if(files.some(file=>file.size>8*1024*1024))return NextResponse.json({error:"حجم هر تصویر باید حداکثر ۸ مگابایت باشد."},{status:400});
 const formats = await Promise.all(files.map(detectImageFormat));
 const invalidIndex = formats.findIndex(format => format === null);
 if(invalidIndex !== -1) {
   console.warn("Listing image upload rejected: unsupported image signature", { declaredType: files[invalidIndex].type, size: files[invalidIndex].size });
   return NextResponse.json({error:"فرمت واقعی تصویر قابل تشخیص نیست. لطفاً تصویر را به JPG، PNG یا WebP تبدیل و دوباره انتخاب کن."},{status:400});
 }
 formats.forEach((format,index) => { if (format && files[index].type && files[index].type !== format.mime) console.info("Listing image MIME normalized from file signature", { declaredType: files[index].type, detectedType: format.mime }); });
 const diskDir=process.env.LISTING_UPLOAD_DIR||path.join(process.cwd(),".data","listing-uploads");const createdFiles:string[]=[];const createdIds:string[]=[];
 try{await mkdir(diskDir,{recursive:true});for(const [index,file] of files.entries()){const ext=formats[index]!.extension;const imageId=randomUUID();const filename=`${imageId}.${ext}`;const diskPath=path.join(diskDir,filename);await writeFile(diskPath,Buffer.from(await file.arrayBuffer()),{flag:"wx"});createdFiles.push(diskPath);await prisma.listingImage.create({data:{id:imageId,url:`/api/listing-images/${filename}`,sortOrder:listing._count.images+index,label:labels[index]??null,altText:listing.title.slice(0,200),listingId:listing.id}});createdIds.push(imageId)}const images=await prisma.listingImage.findMany({where:{id:{in:createdIds}},orderBy:{sortOrder:"asc"},select:{id:true,url:true,sortOrder:true,label:true,altText:true}});return NextResponse.json({success:true,images},{status:201,headers:{"Cache-Control":"no-store"}})}catch(error){await prisma.listingImage.deleteMany({where:{id:{in:createdIds}}}).catch(()=>undefined);await Promise.all(createdFiles.map(file=>unlink(file).catch(()=>undefined)));console.error("Listing image upload failed:",error);return NextResponse.json({error:"ذخیره تصاویر ناموفق بود."},{status:500})}
}
