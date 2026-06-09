import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as { role: string }).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // User metrics
    const [
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      usersWith2FA,
      lockedAccounts,
      activeSessions,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { emailVerified: true } }),
      db.user.count({ where: { emailVerified: false } }),
      db.user.count({ where: { twoFactorEnabled: true } }),
      db.user.count({
        where: {
          lockedUntil: { not: null, gt: now },
        },
      }),
      db.userSession.count(),
    ]);

    // Login activity (last 24h)
    const [recentLogins, failedLogins, newDeviceLogins] = await Promise.all([
      db.activityLog.count({
        where: {
          action: "login",
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      db.activityLog.count({
        where: {
          action: "login_failed",
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
      db.activityLog.count({
        where: {
          action: "new_device",
          createdAt: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    // Password resets and email verification requests (last 24h)
    const [passwordResets, emailVerificationRequests] = await Promise.all([
      db.passwordResetCode.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
      db.emailVerificationCode.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    // Recent activity (last 20 entries)
    const recentActivity = await db.activityLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        action: true,
        deviceName: true,
        platform: true,
        browser: true,
        ipAddress: true,
        country: true,
        details: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Login activity over last 7 days (for chart)
    const last7DaysLogins = await db.activityLog.groupBy({
      by: ["action"],
      where: {
        action: { in: ["login", "login_failed", "new_device"] },
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { action: true },
    });

    // Build daily chart data for last 7 days
    const loginChartData: { date: string; successful: number; failed: number; newDevice: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      const [dailySuccessful, dailyFailed, dailyNewDevice] = await Promise.all([
        db.activityLog.count({
          where: {
            action: "login",
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        db.activityLog.count({
          where: {
            action: "login_failed",
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        db.activityLog.count({
          where: {
            action: "new_device",
            createdAt: { gte: dayStart, lt: dayEnd },
          },
        }),
      ]);

      loginChartData.push({
        date: dateStr,
        successful: dailySuccessful,
        failed: dailyFailed,
        newDevice: dailyNewDevice,
      });
    }

    // Recent failed logins (for alerts)
    const recentFailedLogins = await db.activityLog.findMany({
      where: {
        action: "login_failed",
        createdAt: { gte: twentyFourHoursAgo },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        action: true,
        ipAddress: true,
        deviceName: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Locked accounts details
    const lockedAccountsList = await db.user.findMany({
      where: {
        lockedUntil: { not: null, gt: now },
      },
      select: {
        id: true,
        email: true,
        name: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // Password reset requests (last 24h, unused)
    const recentPasswordResets = await db.passwordResetCode.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        used: false,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        used: true,
        createdAt: true,
        expiresAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      usersWith2FA,
      recentLogins,
      failedLogins,
      newDeviceLogins,
      lockedAccounts,
      activeSessions,
      passwordResets,
      emailVerificationRequests,
      recentActivity,
      loginChartData,
      recentFailedLogins,
      lockedAccountsList,
      recentPasswordResets,
    });
  } catch (error) {
    console.error("Admin security error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
