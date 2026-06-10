import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

// GET /api/search/suggestions - Search suggestions
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '8', 10);
    const effectiveLimit = Math.min(limit, 20);

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: Array<{ text: string; type: 'history' | 'trending' | 'popular' }> = [];
    const seenTexts = new Set<string>();

    // 1. User's search history (if authenticated)
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        const userId = (session.user as any).id as string;
        const historyItems = await db.searchHistory.findMany({
          where: {
            userId,
            query: { contains: query },
          },
          orderBy: { createdAt: 'desc' },
          take: effectiveLimit,
        });

        for (const item of historyItems) {
          if (!seenTexts.has(item.query.toLowerCase())) {
            seenTexts.add(item.query.toLowerCase());
            suggestions.push({ text: item.query, type: 'history' });
          }
        }
      }
    } catch {
      // Auth check failed, continue without history
    }

    // 2. Trending searches
    try {
      const trendingItems = await db.trendingSearch.findMany({
        where: {
          query: { contains: query },
        },
        orderBy: { count: 'desc' },
        take: effectiveLimit,
      });

      for (const item of trendingItems) {
        if (!seenTexts.has(item.query.toLowerCase())) {
          seenTexts.add(item.query.toLowerCase());
          suggestions.push({ text: item.query, type: 'trending' });
        }
      }
    } catch {
      // Trending search failed, continue
    }

    // 3. Popular content titles from TMDB
    try {
      const tmdbUrl = new URL(`${TMDB_BASE_URL}/search/multi`);
      tmdbUrl.searchParams.set('api_key', TMDB_API_KEY || '');
      tmdbUrl.searchParams.set('query', query);
      tmdbUrl.searchParams.set('page', '1');

      const tmdbResponse = await fetch(tmdbUrl.toString(), { next: { revalidate: 300 } });
      if (tmdbResponse.ok) {
        const tmdbData = await tmdbResponse.json();
        const results = tmdbData.results || [];

        for (const item of results) {
          const title = item.title || item.name;
          if (title && !seenTexts.has(title.toLowerCase())) {
            seenTexts.add(title.toLowerCase());
            suggestions.push({ text: title, type: 'popular' });
          }
          if (suggestions.length >= effectiveLimit) break;
        }
      }
    } catch {
      // TMDB search failed, continue
    }

    // Trim to limit
    const finalSuggestions = suggestions.slice(0, effectiveLimit);

    return NextResponse.json({ suggestions: finalSuggestions });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Search suggestions error:', message);
    return NextResponse.json(
      { error: 'Failed to get suggestions', details: message },
      { status: 500 }
    );
  }
}
