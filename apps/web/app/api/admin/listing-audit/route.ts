import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../src/lib/auth";
import { prisma } from "../../../../src/lib/prisma";
export async function GET() {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"ابتدا وارد حساب شوید."},{status:401});
 if(user.role!=="ADMIN")return NextResponse.json({error:"دسترسی مدیر لازم است."},{status:403});
 const logs=await prisma.listingAuditLog.findMany({orderBy:{createdAt:"desc"},take:300,select:{id:true,listingId:true,listingTitle:true,actorId:true,actorRole:true,action:true,reason:true,before:true,after:true,createdAt:true,actor:{select:{name:true,email:true}}}});
 return NextResponse.json({logs},{headers:{"Cache-Control":"no-store"}});
}
