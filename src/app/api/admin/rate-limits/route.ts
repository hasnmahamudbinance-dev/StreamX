import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const blockedFilter = searchParams.get('blocked');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '100', 10) || 100, 1), 500);

    const where: Record<string, unknown> = {};
    if (blockedFilter === 'true') {
      where.blocked = true;
    } else if (blockedFilter === 'false') {
      where.blocked = false;
    }

    const [logs, total] = await Promise.all([
      db.rateLimitLog.findMany({
        where,
        orderBy: { windowStart: 'desc' },
        take: limit,
      }),
      db.rateLimitLog.count({ where }),
    ]);

    // Group by IP for summary
    const ipSummary = await db.rateLimitLog.groupBy({
      by: ['ipAddress'],
      where,
      _sum: { requests: true },
      _count: { ipAddress: true },
      _max: { windowStart: true },
      orderBy: { _sum: { requests: 'desc' } },
      take: 20,
    });

    // Count blocked per IP
    const ipSummaryWithBlocked = await Promise.all(
      ipSummary.map(async (ip) => {
        const blockedCount = await db.rateLimitLog.count({
          where: { ipAddress: ip.ipAddress, blocked: true },
        });
        return {
          ipAddress: ip.ipAddress,
          totalRequests: ip._sum.requests || 0,
          windowCount: ip._count.ipAddress,
          blockedCount,
          lastActivity: ip._max.windowStart,
        };
      })
    );

    return NextResponse.json({
      logs,
      total,
      ipSummary: ipSummaryWithBlocked,
    });
  } catch (error) {
    console.error('Rate limits list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
