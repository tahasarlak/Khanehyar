import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../../src/lib/auth";
import { prisma } from "../../../../../../src/lib/prisma";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){const user=await getCurrentUser();if(!user)return NextResponse.json({error:"ابتدا وارد حساب شوید."},{status:401});const {id}=await context.params;const listing=await prisma.listing.findFirst({where:{id,ownerId:user.id},select:{id:true}});if(!listing&&user.role!=="ADMIN")return NextResponse.json({error:"آگهی پیدا نشد یا اجازه مشاهده ندارید."},{status:404});const logs=await prisma.listingAuditLog.findMany({where:{listingId:id},orderBy:{createdAt:"desc"},take:200,select:{id:true,listingTitle:true,action:true,reason:true,before:true,after:true,createdAt:true,actor:{select:{name:true,email:true}}}});return NextResponse.json({logs},{headers:{"Cache-Control":"no-store"}})}
