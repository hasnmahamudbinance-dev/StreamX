import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/behavior - Track user behavior
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();

    const {
      contentId,
      contentType,
      action,
      genres,
      title,
      duration,
      completion,
      device,
      metadata,
    } = body;

    if (!contentId || !contentType || !action) {
      return NextResponse.json(
        { error: 'contentId, contentType, and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['view', 'play', 'complete', 'rate', 'search', 'watchlist_add'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Create behavior record
    const behavior = await db.userBehavior.create({
      data: {
        userId,
        contentId,
        contentType,
        action,
        genres: genres || null,
        title: title || null,
        duration: duration || 0,
        completion: completion || 0,
        device: device || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // If action is "search", also update trending searches
    if (action === 'search' && title) {
      try {
        await db.trendingSearch.upsert({
          where: { query: title },
          update: { count: { increment: 1 } },
          create: { query: title, count: 1 },
        });
      } catch (trendingError) {
        console.warn('Failed to update trending search:', trendingError);
        // Non-critical, don't fail the request
      }
    }

    return NextResponse.json({ behavior }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Behavior tracking error:', message);
    return NextResponse.json(
      { error: 'Failed to track behavior', details: message },
      { status: 500 }
    );
  }
}

// GET /api/behavior - Get user behavior profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const searchParams = req.nextUrl.searchParams;
    const actionFilter = searchParams.get('action') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (actionFilter) {
      where.action = actionFilter;
    }

    // Fetch behaviors
    const behaviors = await db.userBehavior.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    // Aggregate top genres
    const genreMap: Record<string, number> = {};
    const contentTypeMap: Record<string, number> = {};
    const actionMap: Record<string, number> = {};
    const recentTitles: string[] = [];
    const completedTitles: string[] = [];

    for (const b of behaviors) {
      // Count actions
      actionMap[b.action] = (actionMap[b.action] || 0) + 1;

      // Count content types
      contentTypeMap[b.contentType] = (contentTypeMap[b.contentType] || 0) + 1;

      // Parse and count genres
      if (b.genres) {
        const genreIds = b.genres.split(',').map(g => g.trim()).filter(Boolean);
        for (const g of genreIds) {
          genreMap[g] = (genreMap[g] || 0) + 1;
        }
      }

      // Collect recent titles
      if (b.title && !recentTitles.includes(b.title)) {
        recentTitles.push(b.title);
      }

      // Collect completed titles
      if (b.action === 'complete' && b.title) {
        completedTitles.push(b.title);
      }
    }

    // Sort genres by frequency
    const topGenres = Object.entries(genreMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }));

    // Sort content types by frequency
    const preferredContentTypes = Object.entries(contentTypeMap)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));

    // Calculate average completion rate
    const completionBehaviors = behaviors.filter(b => b.completion > 0);
    const avgCompletion =
      completionBehaviors.length > 0
        ? completionBehaviors.reduce((sum, b) => sum + b.completion, 0) / completionBehaviors.length
        : 0;

    // Calculate watch patterns by device
    const deviceMap: Record<string, number> = {};
    for (const b of behaviors) {
      if (b.device) {
        deviceMap[b.device] = (deviceMap[b.device] || 0) + 1;
      }
    }
    const watchPatterns = Object.entries(deviceMap)
      .sort(([, a], [, b]) => b - a)
      .map(([device, count]) => ({ device, count }));

    // Total watch time
    const totalWatchTime = behaviors.reduce((sum, b) => sum + b.duration, 0);

    return NextResponse.json({
      profile: {
        totalActions: behaviors.length,
        topGenres,
        preferredContentTypes,
        watchPatterns,
        avgCompletion: Math.round(avgCompletion * 100) / 100,
        totalWatchTime,
        recentTitles: recentTitles.slice(0, 20),
        completedTitles: completedTitles.slice(0, 20),
        actionBreakdown: actionMap,
      },
      behaviors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Behavior profile error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch behavior profile', details: message },
      { status: 500 }
    );
  }
}
