import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth";
type Context = { params: Promise<{ key: string }> };
const mime: Record<string,string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
export async function GET(_request: Request, context: Context) {
 const {key}=await context.params; const match=/^([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(key);
 if(!match)return NextResponse.json({error:"تصویر پیدا نشد."},{status:404});
 const [,id,extension]=match;
 const image=await prisma.listingImage.findUnique({where:{id},select:{url:true,listing:{select:{ownerId:true,status:true}}}});
 if(!image||image.url!==`/api/listing-images/${key}`)return NextResponse.json({error:"تصویر پیدا نشد."},{status:404});
 const user=await getCurrentUser(); const isPublic=image.listing.status==="PUBLISHED";
 if(!isPublic&&(!user||(user.id!==image.listing.ownerId&&user.role!=="ADMIN")))return NextResponse.json({error:"تصویر پیدا نشد."},{status:404});
 const uploadDir=process.env.LISTING_UPLOAD_DIR||path.join(process.cwd(),".data","listing-uploads");
 try{const bytes=await readFile(path.join(uploadDir,key));return new NextResponse(bytes,{headers:{"Content-Type":mime[extension.toLowerCase()],"Content-Length":String(bytes.byteLength),"X-Content-Type-Options":"nosniff","Cache-Control":isPublic?"public, max-age=300, stale-while-revalidate=600":"private, no-store"}})}catch{return NextResponse.json({error:"فایل تصویر در دسترس نیست."},{status:404})}
}
