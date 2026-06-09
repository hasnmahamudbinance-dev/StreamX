'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Plus, Check, Star, Info, Heart } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getImageUrl, getMediaType, getContentTitle, getContentDate } from '@/lib/tmdb';
import type { TMDBContent } from '@/lib/types';

interface ContentCardProps {
  item: TMDBContent;
  index?: number;
  inWatchlist?: boolean;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
}

export function ContentCard({ item, index = 0, inWatchlist, onAddToWatchlist, onRemoveFromWatchlist }: ContentCardProps) {
  const { navigate, isAuthenticated } = useAppStore();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | undefined>(undefined);
  const mediaType = getMediaType(item);
  const title = getContentTitle(item);
  const date = getContentDate(item);
  const rating = item.vote_average?.toFixed(1);

  // Check favorite status
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/favorites/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId: String(item.id), contentType: mediaType }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.isFavorite) {
          setIsFavorited(true);
          setFavoriteId(data.favoriteId);
        }
      })
      .catch(() => {});
  }, [isAuthenticated, item.id, mediaType]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) return;

    if (isFavorited && favoriteId) {
      try {
        const res = await fetch(`/api/favorites/${favoriteId}`, { method: 'DELETE' });
        if (res.ok) {
          setIsFavorited(false);
          setFavoriteId(undefined);
        }
      } catch {}
    } else {
      try {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId: String(item.id), contentType: mediaType }),
        });
        if (res.ok) {
          const data = await res.json();
          setIsFavorited(true);
          setFavoriteId(data.item?.id);
        }
      } catch {}
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
      className="group relative flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] cursor-pointer"
      onClick={() => navigate(mediaType as 'movie' | 'tv', { id: String(item.id) })}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img
          src={getImageUrl(item.poster_path, 'w500')}
          alt={title}
          className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-75 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-poster.svg'; }}
          loading="lazy"
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 pointer-events-none">
          <h3 className="text-sm font-medium text-white line-clamp-2">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {rating && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                <Star className="h-3 w-3 fill-yellow-400" /> {rating}
              </span>
            )}
            {date && <span className="text-xs text-gray-400">{date.split('-')[0]}</span>}
          </div>
          
          <div className="flex items-center gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(mediaType as 'movie' | 'tv', { id: String(item.id) }); }}
              className="p-1.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors pointer-events-auto"
            >
              <Play className="h-3 w-3 fill-black" />
            </button>
            {inWatchlist ? (
              <button
                onClick={onRemoveFromWatchlist}
                className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors pointer-events-auto"
              >
                <Check className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={onAddToWatchlist}
                className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors pointer-events-auto"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {/* Favorite heart button */}
            <button
              onClick={handleToggleFavorite}
              className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors pointer-events-auto"
            >
              <Heart className={`h-3 w-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(mediaType as 'movie' | 'tv', { id: String(item.id) }); }}
              className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors ml-auto pointer-events-auto"
            >
              <Info className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Rating badge */}
        {rating && parseFloat(rating) >= 7 && (
          <div className="absolute top-2 right-2 bg-primary/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {rating}
          </div>
        )}

        {/* Favorite heart indicator (always visible) */}
        {isFavorited && (
          <div className="absolute top-2 left-2">
            <Heart className="h-4 w-4 text-red-500 fill-red-500 drop-shadow-lg" />
          </div>
        )}
      </div>
      
      {/* Title below poster */}
      <div className="mt-2 px-0.5">
        <h3 className="text-xs sm:text-sm font-medium truncate">{title}</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground">{date ? date.split('-')[0] : ''}</p>
      </div>
    </motion.div>
  );
}
