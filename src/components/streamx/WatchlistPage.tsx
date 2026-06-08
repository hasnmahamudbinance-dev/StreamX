'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Trash2, Film, Tv, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { getImageUrl } from '@/lib/tmdb';
import type { WatchlistItem } from '@/lib/types';

export function WatchlistPage() {
  const { navigate, isAuthenticated } = useAppStore();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const isLoading = !loaded && isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [isAuthenticated]);

  const handleRemove = async (item: WatchlistItem) => {
    try {
      const res = await fetch(`/api/watchlist?contentId=${item.contentId}&contentType=${item.contentType}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => !(i.contentId === item.contentId && i.contentType === item.contentType)));
      }
    } catch {}
  };

  const filteredItems = filter === 'all' ? items : items.filter(i => i.contentType === filter);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view your watchlist</h2>
          <p className="text-muted-foreground mb-4">Save movies and TV shows to watch later</p>
          <Button onClick={() => navigate('login')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My List</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} items saved</p>
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
            <span className="text-xs">({f === 'all' ? items.length : items.filter(i => i.contentType === f).length})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredItems.map(item => (
            <div key={item.id} className="group relative">
              <button
                onClick={() => navigate(item.contentType as 'movie' | 'tv', { id: item.contentId })}
                className="w-full"
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted relative">
                  <img
                    src={getImageUrl(item.posterPath, 'w500')}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <TypeBadge type={item.contentType} />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-medium truncate">{item.title}</h3>
                  {item.releaseDate && (
                    <p className="text-xs text-muted-foreground">{item.releaseDate.split('-')[0]}</p>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleRemove(item)}
                className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 hover:bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {filter === 'all' ? 'Your list is empty' : `No ${filter === 'movie' ? 'movies' : 'TV shows'} in your list`}
          </h3>
          <p className="text-muted-foreground mb-4">Start adding movies and TV shows to your list</p>
          <Button onClick={() => navigate('home')}>Browse Content</Button>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
      type === 'movie' ? 'bg-primary' : 'bg-emerald-600'
    } text-white`}>
      {type === 'movie' ? 'MOVIE' : 'TV'}
    </span>
  );
}
