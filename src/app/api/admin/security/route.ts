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
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active user devices (active in last 24h)
    const activeDevices = await db.userDevice.findMany({
      where: { lastActive: { gte: twentyFourHoursAgo } },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { lastActive: 'desc' },
    });

    // Rate limit violations (blocked requests)
    const totalBlockedCount = await db.rateLimitLog.count({
      where: { blocked: true },
    });

    // Recent blocked violations in last 24h
    const recentViolations = await db.rateLimitLog.findMany({
      where: {
        blocked: true,
        windowStart: { gte: twentyFourHoursAgo },
      },
      orderBy: { windowStart: 'desc' },
      take: 50,
    });

    // Top IP addresses by request count (from rate limit logs)
    const topIpsRaw = await db.rateLimitLog.groupBy({
      by: ['ipAddress'],
      _sum: { requests: true },
      _count: { ipAddress: true },
      orderBy: { _sum: { requests: 'desc' } },
      take: 20,
    });

    // Top IPs with blocked count
    const topIpsWithBlocked = await Promise.all(
      topIpsRaw.map(async (ip) => {
        const blockedCount = await db.rateLimitLog.count({
          where: {
            ipAddress: ip.ipAddress,
            blocked: true,
          },
        });
        return {
          ipAddress: ip.ipAddress,
          totalRequests: ip._sum.requests || 0,
          windowCount: ip._count.ipAddress,
          blockedCount,
        };
      })
    );

    // Recent security events (combination of blocked rate limits and new devices)
    const recentNewDevices = await db.userDevice.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Devices per user
    const devicesPerUser = await db.userDevice.groupBy({
      by: ['userId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });

    // Enrich devices per user with user info
    const devicesPerUserEnriched = await Promise.all(
      devicesPerUser.map(async (d) => {
        const user = await db.user.findUnique({
          where: { id: d.userId },
          select: { id: true, name: true, email: true },
        });
        return {
          user,
          deviceCount: d._count.userId,
        };
      })
    );

    return NextResponse.json({
      activeDevices: activeDevices.map((d) => ({
        id: d.id,
        userId: d.userId,
        userName: d.user.name,
        userEmail: d.user.email,
        deviceFingerprint: d.deviceFingerprint,
        browser: d.browser,
        os: d.os,
        device: d.device,
        ipAddress: d.ipAddress,
        lastActive: d.lastActive,
        createdAt: d.createdAt,
      })),
      activeDeviceCount: activeDevices.length,
      rateLimitViolations: {
        total: totalBlockedCount,
        last24h: recentViolations.length,
        recent: recentViolations,
      },
      topIpAddresses: topIpsWithBlocked,
      recentSecurityEvents: {
        newDevices: recentNewDevices.map((d) => ({
          id: d.id,
          userId: d.userId,
          userName: d.user.name,
          deviceFingerprint: d.deviceFingerprint,
          browser: d.browser,
          os: d.os,
          device: d.device,
          ipAddress: d.ipAddress,
          createdAt: d.createdAt,
        })),
        blockedRequests: recentViolations,
      },
      devicesPerUser: devicesPerUserEnriched,
    });
  } catch (error) {
    console.error('Admin security dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
