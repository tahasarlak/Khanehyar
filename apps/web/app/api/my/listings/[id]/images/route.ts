import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import { checkRateLimit, getRequestIdentity, rateLimitResponse } from "@/src/lib/rate-limit";
type Context={params:Promise<{id:string}>}; const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
async function hasValidImageSignature(file: File) {
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 if(file.type==="image/jpeg")return bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 if(file.type==="image/png")return [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value,index)=>bytes[index]===value);
 if(file.type==="image/webp")return String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
 return false;
}
export async function POST(request:NextRequest,context:Context){
 const limit=await checkRateLimit("upload-listing-images",getRequestIdentity(request));if(!limit.allowed)return rateLimitResponse(limit.retryAfterSeconds);
 if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"مبدأ درخواست معتبر نیست."},{status:403});
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"ابتدا وارد حساب شوید."},{status:401});
 const {id}=await context.params;const listing=await prisma.listing.findFirst({where:{id,ownerId:user.id},select:{id:true,title:true,_count:{select:{images:true}}}});if(!listing)return NextResponse.json({error:"آگهی پیدا نشد یا متعلق به شما نیست."},{status:404});
 let formData:FormData;try{formData=await request.formData()}catch{return NextResponse.json({error:"فرم تصاویر معتبر نیست."},{status:400})}
 const entries=formData.getAll("images");const files=entries.filter((entry):entry is File=>entry instanceof File&&entry.size>0);
 if(entries.some(entry=>typeof entry==="string"&&entry.trim()!==""))return NextResponse.json({error:"فایل تصویر نامعتبر است."},{status:400});
 if(!files.length)return NextResponse.json({error:"حداقل یک تصویر انتخاب کن."},{status:400});
 if(listing._count.images+files.length>8)return NextResponse.json({error:"هر آگهی حداکثر ۸ تصویر می‌تواند داشته باشد."},{status:400});
 if(files.some(file=>!extensions[file.type]||file.size>8*1024*1024))return NextResponse.json({error:"تصاویر باید JPG، PNG یا WebP و هرکدام حداکثر ۸ مگابایت باشند."},{status:400});
  for(const file of files)if(!(await hasValidImageSignature(file)))return NextResponse.json({error:"محتوای یکی از تصاویر معتبر نیست."},{status:400});
 const diskDir=process.env.LISTING_UPLOAD_DIR||path.join(process.cwd(),".data","listing-uploads");const createdFiles:string[]=[];const createdIds:string[]=[];
 try{await mkdir(diskDir,{recursive:true});for(const [index,file] of files.entries()){const ext=extensions[file.type];const imageId=randomUUID();const filename=`${imageId}.${ext}`;const diskPath=path.join(diskDir,filename);await writeFile(diskPath,Buffer.from(await file.arrayBuffer()),{flag:"wx"});createdFiles.push(diskPath);await prisma.listingImage.create({data:{id:imageId,url:`/api/listing-images/${filename}`,sortOrder:listing._count.images+index,altText:listing.title.slice(0,200),listingId:listing.id}});createdIds.push(imageId)}const images=await prisma.listingImage.findMany({where:{id:{in:createdIds}},orderBy:{sortOrder:"asc"},select:{id:true,url:true,sortOrder:true,altText:true}});return NextResponse.json({success:true,images},{status:201,headers:{"Cache-Control":"no-store"}})}catch(error){await prisma.listingImage.deleteMany({where:{id:{in:createdIds}}}).catch(()=>undefined);await Promise.all(createdFiles.map(file=>unlink(file).catch(()=>undefined)));console.error("Listing image upload failed:",error);return NextResponse.json({error:"ذخیره تصاویر ناموفق بود."},{status:500})}
}
