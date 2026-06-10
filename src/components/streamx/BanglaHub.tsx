'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Star, ChevronRight, Loader2, Film, Tv, Users,
  Globe, Sparkles, ArrowRight, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentRow } from './ContentRow';
import { ContentCard } from './ContentCard';
import { ContentRowSkeleton } from './SkeletonComponents';
import { useAppStore } from '@/lib/store';
import { getImageUrl, getBackdropUrl, getProfileUrl, getMediaType, getContentTitle, getContentDate } from '@/lib/tmdb';
import {
  getBanglaTrending,
  getBanglaPopularMovies,
  getBanglaPopularTV,
  getBanglaTopRatedMovies,
  getBanglaTopRatedTV,
  getBangladeshMovies,
  getKolkataMovies,
  BANGLA_COLLECTIONS,
  FEATURED_BANGLA_ACTORS,
  OTT_PLATFORMS,
  detectOTTPlatforms,
  getOTTForTitle,
  type BanglaCollection,
  type FeaturedActor,
  type OTTPlatform,
} from '@/lib/bangla';
import { searchPeople } from '@/lib/tmdb';
import type { TMDBContent, TMDBPerson } from '@/lib/types';

// ─── OTT Badge Component ───────────────────────────────────────

function OTTBadge({ platform, size = 'sm' }: { platform: OTTPlatform; size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses = {
    xs: 'px-1 py-0 text-[8px]',
    sm: 'px-1.5 py-0.5 text-[9px]',
    md: 'px-2 py-0.5 text-[10px]',
  };

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-bold rounded ${platform.color} text-white ${sizeClasses[size]}`}
    >
      {size !== 'xs' && <span>{platform.icon}</span>}
      {platform.shortName}
    </span>
  );
}

// ─── OTT Badges Row ────────────────────────────────────────────

export function OTTBadges({ title, size = 'sm' }: { title: string; size?: 'xs' | 'sm' | 'md' }) {
  const platforms = getOTTForTitle(title);
  if (platforms.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {platforms.map(p => (
        <OTTBadge key={p.id} platform={p} size={size} />
      ))}
    </div>
  );
}

// ─── Smart OTT Badges (heuristic detection) ────────────────────

export function SmartOTTBadges({ item, size = 'sm' }: { 
  item: { title?: string; name?: string; overview?: string; production_companies?: { name: string }[] };
  size?: 'xs' | 'sm' | 'md';
}) {
  const platforms = detectOTTPlatforms(item);
  if (platforms.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {platforms.map(p => (
        <OTTBadge key={p.id} platform={p} size={size} />
      ))}
    </div>
  );
}

// ─── Bangla Hero Section ───────────────────────────────────────

function BanglaHero({ items }: { items: TMDBContent[] }) {
  const { navigate } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const item = items[currentIndex];
  const mediaType = getMediaType(item);
  const title = getContentTitle(item);
  const date = getContentDate(item);
  const ottBadges = getOTTForTitle(title);

  return (
    <div className="relative h-[50vh] sm:h-[60vh] overflow-hidden rounded-xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={getBackdropUrl(item.backdrop_path)}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-backdrop.svg'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-[15%] left-4 sm:left-8 right-4 sm:right-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded">
                🇧🇩 BANGLA
              </span>
              {date && <span className="text-sm text-gray-300">{date.split('-')[0]}</span>}
              {item.vote_average > 0 && (
                <span className="flex items-center gap-1 text-sm text-yellow-400">
                  <Star className="h-3.5 w-3.5 fill-yellow-400" /> {item.vote_average.toFixed(1)}
                </span>
              )}
              {ottBadges.map(p => (
                <OTTBadge key={p.id} platform={p} size="sm" />
              ))}
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-2 max-w-2xl">{title}</h1>
            <p className="text-sm text-gray-300 max-w-xl line-clamp-2 mb-4">
              {item.overview}
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(mediaType as 'movie' | 'tv', { id: String(item.id), autoplay: '1' })}
                className="bg-white text-black hover:bg-white/90 gap-2"
              >
                <Play className="h-4 w-4 fill-black" /> Play
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(mediaType as 'movie' | 'tv', { id: String(item.id) })}
                className="border-white/30 bg-white/10 hover:bg-white/20 text-white gap-2"
              >
                More Info
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-8 bg-emerald-500' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Collection Card ───────────────────────────────────────────

function CollectionCard({ collection, onClick }: { collection: BanglaCollection; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${collection.gradient} border border-border/50 cursor-pointer p-4 sm:p-5 min-w-[200px] sm:min-w-[240px]`}
    >
      <div className="text-3xl mb-2">{collection.icon}</div>
      <h3 className="font-bold text-sm sm:text-base">{collection.title}</h3>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{collection.description}</p>
      <ChevronRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground" />
    </motion.div>
  );
}

// ─── Actor Card ────────────────────────────────────────────────

