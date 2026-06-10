import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

// Helper: fetch from TMDB API directly (server-side)
async function tmdbServerFetch(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY || '');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
}

// Genre ID to name mapping (TMDB standard genres)
const GENRE_MAP: Record<string, string> = {
  '28': 'Action', '12': 'Adventure', '16': 'Animation', '35': 'Comedy',
  '80': 'Crime', '99': 'Documentary', '18': 'Drama', '10751': 'Family',
  '14': 'Fantasy', '36': 'History', '27': 'Horror', '10402': 'Music',
  '9648': 'Mystery', '10749': 'Romance', '878': 'Science Fiction',
  '10770': 'TV Movie', '53': 'Thriller', '10752': 'War', '37': 'Western',
  '10759': 'Action & Adventure', '10762': 'Kids', '10763': 'News',
  '10764': 'Reality', '10765': 'Sci-Fi & Fantasy', '10766': 'Soap',
  '10767': 'Talk', '10768': 'War & Politics',
};

// GET /api/recommendations - AI-Powered Recommendations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    // 1. Fetch user's recent behavior data
    const behaviors = await db.userBehavior.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 2. Aggregate user behavior data
    const genreMap: Record<string, number> = {};
    const contentTypeMap: Record<string, number> = {};
    const recentTitles: string[] = [];
    const highlyRatedContent: string[] = [];
    const completedContent: string[] = [];

    for (const b of behaviors) {
      contentTypeMap[b.contentType] = (contentTypeMap[b.contentType] || 0) + 1;

      if (b.genres) {
        const genreIds = b.genres.split(',').map(g => g.trim()).filter(Boolean);
        for (const g of genreIds) {
          genreMap[g] = (genreMap[g] || 0) + 1;
        }
      }

      if (b.title && !recentTitles.includes(b.title)) {
        recentTitles.push(b.title);
      }

      if (b.action === 'rate' && b.completion >= 0.8 && b.title) {
        highlyRatedContent.push(b.title);
      }

      if (b.action === 'complete' && b.title) {
        completedContent.push(b.title);
      }
    }

    // Sort genres by frequency
    const topGenres = Object.entries(genreMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, name: GENRE_MAP[id] || `Genre ${id}`, count }));

    // Determine preferred content type
    const preferredType = Object.entries(contentTypeMap)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'movie';

    // Average completion
    const completionBehaviors = behaviors.filter(b => b.completion > 0);
    const avgCompletion = completionBehaviors.length > 0
      ? completionBehaviors.reduce((sum, b) => sum + b.completion, 0) / completionBehaviors.length
      : 0;

    // 3. If no behavior data, return trending content as fallback
    if (behaviors.length === 0) {
      const [trendingMovies, trendingTv, topRated] = await Promise.all([
        tmdbServerFetch('/trending/movie/week'),
        tmdbServerFetch('/trending/tv/week'),
        tmdbServerFetch('/movie/top_rated'),
      ]);

      return NextResponse.json({
        categories: [
          {
            id: 'trending_for_you',
            title: 'Trending For You',
            items: [...(trendingMovies.results || []), ...(trendingTv.results || [])].slice(0, 20),
          },
          {
            id: 'top_rated',
            title: 'Top Rated',
            items: (topRated.results || []).slice(0, 20),
          },
        ],
      });
    }

    // 4. Use LLM to generate personalized recommendations
    const zai = await ZAI.create();

    const behaviorSummary = {
      topGenres: topGenres.map(g => g.name),
      preferredType,
      avgCompletion: Math.round(avgCompletion * 100),
      recentTitles: recentTitles.slice(0, 10),
      highlyRated: highlyRatedContent.slice(0, 5),
      completedContent: completedContent.slice(0, 5),
    };

    const llmResponse = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a movie and TV recommendation engine. Based on user behavior data, you suggest genre combinations, keywords, and content themes they would enjoy. You must respond ONLY with valid JSON, no markdown, no explanation. The JSON should have this structure:
{
  "because_you_watched": { "title": "A title the user watched recently", "genres": ["genre1", "genre2"], "keywords": "comma-separated tmdb keywords" },
  "trending_for_you": { "genres": ["genre1"], "keywords": "comma-separated keywords for trending content they'd like" },
  "hidden_gems": { "genres": ["genre1"], "keywords": "keywords for lesser-known but high-quality content", "vote_average_gte": 7.0 },
  "new_for_you": { "genres": ["genre1"], "keywords": "keywords for recent releases", "year_gte": 2024 }
}

Use the TMDB genre names: Action, Adventure, Animation, Comedy, Crime, Documentary, Drama, Family, Fantasy, History, Horror, Music, Mystery, Romance, Science Fiction, TV Movie, Thriller, War, Western.

