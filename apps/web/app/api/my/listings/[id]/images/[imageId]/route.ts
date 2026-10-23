import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
type Context={params:Promise<{id:string;imageId:string}>};
export async function DELETE(request:NextRequest,context:Context){
 if(request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"مبدأ درخواست معتبر نیست."},{status:403});
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"ابتدا وارد حساب شوید."},{status:401});
 const {id,imageId}=await context.params;const image=await prisma.listingImage.findFirst({where:{id:imageId,listingId:id,listing:{ownerId:user.id}},select:{id:true,url:true}});
 if(!image)return NextResponse.json({error:"تصویر پیدا نشد یا متعلق به شما نیست."},{status:404});
 await prisma.listingImage.delete({where:{id:image.id}});const match=/^\/api\/listing-images\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/i.exec(image.url);
 if(match){const dir=process.env.LISTING_UPLOAD_DIR||path.join(process.cwd(),".data","listing-uploads");await unlink(path.join(dir,path.basename(match[1]))).catch(()=>undefined)}
 const remaining=await prisma.listingImage.findMany({where:{listingId:id},orderBy:{sortOrder:"asc"},select:{id:true}});await prisma.$transaction(remaining.map((item,index)=>prisma.listingImage.update({where:{id:item.id},data:{sortOrder:index}})));
 return NextResponse.json({success:true});
}
