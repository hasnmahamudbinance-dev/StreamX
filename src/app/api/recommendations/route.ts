import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";

async function tmdbServerFetch(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY || "");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }

  return response.json();
}

// Helper to deduplicate content by id
function deduplicateById(items: any[]): any[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// Helper to remove already-watched content
function removeWatched(items: any[], watchedIds: Set<string>): any[] {
  return items.filter((item) => !watchedIds.has(String(item.id)));
}

// GET: Get personalized recommendations
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Fetch user data in parallel
    const [highRatings, watchHistory, watchlist, progressItems] =
      await Promise.all([
        // a. Highly-rated content (score >= 7)
        db.rating.findMany({
          where: { userId, score: { gte: 7 } },
          orderBy: { score: "desc" },
          take: 10,
        }),
        // b. Watch history
        db.watchHistory.findMany({
          where: { userId },
          orderBy: { watchedAt: "desc" },
          take: 20,
        }),
        // c. Watchlist
        db.watchlistItem.findMany({
          where: { userId },
          orderBy: { addedAt: "desc" },
          take: 10,
        }),
        // d. Playback progress for "Continue Watching"
        db.playbackProgress.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
      ]);

    // Build set of watched content IDs for filtering
    const watchedIds = new Set<string>(
      watchHistory.map((h) => h.contentId)
    );

    // Also add watchlist items as "known" to deprioritize
    const watchlistIds = new Set<string>(
      watchlist.map((w) => w.contentId)
    );

    // === Section 1: Continue Watching ===
    // From PlaybackProgress - items where position < 90% of duration
    const continueWatchingItems = progressItems.filter(
      (p) => p.duration > 0 && p.position / p.duration < 0.9
    );

    let continueWatching: any[] = [];
    if (continueWatchingItems.length > 0) {
      // Fetch details for each in-progress item from TMDB
      const detailsPromises = continueWatchingItems.map(async (p) => {
        try {
          const data = await tmdbServerFetch(`/${p.contentType}/${p.contentId}`);
          return {
            ...data,
            _progress: p.position,
            _duration: p.duration,
            _contentType: p.contentType,
            _seasonNumber: p.seasonNumber,
            _episodeNumber: p.episodeNumber,
          };
        } catch {
          return null;
        }
      });
      const details = await Promise.all(detailsPromises);
      continueWatching = details.filter(Boolean);
    }

    // === Section 2: Because You Watched ===
    // Based on watch history - get recommendations for recent watches
    let becauseYouWatched: any[] = [];
    if (watchHistory.length > 0) {
      // Pick top 3 most recent unique content items for recommendations
      const recentWatch = watchHistory.slice(0, 3);
      const recPromises = recentWatch.map(async (h) => {
        try {
          const data = await tmdbServerFetch(
            `/${h.contentType}/${h.contentId}/recommendations`
          );
          return data.results || [];
        } catch {
          return [];
        }
      });
      const recResults = await Promise.all(recPromises);
      const allRecs = recResults.flat();
      becauseYouWatched = deduplicateById(removeWatched(allRecs, watchedIds)).slice(0, 20);
    }

    // === Section 3: Recommended For You ===
    // Based on high ratings + watchlist
    let recommendedForYou: any[] = [];
    const contentForRecs = [
      ...highRatings.map((r) => ({
        contentId: r.contentId,
        contentType: r.contentType,
      })),
      ...watchlist.map((w) => ({
        contentId: w.contentId,
        contentType: w.contentType,
      })),
    ];

    if (contentForRecs.length > 0) {
      // Pick top 5 unique items for recommendations
      const uniqueContent = Array.from(
        new Map(
          contentForRecs.map((c) => [`${c.contentId}-${c.contentType}`, c])
        ).values()
      ).slice(0, 5);

      const recPromises = uniqueContent.map(async (c) => {
        try {
          const data = await tmdbServerFetch(
            `/${c.contentType}/${c.contentId}/recommendations`
          );
          return data.results || [];
        } catch {
          return [];
        }
      });

      // Also get similar content
      const similarPromises = uniqueContent.slice(0, 3).map(async (c) => {
        try {
          const data = await tmdbServerFetch(
            `/${c.contentType}/${c.contentId}/similar`
          );
          return data.results || [];
        } catch {
          return [];
        }
      });

      const [recResults, similarResults] = await Promise.all([
        Promise.all(recPromises),
        Promise.all(similarPromises),
      ]);

      const allRecs = [...recResults.flat(), ...similarResults.flat()];
      recommendedForYou = deduplicateById(
        removeWatched(allRecs, watchedIds)
      ).slice(0, 20);
    }

    // === Section 4: Trending Now ===
    let trendingNow: any[] = [];
    try {
      const trendingData = await tmdbServerFetch("/trending/all/week");
      trendingNow = deduplicateById(
        removeWatched(trendingData.results || [], watchedIds)
      ).slice(0, 20);
    } catch {
      // Fallback: try popular movies
      try {
        const popularData = await tmdbServerFetch("/movie/popular");
        trendingNow = deduplicateById(
          removeWatched(popularData.results || [], watchedIds)
        ).slice(0, 20);
      } catch {
        trendingNow = [];
      }
    }

    // Fallback: If user has no history/ratings, fill recommendations with popular content
    if (watchHistory.length === 0 && highRatings.length === 0) {
      try {
        const [popularMovies, popularTv] = await Promise.all([
          tmdbServerFetch("/movie/popular"),
          tmdbServerFetch("/tv/popular"),
        ]);
        const allPopular = [
          ...(popularMovies.results || []),
          ...(popularTv.results || []),
        ];
        recommendedForYou = deduplicateById(allPopular).slice(0, 20);
        becauseYouWatched = [];
      } catch {
        // Keep empty arrays as fallback
      }
    }

    // Remove watchlist items from recommendations (they already know about these)
    const filterOutWatchlist = (items: any[]) =>
      items.filter((item) => !watchlistIds.has(String(item.id)));

    recommendedForYou = filterOutWatchlist(recommendedForYou);
    becauseYouWatched = filterOutWatchlist(becauseYouWatched);

    return NextResponse.json({
      continueWatching: {
        title: "Continue Watching",
        items: continueWatching,
      },
      becauseYouWatched: {
        title: "Because You Watched",
        items: becauseYouWatched,
      },
      recommendedForYou: {
        title: "Recommended For You",
        items: recommendedForYou,
      },
      trendingNow: {
        title: "Trending Now",
        items: trendingNow,
      },
    });
  } catch (error) {
    console.error("Recommendations GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
