import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const history = await db.watchHistory.findMany({
      where: { userId },
      orderBy: { watchedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ items: history });
  } catch (error) {
    console.error("Watch history GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
