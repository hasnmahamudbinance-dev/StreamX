'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Filter, X, Film, Tv } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ContentCard } from './ContentCard';
import { ContentRowSkeleton } from './SkeletonComponents';
import { useAppStore } from '@/lib/store';
import { searchContent, getGenres, discoverContent } from '@/lib/tmdb';
import type { TMDBContent, TMDBGenre } from '@/lib/types';

interface SearchPageProps {
  initialQuery?: string;
  initialType?: string;
}

export function SearchPage({ initialQuery, initialType }: SearchPageProps) {
  const { isAuthenticated } = useAppStore();
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery || '');
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery || '');
  }
  const [results, setResults] = useState<TMDBContent[]>([]);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<'multi' | 'movie' | 'tv'>(initialType === 'tv' ? 'tv' : initialType === 'movie' ? 'movie' : 'multi');
  const [completedKey, setCompletedKey] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [loadMoreFetching, setLoadMoreFetching] = useState(false);

  const hasActiveSearch = !!query.trim() || selectedGenre !== null;
  const requestedKey = `${query.trim()}-${mediaType}-${selectedGenre ?? ''}`;
  const isFetching = hasActiveSearch && requestedKey !== completedKey;

  useEffect(() => {
    getGenres('movie').then(data => setGenres(data.genres || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) return;

    const searchFn = mediaType === 'multi'
      ? searchContent(query, 'multi', 1)
      : searchContent(query, mediaType, 1);

    searchFn
      .then(data => {
        setResults(data.results?.filter((r: TMDBContent) => r.poster_path) || []);
        setTotalPages(data.total_pages || 0);
        setPage(1);
        setCompletedKey(requestedKey);
      })
      .catch(() => { setResults([]); setCompletedKey(requestedKey); });
  }, [query, mediaType]);

  useEffect(() => {
    if (selectedGenre === null) return;
    const type = mediaType === 'multi' ? 'movie' : mediaType;
    discoverContent(type, {
      with_genres: String(selectedGenre),
      sort_by: 'popularity.desc',
    })
      .then(data => {
        setResults(data.results?.filter((r: TMDBContent) => r.poster_path) || []);
        setTotalPages(data.total_pages || 0);
        setCompletedKey(requestedKey);
      })
      .catch(() => { setResults([]); setCompletedKey(requestedKey); });
  }, [selectedGenre, mediaType]);

  const loadMore = useCallback(() => {
    if (loadMoreFetching || page >= totalPages) return;
    setLoadMoreFetching(true);
    const nextPage = page + 1;

    const searchFn = query.trim()
      ? searchContent(query, mediaType === 'multi' ? 'multi' : mediaType, nextPage)
      : discoverContent(mediaType === 'multi' ? 'movie' : mediaType, {
          with_genres: selectedGenre ? String(selectedGenre) : undefined,
          sort_by: 'popularity.desc',
          page: String(nextPage),
        });

    searchFn
      .then(data => {
        setResults(prev => [...prev, ...(data.results?.filter((r: TMDBContent) => r.poster_path) || [])]);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadMoreFetching(false));
  }, [loadMoreFetching, page, totalPages, query, mediaType, selectedGenre]);

  const handleAddToWatchlist = useCallback(async (item: TMDBContent) => {
    if (!isAuthenticated) return;
    const type = item.media_type || (item.title ? 'movie' : 'tv');
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: String(item.id),
          contentType: type,
          title: item.title || item.name,
          posterPath: item.poster_path,
          overview: item.overview,
          rating: item.vote_average,
          releaseDate: item.release_date || item.first_air_date,
        }),
      });
    } catch {}
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies and TV shows..."
            className="pl-9 bg-secondary border-border"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-primary text-primary-foreground' : ''}
        >
          <Filter className="h-4 w-4 mr-2" /> Filters
        </Button>
      </div>

      {/* Media Type Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { value: 'multi' as const, label: 'All', icon: SearchIcon },
          { value: 'movie' as const, label: 'Movies', icon: Film },
          { value: 'tv' as const, label: 'TV Shows', icon: Tv },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setMediaType(tab.value); setSelectedGenre(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              mediaType === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Genre Filters */}
      {showFilters && genres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              selectedGenre === null ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            All Genres
          </button>
          {genres.map(genre => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                selectedGenre === genre.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {isFetching && results.length === 0 ? (
        <ContentRowSkeleton />
      ) : !hasActiveSearch ? (
        <div className="text-center py-20">
          <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Search for content</h3>
          <p className="text-muted-foreground">Type to search movies and TV shows</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {query ? `Results for "${query}"` : selectedGenre ? 'Browsing by genre' : 'Popular content'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {results.map((item, index) => (
              <ContentCard
                key={`${item.id}-${index}`}
                item={item}
                index={index}
                onAddToWatchlist={() => handleAddToWatchlist(item)}
              />
            ))}
          </div>

          {page < totalPages && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" onClick={loadMore} disabled={loadMoreFetching}>
                {loadMoreFetching ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      ) : !isFetching ? (
        <div className="text-center py-20">
          <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results found</h3>
          <p className="text-muted-foreground">Try a different search term or filter</p>
        </div>
      ) : null}
    </div>
  );
}
