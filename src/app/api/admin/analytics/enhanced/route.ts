import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ─── User Analytics ─────────────────────────────────────────
    const [dauUsers, wauUsers, mauUsers] = await Promise.all([
      // DAU: distinct userIds with behavior in last 24h
      db.userBehavior.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // WAU: distinct userIds with behavior in last 7 days
      db.userBehavior.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      // MAU: distinct userIds with behavior in last 30 days
      db.userBehavior.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const dau = dauUsers.length;
    const wau = wauUsers.length;
    const mau = mauUsers.length;

    // Retention rate: WAU / MAU (week-over-week stickiness)
    const retentionRate = mau > 0 ? Math.round((wau / mau) * 100) / 100 : 0;

    // New users counts
    const [newUsersToday, newUsersThisWeek, newUsersThisMonth] = await Promise.all([
      db.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    // ─── Content Analytics ──────────────────────────────────────
    // Top watched content: group by contentId, count play actions
    const topWatchedRaw = await db.userBehavior.groupBy({
      by: ['contentId', 'contentType', 'title'],
      where: { action: { in: ['play', 'complete'] } },
      _count: { contentId: true },
      _avg: { completion: true },
      orderBy: { _count: { contentId: 'desc' } },
      take: 10,
    });

    const topWatchedContent = topWatchedRaw.map((item) => ({
      contentId: item.contentId,
      contentType: item.contentType,
      title: item.title || 'Unknown',
      viewCount: item._count.contentId,
      avgCompletion: item._avg.completion
        ? Math.round(item._avg.completion * 100) / 100
        : 0,
    }));

    // Top genres from behavior data
    const behaviorWithGenres = await db.userBehavior.findMany({
      where: {
        genres: { not: null },
        action: { in: ['play', 'complete'] },
      },
      select: { genres: true },
    });

    const genreMap = new Map<string, number>();
    for (const b of behaviorWithGenres) {
      if (b.genres) {
        const genreList = b.genres.split(',').map((g) => g.trim()).filter(Boolean);
        for (const genre of genreList) {
          genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
        }
      }
    }
    const topGenres = Array.from(genreMap.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average completion rate across all play/complete events
    const completionAvg = await db.userBehavior.aggregate({
      _avg: { completion: true },
      where: { action: { in: ['play', 'complete'] } },
    });
    const averageCompletionRate = completionAvg._avg.completion
      ? Math.round(completionAvg._avg.completion * 100) / 100
      : 0;

    // ─── Engagement Analytics ───────────────────────────────────
    const [totalPlayEvents, totalCompleteEvents] = await Promise.all([
      db.userBehavior.count({ where: { action: 'play' } }),
      db.userBehavior.count({ where: { action: 'complete' } }),
    ]);

    // Average watch duration for play events
    const durationAvg = await db.userBehavior.aggregate({
      _avg: { duration: true },
      where: { action: { in: ['play', 'complete'] }, duration: { gt: 0 } },
    });
    const averageWatchDuration = durationAvg._avg.duration
      ? Math.round(durationAvg._avg.duration)
      : 0;

    // Peak hours: group behaviors by hour of day
    const allBehaviors = await db.userBehavior.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hourMap.set(h, 0);
    }
    for (const b of allBehaviors) {
      const hour = b.createdAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    }
    const peakHours = Array.from(hourMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    // ─── Search Analytics ───────────────────────────────────────
    const topSearchesRaw = await db.searchHistory.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10,
    });
    const topSearches = topSearchesRaw.map((item) => ({
      query: item.query,
      count: item._count.query,
    }));

    // Zero-result searches
    const zeroResultSearchesRaw = await db.searchHistory.groupBy({
      by: ['query'],
      where: { results: 0 },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10,
    });
    const zeroResultSearches = zeroResultSearchesRaw.map((item) => ({
      query: item.query,
      count: item._count.query,
    }));

    // Search to play rate: searches that led to a play event within same session
    const totalSearches = await db.searchHistory.count();
    // Simplified: ratio of search events in behavior vs play events
    const searchBehaviorCount = await db.userBehavior.count({
      where: { action: 'search' },
    });
    const searchToPlayRate = totalSearches > 0
      ? Math.round((totalPlayEvents / totalSearches) * 100) / 100
      : searchBehaviorCount > 0
        ? Math.round((totalPlayEvents / searchBehaviorCount) * 100) / 100
        : 0;

    // ─── Device Analytics ───────────────────────────────────────
    const allDevices = await db.userDevice.findMany({
      select: { device: true, browser: true },
    });

    const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0 };
    const browserMap = new Map<string, number>();

    for (const d of allDevices) {
      // Device breakdown
      if (d.device === 'desktop') deviceBreakdown.desktop++;
      else if (d.device === 'mobile') deviceBreakdown.mobile++;
      else if (d.device === 'tablet') deviceBreakdown.tablet++;

      // Browser breakdown
      if (d.browser) {
        browserMap.set(d.browser, (browserMap.get(d.browser) || 0) + 1);
      }
    }

    const browserBreakdown = Array.from(browserMap.entries())
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      // User Analytics
      dau,
      wau,
      mau,
      retentionRate,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,

      // Content Analytics
      topWatchedContent,
      topGenres,
      averageCompletionRate,

      // Engagement Analytics
      totalPlayEvents,
      totalCompleteEvents,
      averageWatchDuration,
      peakHours,

      // Search Analytics
      topSearches,
      zeroResultSearches,
      searchToPlayRate,

      // Device Analytics
      deviceBreakdown,
      browserBreakdown,
    });
  } catch (error) {
    console.error('Enhanced analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
