'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Clock,
  Film,
  Tv,
  Play,
  History,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { WatchHistoryItem } from '@/lib/types';

interface GroupedHistory {
  label: string;
  items: WatchHistoryItem[];
}

export function WatchHistoryPage() {
  const { isAuthenticated, navigate } = useAppStore();
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      const res = await fetch(`/api/history?page=${pageNum}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setItems(prev => [...prev, ...(data.items || [])]);
        } else {
          setItems(data.items || []);
        }
        setTotal(data.total || 0);
        setPage(pageNum);
        setHasMore((data.items || []).length === 20 && (pageNum * 20) < (data.total || 0));
      }
    } catch {
      // silently fail
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchHistory(1);
  }, [isAuthenticated, fetchHistory]);

  const handleRemoveItem = async (item: WatchHistoryItem) => {
    setRemovingId(item.id);
    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: item.contentId, contentType: item.contentType }),
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== item.id));
        setTotal(prev => prev - 1);
        toast.success('Item removed from history');
      } else {
        toast.error('Failed to remove item');
      }
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setItems([]);
        setTotal(0);
        toast.success('Watch history cleared');
      } else {
        toast.error('Failed to clear history');
      }
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  // Group items by date
  const groupedHistory = useMemo((): GroupedHistory[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000);

    const groups: { key: string; label: string; items: WatchHistoryItem[] }[] = [
      { key: 'today', label: 'Today', items: [] },
      { key: 'yesterday', label: 'Yesterday', items: [] },
      { key: 'thisWeek', label: 'This Week', items: [] },
      { key: 'earlier', label: 'Earlier', items: [] },
    ];

    const filteredItems = filter === 'all' ? items : items.filter(item => item.contentType === filter);

    for (const item of filteredItems) {
      const watchedDate = new Date(item.watchedAt);
      const watchedDay = new Date(watchedDate.getFullYear(), watchedDate.getMonth(), watchedDate.getDate());

      if (watchedDay.getTime() === today.getTime()) {
        groups[0].items.push(item);
      } else if (watchedDay.getTime() === yesterday.getTime()) {
        groups[1].items.push(item);
      } else if (watchedDay >= thisWeekStart) {
        groups[2].items.push(item);
      } else {
        groups[3].items.push(item);
      }
    }

    return groups.filter(g => g.items.length > 0);
  }, [items, filter]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view watch history</h2>
          <Button onClick={() => navigate('login')} className="mt-4">Sign In</Button>
        </div>
      </div>
    );
  }

  const isLoading = !loaded && isAuthenticated;

  const movieCount = items.filter(i => i.contentType === 'movie').length;
  const tvCount = items.filter(i => i.contentType === 'tv').length;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getProgressPercent = (item: WatchHistoryItem) => {
    if (!item.duration || item.duration === 0) return 0;
    return Math.min(100, Math.round((item.progress / item.duration) * 100));
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold">Watch History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? 'item' : 'items'} watched
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
            onClick={() => setShowClearConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear All</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'movie' | 'tv')} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="movie" className="gap-1">
            <Film className="h-3.5 w-3.5" /> Movies ({movieCount})
          </TabsTrigger>
          <TabsTrigger value="tv" className="gap-1">
            <Tv className="h-3.5 w-3.5" /> TV ({tvCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : groupedHistory.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No watch history yet</h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all'
                  ? 'Start watching content to build your history'
                  : `No ${filter === 'movie' ? 'movies' : 'TV shows'} in your history`}
              </p>
              <Button onClick={() => navigate('home')}>Browse Content</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedHistory.map(group => (
                <div key={group.label}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {group.items.map(item => (
                      <Card
                        key={item.id}
                        className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors group overflow-hidden p-0 relative"
                        onClick={() => navigate(item.contentType === 'movie' ? 'movie' : 'tv', { id: item.contentId })}
                      >
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item);
                          }}
                          className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                          disabled={removingId === item.id}
                        >
                          {removingId === item.id ? (
                            <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <X className="h-3 w-3 text-white" />
                          )}
                        </button>
                        <div className="relative aspect-video bg-muted">
                          {item.posterPath ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w300${item.posterPath}`}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {item.contentType === 'movie' ? (
                                <Film className="h-8 w-8 text-muted-foreground" />
                              ) : (
                                <Tv className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          {/* Progress bar */}
                          {item.duration > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${getProgressPercent(item)}%` }}
                              />
                            </div>
                          )}
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-8 w-8 text-white fill-white" />
                          </div>
                          {/* Type badge */}
                          <Badge className="absolute top-2 left-2 text-[10px] h-5">
                            {item.contentType === 'movie' ? (
                              <><Film className="h-3 w-3 mr-0.5" /> Movie</>
                            ) : (
                              <><Tv className="h-3 w-3 mr-0.5" /> TV</>
                            )}
                          </Badge>
                        </div>
                        <CardContent className="p-3">
                          <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(item.watchedAt)}
                            {getProgressPercent(item) > 0 && (
                              <span className="ml-2">{getProgressPercent(item)}% watched</span>
                            )}
                          </p>
                          {/* Progress bar below text for partially watched */}
                          {getProgressPercent(item) > 0 && getProgressPercent(item) < 100 && (
                            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercent(item)}%` }}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => fetchHistory(page + 1, true)}
                    className="gap-2"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Watch History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your entire watch history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? 'Clearing...' : 'Clear All History'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
