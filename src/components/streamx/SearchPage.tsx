'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search as SearchIcon,
  Filter,
  X,
  Film,
  Tv,
  Users,
  Mic,
  MicOff,
  Clock,
  Flame,
  Star,
  TrendingUp,
  Loader2,
  Compass,
  PersonStanding,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ContentCard } from './ContentCard';
import { ContentRowSkeleton } from './SkeletonComponents';
import { useAppStore } from '@/lib/store';
import {
  searchContent,
  getGenres,
  discoverContent,
  searchPeople,
  getImageUrl,
  getProfileUrl,
} from '@/lib/tmdb';
import type {
  TMDBContent,
  TMDBGenre,
  TMDBPerson,
  SearchSuggestion,
  TrendingSearchItem,
  SearchHistoryItem,
} from '@/lib/types';
import { BANGLA_SEARCH_FILTERS, type BanglaSearchFilter } from '@/lib/bangla';
import { toast } from 'sonner';

interface SearchPageProps {
  initialQuery?: string;
  initialType?: string;
}

type MediaType = 'multi' | 'movie' | 'tv' | 'person';

export function SearchPage({ initialQuery, initialType }: SearchPageProps) {
  const { isAuthenticated } = useAppStore();

  // ─── Query & Type State ────────────────────────────────
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery || '');
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery || '');
  }

  const [mediaType, setMediaType] = useState<MediaType>(
    initialType === 'tv'
      ? 'tv'
      : initialType === 'movie'
        ? 'movie'
        : initialType === 'person'
          ? 'person'
          : 'multi',
  );

  // ─── Search Results State ──────────────────────────────
  const [results, setResults] = useState<TMDBContent[]>([]);
  const [peopleResults, setPeopleResults] = useState<TMDBPerson[]>([]);
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [completedKey, setCompletedKey] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [loadMoreFetching, setLoadMoreFetching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const hasActiveSearch = !!query.trim() || selectedGenre !== null;
  const requestedKey = `${query.trim()}-${mediaType}-${selectedGenre ?? ''}`;
  const isFetching = hasActiveSearch && requestedKey !== completedKey;

  // ─── Search Suggestions State ──────────────────────────
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Voice Search State ────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Trending Searches State ───────────────────────────
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearchItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // ─── Search History State ──────────────────────────────
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Search Input Focus State ──────────────────────────
  const [isInputFocused, setIsInputFocused] = useState(false);

  // ─── Expanded Person Card State ────────────────────────
  const [expandedPersonId, setExpandedPersonId] = useState<number | null>(null);

  // ─── Bangla Filter State ───────────────────────────────
  const [banglaFilter, setBanglaFilter] = useState<BanglaSearchFilter>('all');

  // ─── Fetch Genres ──────────────────────────────────────
  useEffect(() => {
    getGenres('movie')
      .then((data) => setGenres(data.genres || []))
      .catch(() => {});
  }, []);

  // ─── Fetch Trending Searches ───────────────────────────
  const fetchTrending = useCallback(async () => {
    setTrendingLoading(true);
    try {
      const res = await fetch('/api/search/trending?limit=10');
      const data = await res.json();
      setTrendingSearches(data.trending || []);
    } catch {
      setTrendingSearches([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // ─── Fetch Search History ──────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/search/history?limit=8');
      const data = await res.json();
      setSearchHistory(data.history || []);
    } catch {
      setSearchHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ─── Search Suggestions (debounced) ────────────────────
  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const debouncedFetchSuggestions = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (q: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchSuggestions(q), 300);
    };
  }, [fetchSuggestions]);

  useEffect(() => {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    suggestionsTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);
    return () => {
      if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);
    };
  }, [query, fetchSuggestions]);

  // ─── Track Search Behavior ─────────────────────────────
  const trackSearch = useCallback(
    (searchQuery: string) => {
      if (!isAuthenticated || !searchQuery.trim()) return;
      fetch('/api/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: 'search',
          contentType: 'search',
          action: 'search',
          title: searchQuery,
        }),
      }).catch(() => {});
    },
    [isAuthenticated],
  );

  // ─── Content Search ────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) return;

    if (mediaType === 'person') {
      searchPeople(query, 1)
        .then((data) => {
          setPeopleResults(data.results || []);
          setResults([]);
          setTotalPages(data.total_pages || 0);
          setTotalResults(data.total_results || 0);
          setPage(1);
          setCompletedKey(requestedKey);
          setHasSearched(true);
        })
        .catch(() => {
          setPeopleResults([]);
          setCompletedKey(requestedKey);
          setHasSearched(true);
        });
    } else {
      const searchFn =
        mediaType === 'multi'
          ? searchContent(query, 'multi', 1)
          : searchContent(query, mediaType, 1);

      searchFn
        .then((data) => {
          setResults(
            data.results?.filter((r: TMDBContent) => r.poster_path) || [],
          );
          setPeopleResults([]);
          setTotalPages(data.total_pages || 0);
          setTotalResults(data.total_results || 0);
          setPage(1);
          setCompletedKey(requestedKey);
          setHasSearched(true);
        })
        .catch(() => {
          setResults([]);
          setCompletedKey(requestedKey);
          setHasSearched(true);
        });
    }

    trackSearch(query);
  }, [query, mediaType, trackSearch, requestedKey]);

  // ─── Genre Discovery ──────────────────────────────────
  useEffect(() => {
    if (selectedGenre === null) return;
    const type = mediaType === 'multi' ? 'movie' : mediaType;
    if (mediaType === 'person') return;
    discoverContent(type, {
      with_genres: String(selectedGenre),
      sort_by: 'popularity.desc',
    })
      .then((data) => {
        setResults(
          data.results?.filter((r: TMDBContent) => r.poster_path) || [],
        );
        setTotalPages(data.total_pages || 0);
        setTotalResults(data.total_results || 0);
        setCompletedKey(requestedKey);
        setHasSearched(true);
      })
      .catch(() => {
        setResults([]);
        setCompletedKey(requestedKey);
        setHasSearched(true);
      });
  }, [selectedGenre, mediaType, requestedKey]);

  // ─── Load More ─────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (loadMoreFetching || page >= totalPages) return;
    setLoadMoreFetching(true);
    const nextPage = page + 1;

    if (mediaType === 'person' && query.trim()) {
      searchPeople(query, nextPage)
        .then((data) => {
          setPeopleResults((prev) => [...prev, ...(data.results || [])]);
          setPage(nextPage);
        })
        .catch(() => {})
        .finally(() => setLoadMoreFetching(false));
    } else {
      const searchFn = query.trim()
        ? searchContent(
            query,
            mediaType === 'multi' ? 'multi' : mediaType,
            nextPage,
          )
        : discoverContent(mediaType === 'multi' ? 'movie' : mediaType, {
            with_genres: selectedGenre ? String(selectedGenre) : undefined,
            sort_by: 'popularity.desc',
            page: String(nextPage),
          });

      searchFn
        .then((data) => {
          setResults((prev) => [
            ...prev,
            ...(data.results?.filter((r: TMDBContent) => r.poster_path) || []),
          ]);
          setPage(nextPage);
        })
        .catch(() => {})
        .finally(() => setLoadMoreFetching(false));
    }
  }, [loadMoreFetching, page, totalPages, query, mediaType, selectedGenre]);

  // ─── Add to Watchlist ──────────────────────────────────
  const handleAddToWatchlist = useCallback(
    async (item: TMDBContent) => {
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
    },
    [isAuthenticated],
  );

  // ─── Voice Search ──────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessingVoice(true);
          try {
            const res = await fetch('/api/search/voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio }),
            });
            const data = await res.json();
            if (data.text) {
              setQuery(data.text);
              toast.success(`Voice search: "${data.text}"`);
            } else if (data.error) {
              toast.error(data.error);
            }
          } catch {
            toast.error('Failed to process voice search');
          } finally {
            setIsProcessingVoice(false);
          }
        };
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setShowSuggestions(false);

      // Auto-stop after 10s
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 10000);
    } catch {
      toast.error('Microphone access denied or not supported');
    }
  }, [stopRecording]);

  // ─── Suggestion Click ──────────────────────────────────
  const handleSuggestionClick = useCallback(
    (text: string) => {
      setQuery(text);
      setShowSuggestions(false);
      inputRef.current?.blur();
    },
    [],
  );

  // ─── Clear History ─────────────────────────────────────
  const handleClearHistory = useCallback(async () => {
    try {
      await fetch('/api/search/history', { method: 'DELETE' });
      setSearchHistory([]);
      toast.success('Search history cleared');
    } catch {
      toast.error('Failed to clear search history');
    }
  }, []);

  // ─── Genre Name Lookup ─────────────────────────────────
  const genreMap = useMemo(() => {
    const map = new Map<number, string>();
    genres.forEach((g) => map.set(g.id, g.name));
    return map;
  }, [genres]);

  // ─── Should show suggestions overlay ───────────────────
  const shouldShowDropdown =
    isInputFocused &&
    !isRecording &&
    (query.trim()
      ? suggestions.length > 0 || suggestionsLoading
      : searchHistory.length > 0 || trendingSearches.length > 0);

  // ─── Tab Config ────────────────────────────────────────
  const tabs: { value: MediaType; label: string; icon: React.ElementType }[] = [
    { value: 'multi', label: 'All', icon: SearchIcon },
    { value: 'movie', label: 'Movies', icon: Film },
    { value: 'tv', label: 'TV Shows', icon: Tv },
    { value: 'person', label: 'People', icon: Users },
  ];

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* ─── Search Bar Section ──────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              // Delay to allow click on suggestions
              setTimeout(() => setIsInputFocused(false), 200);
            }}
            placeholder="Search movies, TV shows, people..."
            className="pl-9 pr-20 bg-secondary border-border"
          />

          {/* Right side buttons inside input */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Voice search button */}
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="relative p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
                aria-label="Stop recording"
              >
                <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <MicOff className="h-4 w-4 text-red-500 relative z-10" />
              </button>
            ) : isProcessingVoice ? (
              <div className="p-1.5" aria-label="Processing voice">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                aria-label="Voice search"
              >
                <Mic className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            )}

            {/* Clear query button */}
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* ─── Suggestions Dropdown ────────────────────── */}
          <AnimatePresence>
            {shouldShowDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden"
              >
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {/* When query is empty: show history + trending */}
                  {!query.trim() ? (
                    <>
                      {/* Recent Searches */}
                      {isAuthenticated && searchHistory.length > 0 && (
                        <div className="p-2">
                          <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Recent Searches
                            </span>
                            <button
                              onClick={handleClearHistory}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                          {searchHistory.map((item) => (
                            <button
                              key={item.id}
                              onMouseDown={() => handleSuggestionClick(item.query)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                            >
                              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{item.query}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Trending Searches */}
                      {trendingSearches.length > 0 && (
                        <div className="p-2 border-t border-border">
                          <div className="px-2 py-1.5">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Trending
                            </span>
                          </div>
                          {trendingSearches.map((item, idx) => (
                            <button
                              key={`${item.query}-${idx}`}
                              onMouseDown={() => handleSuggestionClick(item.query)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                            >
                              <Flame className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                              <span className="text-sm truncate">{item.query}</span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {item.count > 100
                                  ? `${(item.count / 1000).toFixed(1)}k`
                                  : item.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* When query has text: show suggestions */}
                      {suggestionsLoading && (
                        <div className="p-4 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!suggestionsLoading && suggestions.length > 0 && (
                        <div className="p-2">
                          {suggestions.map((suggestion, idx) => (
                            <button
                              key={`${suggestion.text}-${idx}`}
                              onMouseDown={() =>
                                handleSuggestionClick(suggestion.text)
                              }
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                            >
                              {suggestion.type === 'history' && (
                                <Clock className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                              )}
                              {suggestion.type === 'trending' && (
                                <Flame className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                              )}
                              {suggestion.type === 'popular' && (
                                <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                              )}
                              <span className="text-sm truncate">
                                {suggestion.text}
                              </span>
                              {suggestion.type === 'history' && (
                                <Badge
                                  variant="secondary"
                                  className="ml-auto text-[10px]"
                                >
                                  History
                                </Badge>
                              )}
                              {suggestion.type === 'trending' && (
                                <Badge
                                  variant="secondary"
                                  className="ml-auto text-[10px] bg-orange-500/10 text-orange-500 border-orange-500/20"
                                >
                                  Trending
                                </Badge>
                              )}
                              {suggestion.type === 'popular' && (
                                <Badge
                                  variant="secondary"
                                  className="ml-auto text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                >
                                  Popular
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      {!suggestionsLoading && suggestions.length === 0 && query.trim() && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No suggestions found
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter button */}
        {mediaType !== 'person' && (
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-primary text-primary-foreground' : ''}
          >
            <Filter className="h-4 w-4 mr-2" /> Filters
          </Button>
        )}
      </div>

      {/* ─── Voice Recording Indicator ───────────────────── */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm text-red-500 font-medium">
                Recording... Click stop or wait up to 10s
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={stopRecording}
                className="ml-auto border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <MicOff className="h-3 w-3 mr-1" /> Stop
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Trending Searches Pills (when input empty & focused) ── */}
      <AnimatePresence>
        {isInputFocused &&
          !query.trim() &&
          trendingSearches.length > 0 &&
          !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <TrendingUp className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground font-medium">
                  Trending:
                </span>
                {trendingSearches.slice(0, 8).map((item, idx) => (
                  <button
                    key={`${item.query}-${idx}`}
                    onClick={() => handleSuggestionClick(item.query)}
                    className="px-3 py-1 rounded-full bg-secondary/80 text-xs text-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* ─── Media Type Tabs ──────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setMediaType(tab.value);
              setSelectedGenre(null);
              setHasSearched(false);
              setCompletedKey('');
            }}
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

      {/* ─── Bangla Search Filters ───────────────────────── */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Globe className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        {BANGLA_SEARCH_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => {
              setBanglaFilter(filter.value);
              if (filter.value === 'hoichoi') {
                setQuery('Hoichoi');
                setMediaType('multi');
              } else if (filter.value === 'chorki') {
                setQuery('Chorki');
                setMediaType('multi');
              } else if (filter.value === 'bangla') {
                setQuery('Bengali');
                setMediaType('multi');
              } else if (filter.value === 'actors') {
                setMediaType('person');
                if (!query.trim()) setQuery('Bengali actor');
              } else if (filter.value === 'movies') {
                setMediaType('movie');
                if (!query.trim() || query === 'Bengali actor') setQuery('Bengali');
              } else if (filter.value === 'tv') {
                setMediaType('tv');
                if (!query.trim() || query === 'Bengali actor') setQuery('Bengali');
              }
              setHasSearched(false);
              setCompletedKey('');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors whitespace-nowrap ${
              banglaFilter === filter.value
                ? 'bg-emerald-600 text-white'
                : 'bg-secondary/80 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>

      {/* ─── Genre Filters ───────────────────────────────── */}
      <AnimatePresence>
        {showFilters && mediaType !== 'person' && genres.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="flex flex-wrap gap-2 p-3 bg-secondary/50 rounded-lg">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedGenre === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                All Genres
              </button>
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`px-3 py-1 rounded-full text-xs transition-colors ${
                    selectedGenre === genre.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Results ──────────────────────────────────────── */}
      {isFetching && results.length === 0 && peopleResults.length === 0 ? (
        <ContentRowSkeleton />
      ) : !hasActiveSearch && !hasSearched ? (
        /* ─── Default Empty State ──────────────────────── */
        <div className="text-center py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Compass className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">
              Discover something amazing
            </h3>
            <p className="text-muted-foreground mb-6">
              Search for movies, TV shows, or people
            </p>

            {/* Quick genre browse */}
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
                <span className="text-sm text-muted-foreground">
                  Browse genres:
                </span>
                {genres.slice(0, 8).map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => {
                      setSelectedGenre(genre.id);
                      setMediaType('movie');
                    }}
                    className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            )}

            {/* Voice search prompt */}
            <p className="text-xs text-muted-foreground mt-6">
              <Mic className="h-3 w-3 inline mr-1" />
              Try voice search by clicking the microphone icon
            </p>
          </motion.div>
        </div>
      ) : mediaType === 'person' ? (
        /* ─── People Results ───────────────────────────── */
        <>
          {query.trim() && totalResults > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
            </p>
          )}

          {peopleResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {peopleResults.map((person, index) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(index * 0.05, 0.5),
                  }}
                >
                  <Card
                    className="bg-secondary/50 border-border hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                    onClick={() =>
                      setExpandedPersonId(
                        expandedPersonId === person.id ? null : person.id,
                      )
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Profile Photo */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
                            <img
                              src={getProfileUrl(person.profile_path)}
                              alt={person.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  '/placeholder-avatar.svg';
                              }}
                            />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {person.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {person.known_for_department}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-muted-foreground">
                              Popularity: {person.popularity.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Expand indicator */}
                        <div className="flex-shrink-0">
                          <PersonStanding className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Known For (expanded) */}
                      <AnimatePresence>
                        {expandedPersonId === person.id &&
                          person.known_for &&
                          person.known_for.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Known for:
                                </p>
                                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                  {person.known_for
                                    .filter((k) => k.poster_path)
                                    .slice(0, 5)
                                    .map((item) => {
                                      const title =
                                        'title' in item
                                          ? item.title
                                          : 'name' in item
                                            ? item.name
                                            : 'Unknown';
                                      const year = 'release_date' in item
                                        ? (item as any).release_date
                                        : 'first_air_date' in item
                                          ? (item as any).first_air_date
                                          : '';
                                      return (
                                        <div
                                          key={item.id}
                                          className="flex-shrink-0 w-[60px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <div className="aspect-[2/3] rounded overflow-hidden bg-muted">
                                            <img
                                              src={getImageUrl(
                                                item.poster_path,
                                                'w185',
                                              )}
                                              alt={title}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                  '/placeholder-poster.svg';
                                              }}
                                            />
                                          </div>
                                          <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                            {title}
                                          </p>
                                          {year && (
                                            <p className="text-[9px] text-muted-foreground">
                                              {String(year).split('-')[0]}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            hasSearched &&
            !isFetching && (
              /* ─── No People Results ───────────────────── */
              <div className="text-center py-20">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No people found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try a different search term
                </p>
                {trendingSearches.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Did you mean:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {trendingSearches.slice(0, 5).map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(item.query)}
                          className="px-3 py-1 rounded-full bg-secondary text-xs text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {item.query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Load More for People */}
          {peopleResults.length > 0 && page < totalPages && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadMoreFetching}
              >
                {loadMoreFetching ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      ) : results.length > 0 ? (
        /* ─── Content Results ──────────────────────────── */
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {query
              ? `${totalResults.toLocaleString()} result${totalResults !== 1 ? 's' : ''} for "${query}"`
              : selectedGenre
                ? `Browsing ${genreMap.get(selectedGenre) || 'genre'}`
                : 'Popular content'}
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
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadMoreFetching}
              >
                {loadMoreFetching ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      ) : (
        /* ─── No Content Results ───────────────────────── */
        hasSearched &&
        !isFetching && (
          <div className="text-center py-20">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              Try a different search term or filter
            </p>
            {trendingSearches.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  Did you mean:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {trendingSearches.slice(0, 5).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(item.query)}
                      className="px-3 py-1 rounded-full bg-secondary text-xs text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {item.query}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {genres.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Browse genres instead:
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                  {genres.slice(0, 8).map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => {
                        setSelectedGenre(genre.id);
                        setMediaType('movie');
                      }}
                      className="px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors border border-border"
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ─── Custom scrollbar styles ──────────────────────── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
}
