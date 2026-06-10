import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/search/trending - Trending searches
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const effectiveLimit = Math.min(limit, 50);

    const trending = await db.trendingSearch.findMany({
      orderBy: { count: 'desc' },
      take: effectiveLimit,
    });

    return NextResponse.json({
      trending: trending.map(item => ({
        query: item.query,
        count: item.count,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Trending searches error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch trending searches', details: message },
      { status: 500 }
    );
  }
}
