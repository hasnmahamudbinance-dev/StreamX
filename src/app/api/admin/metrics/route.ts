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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Run all independent queries in parallel
    const [
      totalUsers,
      activeUsersCount,
      totalWatchlistItems,
      totalRatings,
      totalReviews,
      totalContentViews,
      avgRatingResult,
      recentSignups,
      unresolvedErrors,
    ] = await Promise.all([
      db.user.count(),

      // Active users: users who have watch history in the last 7 days
      db.watchHistory.findMany({
        where: { watchedAt: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      }),

      db.watchlistItem.count(),

      db.rating.count(),

      db.review.count(),

      db.watchHistory.count(),

      db.rating.aggregate({
        _avg: { score: true },
      }),

      db.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),

      db.errorLog.count({
        where: { resolved: false },
      }),
    ]);

    // Top genres from watchlist (genres stored in overview or via contentType grouping)
    const watchlistByContentType = await db.watchlistItem.groupBy({
      by: ['contentType'],
      _count: { contentType: true },
      orderBy: { _count: { contentType: 'desc' } },
      take: 10,
    });

    // Storage usage summary - uploaded content file sizes
    const storageResult = await db.uploadedContent.aggregate({
      _sum: { videoFileSize: true },
      _count: true,
    });

    // Episode storage
    const episodeStorage = await db.episode.aggregate({
      _sum: { videoFileSize: true },
      _count: true,
    });

    const totalVideoStorage =
      (storageResult._sum.videoFileSize || 0) + (episodeStorage._sum.videoFileSize || 0);
    const totalUploadedContent = storageResult._count;
    const totalEpisodes = episodeStorage._count;

    // Backup storage
    const backupStorage = await db.backup.aggregate({
      _sum: { size: true },
      _count: true,
    });

    const metrics = {
      users: {
        total: totalUsers,
        activeLast7Days: activeUsersCount.length,
        recentSignupsLast7Days: recentSignups,
      },
      content: {
        totalWatchlistItems,
        totalRatings,
        totalReviews,
        totalContentViews,
        averageRating: avgRatingResult._avg.score
          ? Math.round(avgRatingResult._avg.score * 100) / 100
          : null,
      },
      topGenres: watchlistByContentType.map((item) => ({
        contentType: item.contentType,
        count: item._count.contentType,
      })),
      storage: {
        totalVideoStorageBytes: totalVideoStorage,
        totalVideoStorageMB: Math.round(totalVideoStorage / 1024 / 1024),
        uploadedContentCount: totalUploadedContent,
        episodeCount: totalEpisodes,
        backupCount: backupStorage._count,
        backupStorageBytes: backupStorage._sum.size || 0,
        backupStorageMB: Math.round((backupStorage._sum.size || 0) / 1024 / 1024),
      },
      errors: {
        unresolvedCount: unresolvedErrors,
      },
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
