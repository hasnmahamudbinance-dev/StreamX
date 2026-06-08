import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const totalUsers = await db.user.count();
    const totalWatchlistItems = await db.watchlistItem.count();
    const totalProgressItems = await db.playbackProgress.count();
    const totalCollections = await db.collection.count();
    const totalNotifications = await db.notification.count();

    const recentUsers = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalWatchlistItems,
        totalProgressItems,
        totalCollections,
        totalNotifications,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
