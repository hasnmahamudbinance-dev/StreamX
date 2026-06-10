'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { useRealtime } from '@/hooks/use-realtime';
import { HeroSection } from './HeroSection';
import { ContentRow } from './ContentRow';
import { ContinueWatchingRow } from './ContinueWatchingRow';
import { HeroSkeleton, ContentRowSkeleton } from './SkeletonComponents';
import { getTrending, getPopular, getTopRated, getNowPlaying, getOnTheAir, getUpcoming } from '@/lib/tmdb';
import { getBanglaPopularMovies, getBanglaPopularTV } from '@/lib/bangla';
import type { TMDBContent, WatchlistItem, ProgressItem, RecommendationCategory } from '@/lib/types';

export function HomePage() {
  const { isAuthenticated } = useAppStore();
  const { emitWatchlistAdd, emitWatchlistRemove } = useRealtime();
  const [trending, setTrending] = useState<TMDBContent[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBContent[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBContent[]>([]);
  const [topRated, setTopRated] = useState<TMDBContent[]>([]);
  const [nowPlaying, setNowPlaying] = useState<TMDBContent[]>([]);
  const [onTheAir, setOnTheAir] = useState<TMDBContent[]>([]);
  const [upcoming, setUpcoming] = useState<TMDBContent[]>([]);
  const [publishedContent, setPublishedContent] = useState<TMDBContent[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationCategory[]>([]);
  const [recsFetched, setRecsFetched] = useState(false);
  const [banglaMovies, setBanglaMovies] = useState<TMDBContent[]>([]);
  const [banglaTV, setBanglaTV] = useState<TMDBContent[]>([]);

  const watchlistIds = new Set(watchlistItems.map(w => `${w.contentType}-${w.contentId}`));

  useEffect(() => {
    Promise.all([
      getTrending('all', 'week').catch(() => ({ results: [] })),
      getPopular('movie').catch(() => ({ results: [] })),
      getPopular('tv').catch(() => ({ results: [] })),
      getTopRated('movie').catch(() => ({ results: [] })),
      getNowPlaying().catch(() => ({ results: [] })),
      getOnTheAir().catch(() => ({ results: [] })),
      getUpcoming().catch(() => ({ results: [] })),
    ]).then(([trendingData, moviesData, tvData, topRatedData, nowPlayingData, onTheAirData, upcomingData]) => {
      setTrending(trendingData.results || []);
      setPopularMovies(moviesData.results || []);
      setPopularTV(tvData.results || []);
      setTopRated(topRatedData.results || []);
      setNowPlaying(nowPlayingData.results || []);
      setOnTheAir(onTheAirData.results || []);
      setUpcoming(upcomingData.results || []);
      setIsLoading(false);
    });

    // Fetch Bangla content in background
    Promise.all([
      getBanglaPopularMovies().catch(() => ({ results: [] })),
      getBanglaPopularTV().catch(() => ({ results: [] })),
    ]).then(([bnMoviesData, bnTVData]) => {
      const filterBn = (items: any[]) => (items as TMDBContent[]).filter(item => {
        const lang = (item as any).original_language;
        return lang === 'bn' || !lang;
      }).filter((item: TMDBContent) => item.poster_path);
      setBanglaMovies(filterBn(bnMoviesData.results || []));
      setBanglaTV(filterBn(bnTVData.results || []));
    });
  }, []);

  useEffect(() => {
    fetch('/api/content/published')
      .then(r => r.json())
      .then(data => {
        if (data.items?.length > 0) {
          const mapped = data.items.map((item: Record<string, unknown>) => ({
            id: `custom-${item.id}`,
            title: item.title as string,
            name: item.title as string,
            overview: (item.description as string) || '',
            poster_path: (item.posterUrl as string) ? (item.posterUrl as string).replace('/uploads/', '') : null,
            backdrop_path: null,
            release_date: (item.releaseDate as string) || '',
            first_air_date: (item.releaseDate as string) || '',
            vote_average: (item.rating as number) || 0,
            vote_count: 0,
            genre_ids: [],
            popularity: 0,
            adult: false,
            original_language: (item.language as string) || 'en',
            media_type: (item.type as string) || 'movie',
          }));
          setPublishedContent(mapped as TMDBContent[]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch('/api/watchlist').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/progress').then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([wlData, pData]) => {
      setWatchlistItems(wlData.items || []);
      setProgressItems(pData.items || []);
    });
  }, [isAuthenticated]);

  // Fetch AI recommendations when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/recommendations')
      .then(r => r.json())
      .then(data => {
        if (data.categories) {
          setRecommendations(data.categories);
        }
      })
      .catch(() => {})
      .finally(() => setRecsFetched(true));
  }, [isAuthenticated]);

  const handleAddToWatchlist = useCallback(async (item: TMDBContent) => {
    if (!isAuthenticated) return;
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: String(item.id),
          contentType: mediaType,
          title: item.title || item.name,
          posterPath: item.poster_path,
          overview: item.overview,
          rating: item.vote_average,
          releaseDate: item.release_date || item.first_air_date,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlistItems(prev => [...prev, data.item]);
        // Emit real-time sync event
        emitWatchlistAdd({
          contentId: String(item.id),
          contentType: mediaType,
          title: item.title || item.name,
          posterPath: item.poster_path || undefined,
        });
      }
    } catch {}
  }, [isAuthenticated, emitWatchlistAdd]);

  const handleRemoveFromWatchlist = useCallback(async (item: TMDBContent) => {
    if (!isAuthenticated) return;
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    try {
      const res = await fetch(`/api/watchlist?contentId=${item.id}&contentType=${mediaType}`, { method: 'DELETE' });
      if (res.ok) {
        setWatchlistItems(prev => prev.filter(w => !(w.contentId === String(item.id) && w.contentType === mediaType)));
        // Emit real-time sync event
        emitWatchlistRemove({
          contentId: String(item.id),
          contentType: mediaType,
        });
      }
    } catch {}
  }, [isAuthenticated, emitWatchlistRemove]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <HeroSkeleton />
        <ContentRowSkeleton />
        <ContentRowSkeleton />
        <ContentRowSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <HeroSection
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {isAuthenticated && progressItems.length > 0 && (
        <ContinueWatchingRow items={progressItems} />
      )}

      <ContentRow
        title="Trending This Week"
        items={trending}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      <ContentRow
        title="Popular Movies"
        items={popularMovies}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      <ContentRow
        title="Now Playing in Theaters"
        items={nowPlaying}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      <ContentRow
        title="Popular TV Shows"
        items={popularTV}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      <ContentRow
        title="On The Air"
        items={onTheAir}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      <ContentRow
        title="Top Rated"
        items={topRated}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      <ContentRow
        title="Upcoming Movies"
        items={upcoming}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {publishedContent.length > 0 && (
        <ContentRow
          title="StreamX Originals"
          items={publishedContent}
          watchlistIds={watchlistIds}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
        />
      )}

      {/* Bangla Content Section */}
      {banglaMovies.length > 0 && (
        <ContentRow
          title="🇧🇩 Popular Bangla Movies"
          items={banglaMovies}
          watchlistIds={watchlistIds}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
        />
      )}
      {banglaTV.length > 0 && (
        <ContentRow
          title="🇧🇩 Popular Bangla Series"
          items={banglaTV}
          watchlistIds={watchlistIds}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
        />
      )}

      {/* AI Recommendations Section */}
      {isAuthenticated && !recsFetched && (
        <>
          <ContentRowSkeleton />
          <ContentRowSkeleton />
        </>
      )}
      {isAuthenticated && recommendations.map(cat => (
        <ContentRow
          key={cat.id}
          title={cat.title}
          items={cat.items}
          watchlistIds={watchlistIds}
          onAddToWatchlist={handleAddToWatchlist}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
        />
      ))}
    </div>
  );
}