function ActorCard({ actor, personData }: { actor: FeaturedActor; personData?: TMDBPerson }) {
  const { navigate } = useAppStore();

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="flex-shrink-0 w-[130px] sm:w-[150px] cursor-pointer group"
      onClick={() => navigate('search', { query: actor.name, type: 'person' })}
    >
      <div className="relative w-full aspect-square rounded-full overflow-hidden bg-muted mx-auto">
        {personData?.profile_path ? (
          <img
            src={getProfileUrl(personData.profile_path)}
            alt={actor.name}
            className="w-full h-full object-cover group-hover:brightness-75 transition-all"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.svg'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Users className="h-8 w-8 text-primary/40" />
          </div>
        )}
      </div>
      <p className="text-xs font-medium mt-2 text-center truncate">{actor.name}</p>
      <p className="text-[10px] text-muted-foreground text-center line-clamp-1">{actor.knownFor}</p>
    </motion.div>
  );
}

// ─── OTT Platform Showcase ─────────────────────────────────────

function OTTShowcase() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <h2 className="text-lg sm:text-xl font-bold">Available On</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 content-row">
        {OTT_PLATFORMS.map(platform => (
          <motion.div
            key={platform.id}
            whileHover={{ scale: 1.05 }}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-br ${platform.color}/20 border ${platform.borderColor} cursor-pointer`}
            onClick={() => {
              // Navigate to search with platform name
              const store = useAppStore.getState();
              store.navigate('search', { query: platform.name === 'Hoichoi' ? 'Hoichoi' : platform.name === 'Chorki' ? 'Chorki' : 'Bengali' });
            }}
          >
            <span className="text-xl">{platform.icon}</span>
            <div>
              <p className="text-sm font-bold">{platform.name}</p>
              <p className="text-[10px] text-muted-foreground">Originals & More</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Main BanglaHub Component ──────────────────────────────────

export function BanglaHub() {
  const { navigate, isAuthenticated } = useAppStore();

  // Content state
  const [trending, setTrending] = useState<TMDBContent[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBContent[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBContent[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBContent[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<TMDBContent[]>([]);
  const [bangladeshMovies, setBangladeshMovies] = useState<TMDBContent[]>([]);
  const [kolkataMovies, setKolkataMovies] = useState<TMDBContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Collection expanded state
  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);
  const [collectionItems, setCollectionItems] = useState<TMDBContent[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);

  // Actor data
  const [actorData, setActorData] = useState<Map<string, TMDBPerson>>(new Map());
  const [actorsLoading, setActorsLoading] = useState(true);

  // Watchlist state
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

  // Fetch main content
  useEffect(() => {
    Promise.all([
      getBanglaTrending().catch(() => ({ results: [] })),
      getBanglaPopularMovies().catch(() => ({ results: [] })),
      getBanglaPopularTV().catch(() => ({ results: [] })),
      getBanglaTopRatedMovies().catch(() => ({ results: [] })),
      getBanglaTopRatedTV().catch(() => ({ results: [] })),
      getBangladeshMovies().catch(() => ({ results: [] })),
      getKolkataMovies().catch(() => ({ results: [] })),
    ]).then(([trendingData, moviesData, tvData, topMoviesData, topTVData, bdData, kolData]) => {
      // Filter for Bangla content (original_language = 'bn')
      const filterBangla = (items: any[]) =>
        (items as TMDBContent[]).filter(item => {
          const lang = (item as any).original_language;
          return lang === 'bn' || !lang; // Keep if Bangla or no language info
        });

      setTrending(filterBangla(trendingData.results || []).filter((item: TMDBContent) => item.backdrop_path).slice(0, 10));
      setPopularMovies(filterBangla((moviesData.results || []).filter((r: TMDBContent) => r.poster_path)));
      setPopularTV(filterBangla((tvData.results || []).filter((r: TMDBContent) => r.poster_path)));
      setTopRatedMovies(filterBangla((topMoviesData.results || []).filter((r: TMDBContent) => r.poster_path)));
      setTopRatedTV(filterBangla((topTVData.results || []).filter((r: TMDBContent) => r.poster_path)));
      setBangladeshMovies(filterBangla((bdData.results || []).filter((r: TMDBContent) => r.poster_path)));
      setKolkataMovies(filterBangla((kolData.results || []).filter((r: TMDBContent) => r.poster_path)));
      setIsLoading(false);
    });
  }, []);

  // Fetch actor data
  useEffect(() => {
    const fetchActors = async () => {
      setActorsLoading(true);
      const actorMap = new Map<string, TMDBPerson>();
      
      // Fetch top 6 actors in parallel
      const promises = FEATURED_BANGLA_ACTORS.slice(0, 6).map(async (actor) => {
        try {
          const data = await searchPeople(actor.tmdbQuery, 1);
          const person = (data.results || [])[0];
          if (person) {
            actorMap.set(actor.name, person);
          }
        } catch {}
      });

      await Promise.all(promises);
      setActorData(actorMap);
      setActorsLoading(false);
    };

    fetchActors();
  }, []);

  // Fetch watchlist
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => {
        const items = data.items || [];
        setWatchlistIds(new Set(items.map((w: any) => `${w.contentType}-${w.contentId}`)));
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Handle collection expansion
  const handleCollectionClick = useCallback(async (collection: BanglaCollection) => {
    if (expandedCollection === collection.id) {
      setExpandedCollection(null);
      setCollectionItems([]);
      return;
    }

    setExpandedCollection(collection.id);
    setCollectionLoading(true);
    try {
      const data = await collection.fetchFn();
      const banglaItems = (data.results || [])
        .filter((r: TMDBContent) => r.poster_path)
        .filter((item: any) => !item.original_language || item.original_language === 'bn');
      setCollectionItems(banglaItems);
    } catch {
      setCollectionItems([]);
    } finally {
      setCollectionLoading(false);
    }
  }, [expandedCollection]);

  // Watchlist handlers
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
        setWatchlistIds(prev => new Set([...prev, `${mediaType}-${item.id}`]));
      }
    } catch {}
  }, [isAuthenticated]);

  const handleRemoveFromWatchlist = useCallback(async (item: TMDBContent) => {
    if (!isAuthenticated) return;
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    try {
      const res = await fetch(`/api/watchlist?contentId=${item.id}&contentType=${mediaType}`, { method: 'DELETE' });
      if (res.ok) {
        setWatchlistIds(prev => {
          const next = new Set(prev);
          next.delete(`${mediaType}-${item.id}`);
          return next;
        });
      }
    } catch {}
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <ContentRowSkeleton />
        <ContentRowSkeleton />
        <ContentRowSkeleton />
        <ContentRowSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Hero — Featured Bangla Content */}
      {trending.length > 0 && <BanglaHero items={trending} />}

      {/* Section Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🇧🇩</span>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Bangla Entertainment Hub</h2>
            <p className="text-sm text-muted-foreground">Hoichoi • Chorki • Bangla Movies & Series</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('search', { query: 'Bengali', type: 'multi' })}
          className="gap-2"
        >
          <Search className="h-4 w-4" /> Search Bangla
        </Button>
      </div>

      {/* Popular Bangla Movies */}
      <ContentRow
        title="🎬 Popular Bangla Movies"
        items={popularMovies}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {/* Popular Bangla Series */}
      <ContentRow
        title="📺 Popular Bangla Series"
        items={popularTV}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {/* OTT Platform Showcase */}
      <OTTShowcase />

      {/* Top Rated Bangla Movies */}
      <ContentRow
        title="⭐ Top Rated Bangla Movies"
        items={topRatedMovies}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {/* Top Rated Bangla TV */}
      <ContentRow
        title="🏆 Top Rated Bangla Series"
        items={topRatedTV}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {/* Bangladesh Cinema */}
      <ContentRow
        title="🇧🇩 Bangladesh Cinema"
        items={bangladeshMovies}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {/* Kolkata Cinema */}
      <ContentRow
        title="🎭 Kolkata Cinema"
        items={kolkataMovies}
        watchlistIds={watchlistIds}
        onAddToWatchlist={handleAddToWatchlist}
        onRemoveFromWatchlist={handleRemoveFromWatchlist}
      />

      {/* Curated Collections */}
      <div className="space-y-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold">Curated Collections</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 content-row">
          {BANGLA_COLLECTIONS.map(collection => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onClick={() => handleCollectionClick(collection)}
            />
          ))}
        </div>

        {/* Expanded collection items */}
        <AnimatePresence>
          {expandedCollection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {collectionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading collection...</span>
                </div>
              ) : collectionItems.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 pt-2">
                  {collectionItems.map((item, index) => (
                    <ContentCard
                      key={`${item.id}-${index}`}
                      item={item}
                      index={index}
                      inWatchlist={watchlistIds.has(`${item.media_type || 'movie'}-${item.id}`)}
                      onAddToWatchlist={() => handleAddToWatchlist(item)}
                      onRemoveFromWatchlist={() => handleRemoveFromWatchlist(item)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No items found for this collection.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Featured Bangla Actors */}
      <div className="space-y-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold">Bangla Stars</h2>
        </div>
        {actorsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[130px]">
                <div className="w-[130px] h-[130px] rounded-full bg-muted animate-pulse mx-auto" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded mt-2 mx-auto" />
                <div className="h-2 w-16 bg-muted animate-pulse rounded mt-1 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 content-row">
            {FEATURED_BANGLA_ACTORS.slice(0, 6).map(actor => (
              <ActorCard
                key={actor.name}
                actor={actor}
                personData={actorData.get(actor.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Explore All Bangla Button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('search', { query: 'Bengali movie', type: 'multi' })}
          className="gap-2"
        >
          Explore All Bangla Content <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
