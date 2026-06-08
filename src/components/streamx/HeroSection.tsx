'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Plus, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { getBackdropUrl, getMediaType, getContentTitle, getContentDate } from '@/lib/tmdb';
import { getTrending } from '@/lib/tmdb';
import type { TMDBContent } from '@/lib/types';

interface HeroSectionProps {
  watchlistIds?: Set<string>;
  onAddToWatchlist?: (item: TMDBContent) => void;
  onRemoveFromWatchlist?: (item: TMDBContent) => void;
}

export function HeroSection({ watchlistIds, onAddToWatchlist, onRemoveFromWatchlist }: HeroSectionProps) {
  const { navigate } = useAppStore();
  const [featured, setFeatured] = useState<TMDBContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTrending('all', 'week').then(data => {
      const results = data?.results?.filter((item: TMDBContent) => item.backdrop_path) || [];
      setFeatured(results.slice(0, 5));
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featured.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (isLoading) {
    return (
      <div className="relative h-[60vh] sm:h-[70vh] bg-muted animate-pulse">
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="relative h-[60vh] sm:h-[70vh] bg-gradient-to-br from-primary/20 to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">StreamX</h1>
          <p className="text-muted-foreground">Discover your next favorite content</p>
        </div>
      </div>
    );
  }

  const currentItem = featured[currentIndex];
  const mediaType = getMediaType(currentItem);
  const title = getContentTitle(currentItem);
  const date = getContentDate(currentItem);
  const watchlistKey = `${mediaType}-${currentItem.id}`;
  const isInWatchlist = watchlistIds?.has(watchlistKey);

  return (
    <div className="relative h-[60vh] sm:h-[70vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={getBackdropUrl(currentItem.backdrop_path)}
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-backdrop.svg'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute bottom-[15%] sm:bottom-[20%] left-4 sm:left-6 lg:left-8 right-4 sm:right-6 lg:right-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <HeroBadge text="TRENDING" />
              <span className="text-sm text-gray-300">{date?.split('-')[0]}</span>
              {currentItem.vote_average > 0 && (
                <span className="flex items-center gap-1 text-sm text-yellow-400">
                  <Star className="h-3.5 w-3.5 fill-yellow-400" />
                  {currentItem.vote_average.toFixed(1)}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 max-w-2xl">{title}</h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl line-clamp-2 sm:line-clamp-3 mb-4">
              {currentItem.overview}
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(mediaType as 'movie' | 'tv', { id: String(currentItem.id) })}
                className="bg-white text-black hover:bg-white/90 gap-2"
              >
                <Play className="h-4 w-4 fill-black" /> Details
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(mediaType as 'movie' | 'tv', { id: String(currentItem.id) })}
                className="border-white/30 bg-white/10 hover:bg-white/20 text-white gap-2"
              >
                <Info className="h-4 w-4" /> More Info
              </Button>
              {isInWatchlist ? (
                <Button
                  variant="outline"
                  onClick={() => onRemoveFromWatchlist?.(currentItem)}
                  className="border-white/30 bg-white/10 hover:bg-white/20 text-white gap-2"
                >
                  <Check className="h-4 w-4" /> In My List
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => onAddToWatchlist?.(currentItem)}
                  className="border-white/30 bg-white/10 hover:bg-white/20 text-white gap-2"
                >
                  <Plus className="h-4 w-4" /> My List
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicators */}
      {featured.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroBadge({ text }: { text: string }) {
  return (
    <span className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded">
      {text}
    </span>
  );
}
