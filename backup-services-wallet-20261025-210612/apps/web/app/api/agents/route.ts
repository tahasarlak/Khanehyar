import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
export async function GET(){const agents=await prisma.agentProfile.findMany({orderBy:{displayName:"asc"},take:200,select:{id:true,displayName:true,slug:true,city:true,verifiedAt:true}});return NextResponse.json({agents});}
