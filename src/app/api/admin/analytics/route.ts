import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const totalViews = await db.uploadedContent.aggregate({ _sum: { views: true } });
    const totalWatchTime = await db.uploadedContent.aggregate({ _sum: { watchTime: true } });
    const totalContent = await db.uploadedContent.count();
    const publishedContent = await db.uploadedContent.count({ where: { status: "published" } });
    const totalEpisodes = await db.episode.count();
    const totalAnalyticsEvents = await db.contentAnalytics.count();

    // Popular content
    const popularContent = await db.uploadedContent.findMany({
      where: { status: "published" },
      orderBy: { views: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        views: true,
        watchTime: true,
        posterUrl: true,
      },
    });

    // Recent analytics
    const recentAnalytics = await db.contentAnalytics.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        content: { select: { title: true } },
      },
    });

    // Views by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentViews = await db.contentAnalytics.groupBy({
      by: ["action"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { action: true },
    });

    return NextResponse.json({
      stats: {
        totalViews: totalViews._sum.views || 0,
        totalWatchTime: totalWatchTime._sum.watchTime || 0,
        totalContent,
        publishedContent,
        totalEpisodes,
        totalAnalyticsEvents,
      },
      popularContent,
      recentAnalytics,
      viewsByAction: recentViews,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
