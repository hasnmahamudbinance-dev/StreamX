import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/search/history - Get user search history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const effectiveLimit = Math.min(limit, 100);

    const history = await db.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: effectiveLimit,
    });

    return NextResponse.json({
      history: history.map(item => ({
        id: item.id,
        query: item.query,
        type: item.type,
        results: item.results,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Search history error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch search history', details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/search/history - Clear user search history
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    const result = await db.searchHistory.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      message: 'Search history cleared',
      deletedCount: result.count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Clear search history error:', message);
    return NextResponse.json(
      { error: 'Failed to clear search history', details: message },
      { status: 500 }
    );
  }
}
