'use client';

import { Play } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getImageUrl } from '@/lib/tmdb';
import type { ProgressItem } from '@/lib/types';

interface ContinueWatchingRowProps {
  items: ProgressItem[];
}

export function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  const { navigate } = useAppStore();

  if (!items || items.length === 0) return null;

  return (
    <div className="relative">
      <h2 className="text-lg sm:text-xl font-bold mb-3 px-4 sm:px-6 lg:px-8">Continue Watching</h2>
      <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-2 content-row">
        {items.map(item => {
          const progress = item.duration > 0 ? (item.position / item.duration) * 100 : 0;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.contentType as 'movie' | 'tv', { id: item.contentId })}
              className="flex-shrink-0 w-[220px] sm:w-[260px] group"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={getImageUrl(item.posterPath, 'w500')}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-poster.svg'; }}
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-full bg-white/90">
                    <Play className="h-5 w-5 text-black fill-black" />
                  </div>
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-1.5">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.seasonNumber && item.episodeNumber && (
                  <p className="text-xs text-muted-foreground">
                    S{item.seasonNumber} E{item.episodeNumber}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
