import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Get current subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