Pick genres that match or complement the user's top genres. Be creative with keyword suggestions.`
        },
        {
          role: 'user',
          content: `User behavior data: ${JSON.stringify(behaviorSummary)}`
        }
      ],
      thinking: { type: 'disabled' },
    });

    let recommendations;
    try {
      const responseText = llmResponse.choices[0]?.message?.content || '{}';
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.warn('Failed to parse LLM response, using fallback');
      recommendations = {
        because_you_watched: { title: recentTitles[0] || 'Popular', genres: topGenres.map(g => g.name).slice(0, 2), keywords: '' },
        trending_for_you: { genres: topGenres.map(g => g.name).slice(0, 2), keywords: '' },
        hidden_gems: { genres: topGenres.map(g => g.name).slice(0, 2), keywords: 'underrated', vote_average_gte: 7.0 },
        new_for_you: { genres: topGenres.map(g => g.name).slice(0, 2), keywords: 'new', year_gte: 2024 },
      };
    }

    // 5. Map genre names back to TMDB genre IDs
    const genreNameToId: Record<string, string> = {};
    for (const [id, name] of Object.entries(GENRE_MAP)) {
      genreNameToId[name.toLowerCase()] = id;
    }

    function getGenreIds(genreNames: string[]): string {
      return genreNames
        .map(name => genreNameToId[name.toLowerCase()])
        .filter(Boolean)
        .join(',');
    }

    // 6. Query TMDB for actual content based on recommendations
    const categories = [];

    // "Because You Watched" category
    try {
      const bywRec = recommendations.because_you_watched || {};
      const bywTitle = bywRec.title || recentTitles[0] || 'Popular';
      const bywGenreIds = getGenreIds(bywRec.genres || topGenres.map(g => g.name).slice(0, 2));
      const bywParams: Record<string, string> = {
        sort_by: 'popularity.desc',
        page: '1',
      };
      if (bywGenreIds) bywParams.with_genres = bywGenreIds;

      const bywMediaType = preferredType === 'tv' ? 'tv' : 'movie';
      const bywData = await tmdbServerFetch(`/discover/${bywMediaType}`, bywParams);

      categories.push({
        id: 'because_you_watched',
        title: `Because You Watched ${bywTitle}`,
        items: (bywData.results || []).slice(0, 20),
      });
    } catch (err) {
      console.warn('Failed to fetch "Because You Watched":', err);
    }

    // "Trending For You" category
    try {
      const tfyRec = recommendations.trending_for_you || {};
      const tfyGenreIds = getGenreIds(tfyRec.genres || topGenres.map(g => g.name).slice(0, 2));
      const tfyMediaType = preferredType === 'tv' ? 'tv' : 'all';
      const tfyData = await tmdbServerFetch(`/trending/${tfyMediaType}/week`);

      // If we have genre preferences, filter the results
      let tfyItems = tfyData.results || [];
      if (tfyGenreIds) {
        const genreIdList = tfyGenreIds.split(',').map(Number);
        tfyItems = tfyItems.filter((item: any) => {
          const itemGenres: number[] = item.genre_ids || [];
          return genreIdList.some(gid => itemGenres.includes(gid));
        });
      }

      categories.push({
        id: 'trending_for_you',
        title: 'Trending For You',
        items: tfyItems.slice(0, 20),
      });
    } catch (err) {
      console.warn('Failed to fetch "Trending For You":', err);
    }

    // "Hidden Gems" category
    try {
      const hgRec = recommendations.hidden_gems || {};
      const hgGenreIds = getGenreIds(hgRec.genres || topGenres.map(g => g.name).slice(0, 2));
      const hgMediaType = preferredType === 'tv' ? 'tv' : 'movie';
      const hgParams: Record<string, string> = {
        sort_by: 'vote_average.desc',
        'vote_count.gte': '100',
        'vote_average.gte': String(hgRec.vote_average_gte || 7.0),
        page: '1',
      };
      if (hgGenreIds) hgParams.with_genres = hgGenreIds;

      const hgData = await tmdbServerFetch(`/discover/${hgMediaType}`, hgParams);

      categories.push({
        id: 'hidden_gems',
        title: 'Hidden Gems',
        items: (hgData.results || []).slice(0, 20),
      });
    } catch (err) {
      console.warn('Failed to fetch "Hidden Gems":', err);
    }

    // "New For You" category
    try {
      const nfyRec = recommendations.new_for_you || {};
      const nfyGenreIds = getGenreIds(nfyRec.genres || topGenres.map(g => g.name).slice(0, 2));
      const nfyMediaType = preferredType === 'tv' ? 'tv' : 'movie';
      const nfyParams: Record<string, string> = {
        sort_by: 'popularity.desc',
        page: '1',
      };
      if (nfyGenreIds) nfyParams.with_genres = nfyGenreIds;

      const year = nfyRec.year_gte || new Date().getFullYear();
      if (nfyMediaType === 'movie') {
        nfyParams['primary_release_date.gte'] = `${year}-01-01`;
      } else {
        nfyParams['first_air_date.gte'] = `${year}-01-01`;
      }

      const nfyData = await tmdbServerFetch(`/discover/${nfyMediaType}`, nfyParams);

      categories.push({
        id: 'new_for_you',
        title: 'New For You',
        items: (nfyData.results || []).slice(0, 20),
      });
    } catch (err) {
      console.warn('Failed to fetch "New For You":', err);
    }

    // If we somehow got no categories, add a fallback
    if (categories.length === 0) {
      try {
        const fallbackData = await tmdbServerFetch('/trending/all/week');
        categories.push({
          id: 'trending_for_you',
          title: 'Trending For You',
          items: (fallbackData.results || []).slice(0, 20),
        });
      } catch {
        categories.push({ id: 'trending_for_you', title: 'Trending For You', items: [] });
      }
    }

    return NextResponse.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Recommendations error:', message);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: message },
      { status: 500 }
    );
  }
}
