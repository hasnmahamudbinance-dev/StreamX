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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // DAU: users with WatchHistory or ContentAnalytics today
    const [activeWatchHistoryUsers, activeAnalyticsUsers] = await Promise.all([
      db.watchHistory.findMany({
        where: { watchedAt: { gte: todayStart } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      db.contentAnalytics.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const dauSet = new Set<string>();
    for (const item of activeWatchHistoryUsers) {
      if (item.userId) dauSet.add(item.userId);
    }
    for (const item of activeAnalyticsUsers) {
      if (item.userId) dauSet.add(item.userId);
    }
    const dau = dauSet.size;

    // MAU: users with WatchHistory or ContentAnalytics in last 30 days
    const [mauWatchHistoryUsers, mauAnalyticsUsers] = await Promise.all([
      db.watchHistory.findMany({
        where: { watchedAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      db.contentAnalytics.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);

    const mauSet = new Set<string>();
    for (const item of mauWatchHistoryUsers) {
      if (item.userId) mauSet.add(item.userId);
    }
    for (const item of mauAnalyticsUsers) {
      if (item.userId) mauSet.add(item.userId);
    }
    const mau = mauSet.size;

    // Total users count
    const totalUsers = await db.user.count();

    // New users today / this week / this month
    const [newUsersToday, newUsersThisWeek, newUsersThisMonth] = await Promise.all([
      db.user.count({ where: { createdAt: { gte: todayStart } } }),
      db.user.count({ where: { createdAt: { gte: weekStart } } }),
      db.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    // Total watch time (sum of WatchHistory duration)
    const watchTimeResult = await db.watchHistory.aggregate({
      _sum: { duration: true },
    });
    const totalWatchTime = watchTimeResult._sum.duration || 0;

    // Average completion rate (avg of progress/duration from WatchHistory where duration > 0)
    const watchHistoryEntries = await db.watchHistory.findMany({
      where: { duration: { gt: 0 } },
      select: { progress: true, duration: true },
    });

    let avgCompletionRate = 0;
    if (watchHistoryEntries.length > 0) {
      const totalCompletion = watchHistoryEntries.reduce(
        (sum, entry) => sum + (entry.progress / entry.duration) * 100,
        0
      );
      avgCompletionRate = Math.round((totalCompletion / watchHistoryEntries.length) * 100) / 100;
    }

    // Active subscriptions count
    const activeSubscriptions = await db.subscription.count({
      where: { status: { in: ["active", "trial"] } },
    });

    // Total revenue (sum of completed Payments)
    const revenueResult = await db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "completed" },
    });
    const totalRevenue = revenueResult._sum.amount || 0;

    // Churn rate calculation (cancelled subscriptions / total subscriptions * 100)
    const [totalSubscriptions, cancelledSubscriptions] = await Promise.all([
      db.subscription.count(),
      db.subscription.count({ where: { status: "cancelled" } }),
    ]);

    const churnRate = totalSubscriptions > 0
      ? Math.round((cancelledSubscriptions / totalSubscriptions) * 10000) / 100
      : 0;

    // Retention rate (100 - churn rate)
    const retentionRate = Math.round((100 - churnRate) * 100) / 100;

    return NextResponse.json({
      success: true,
      data: {
        dau,
        mau,
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        totalWatchTime,
        avgCompletionRate,
        activeSubscriptions,
        totalRevenue,
        churnRate,
        retentionRate,
      },
    });
  } catch (error) {
    console.error("Admin detailed analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
