'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Film, Tv, Play, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { getImageUrl, getDetails } from '@/lib/tmdb';
import type { FavoriteItem, TMDBContent } from '@/lib/types';

interface FavoriteWithDetails extends FavoriteItem {
  title?: string;
  posterPath?: string | null;
  rating?: number | null;
  releaseDate?: string | null;
  overview?: string | null;
}

export function FavoritesPage() {
  const { navigate, isAuthenticated } = useAppStore();
  const [items, setItems] = useState<FavoriteWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/favorites?limit=100');
      if (res.ok) {
        const data = await res.json();
        const favItems: FavoriteItem[] = data.items || [];
        setTotal(data.total || 0);

        // Fetch TMDB details for each favorite to get title, poster, etc.
        const detailsPromises = favItems.map(async (fav) => {
          try {
            const detail = await getDetails(fav.contentType, fav.contentId);
            return {
              ...fav,
              title: fav.contentType === 'movie' ? (detail as Record<string, unknown>).title as string : (detail as Record<string, unknown>).name as string,
              posterPath: (detail as Record<string, unknown>).poster_path as string | null,
              rating: (detail as Record<string, unknown>).vote_average as number | null,
              releaseDate: (fav.contentType === 'movie' ? (detail as Record<string, unknown>).release_date : (detail as Record<string, unknown>).first_air_date) as string | null,
              overview: (detail as Record<string, unknown>).overview as string | null,
            };
          } catch {
            return {
              ...fav,
              title: `${fav.contentType === 'movie' ? 'Movie' : 'TV Show'} ${fav.contentId}`,
              posterPath: null,
              rating: null,
              releaseDate: null,
              overview: null,
            };
          }
        });

        const itemsWithDetails = await Promise.all(detailsPromises);
        setItems(itemsWithDetails);
      }
    } catch {
      // silently fail
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (item: FavoriteWithDetails) => {
    setRemovingId(item.id);
    try {
      const res = await fetch(`/api/favorites/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        setTotal(prev => prev - 1);
      }
    } catch {
      // silently fail
    } finally {
      setRemovingId(null);
    }
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.contentType === filter);
  const movieCount = items.filter(i => i.contentType === 'movie').length;
  const tvCount = items.filter(i => i.contentType === 'tv').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view your favorites</h2>
          <p className="text-muted-foreground mb-4">Save your favorite movies and TV shows</p>
          <Button onClick={() => navigate('login')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const isLoading = !loaded;

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('home')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary fill-primary" />
            My Favorites
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? 'item' : 'items'} saved
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'movie', 'tv'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' && 'All'}
            {f === 'movie' && <><Film className="h-3.5 w-3.5" /> Movies</>}
            {f === 'tv' && <><Tv className="h-3.5 w-3.5" /> TV Shows</>}
            <span className="text-xs">
              ({f === 'all' ? items.length : f === 'movie' ? movieCount : tvCount})
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {filter === 'all' ? 'No favorites yet' : `No ${filter === 'movie' ? 'movies' : 'TV shows'} in your favorites`}
          </h3>
          <p className="text-muted-foreground mb-6">
            Tap the heart icon on any movie or TV show to add it to your favorites
          </p>
          <Button onClick={() => navigate('home')} className="gap-2">
            Browse Content
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                className="group relative"
              >
                <button
                  onClick={() => navigate(item.contentType as 'movie' | 'tv', { id: item.contentId })}
                  className="w-full"
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted relative">
                    {item.posterPath ? (
                      <img
                        src={getImageUrl(item.posterPath, 'w500')}
                        alt={item.title || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.contentType === 'movie' ? (
                          <Film className="h-10 w-10 text-muted-foreground" />
                        ) : (
                          <Tv className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-3 rounded-full bg-white/90">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>
                    {/* Type badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded text-white ${
                        item.contentType === 'movie' ? 'bg-primary' : 'bg-emerald-600'
                      }`}>
                        {item.contentType === 'movie' ? 'MOVIE' : 'TV'}
                      </span>
                    </div>
                    {/* Rating badge */}
                    {item.rating && item.rating >= 7 && (
                      <div className="absolute top-2 left-2 bg-yellow-500/90 text-black text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        ★ {item.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium truncate">{item.title}</h3>
                    {item.releaseDate && (
                      <p className="text-xs text-muted-foreground">{item.releaseDate.split('-')[0]}</p>
                    )}
                  </div>
                </button>
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                  disabled={removingId === item.id}
                  className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 hover:bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: item.rating && item.rating >= 7 ? 'auto' : undefined, right: item.rating && item.rating >= 7 ? undefined : undefined }}
                >
                  {removingId === item.id ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
