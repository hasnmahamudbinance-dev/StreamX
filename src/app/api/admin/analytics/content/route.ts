import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Most watched movies (top 10 from UploadedContent by views where type='movie')
    const mostWatchedMovies = await db.uploadedContent.findMany({
      where: { type: "movie" },
      orderBy: { views: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        views: true,
        watchTime: true,
        posterUrl: true,
        rating: true,
        genres: true,
        createdAt: true,
      },
    });

    // Most watched TV shows (top 10 from UploadedContent by views where type='tv')
    const mostWatchedTV = await db.uploadedContent.findMany({
      where: { type: "tv" },
      orderBy: { views: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
        views: true,
        watchTime: true,
        posterUrl: true,
        rating: true,
        genres: true,
        createdAt: true,
      },
    });

    // Top genres (from UploadedContent genres field, comma-separated)
    const allContent = await db.uploadedContent.findMany({
      where: { genres: { not: null } },
      select: { genres: true, views: true },
    });

    const genreMap: Record<string, number> = {};
    for (const content of allContent) {
      if (content.genres) {
        const genres = content.genres.split(",").map((g) => g.trim()).filter(Boolean);
        for (const genre of genres) {
          genreMap[genre] = (genreMap[genre] || 0) + (content.views || 1);
        }
      }
    }

    const topGenres = Object.entries(genreMap)
      .sort(([, a], [, b]) => b - a)
      .map(([genre, viewScore]) => ({ genre, viewScore }));

    // Recent analytics events (last 100 ContentAnalytics entries)
    const recentEvents = await db.contentAnalytics.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        content: {
          select: { title: true, type: true },
        },
      },
    });

    // Watch time by day (last 30 days from ContentAnalytics)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analyticsLast30Days = await db.contentAnalytics.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        action: { in: ["play", "complete"] },
      },
      select: {
        createdAt: true,
        duration: true,
      },
    });

    // Group by day
    const watchTimeByDayMap: Record<string, number> = {};
    for (const event of analyticsLast30Days) {
      const dayKey = event.createdAt.toISOString().split("T")[0];
      watchTimeByDayMap[dayKey] = (watchTimeByDayMap[dayKey] || 0) + (event.duration || 0);
    }

    // Fill in missing days with 0
    const watchTimeByDay: { date: string; watchTime: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split("T")[0];
      watchTimeByDay.push({
        date: dayKey,
        watchTime: watchTimeByDayMap[dayKey] || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        mostWatchedMovies,
        mostWatchedTV,
        topGenres,
        recentEvents,
        watchTimeByDay,
      },
    });
  } catch (error) {
    console.error("Admin content analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
