import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
