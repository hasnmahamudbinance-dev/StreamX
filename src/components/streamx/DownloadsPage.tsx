'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Trash2, Film, Tv, HardDrive, ArrowLeft,
  Loader2, Clock, AlertCircle, CheckCircle2, XCircle,
  Ban, Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import type { DownloadItem } from '@/lib/types';

// Mock downloads for demo when no real data exists
const MOCK_DOWNLOADS: DownloadItem[] = [
  {
    id: 'mock-1',
    userId: 'demo',
    contentId: '123',
    contentType: 'movie',
    title: 'The Dark Knight',
    posterPath: '/qJ2tW6WMUDux911BTUgMe1nEWkv.jpg',
    seasonNumber: null,
    episodeNumber: null,
    quality: 'high',
    fileSize: 2147483648,
    status: 'completed',
    expiresAt: '2026-03-15T00:00:00Z',
    createdAt: '2026-02-20T10:30:00Z',
  },
  {
    id: 'mock-2',
    userId: 'demo',
    contentId: '456',
    contentType: 'tv',
    title: 'Breaking Bad',
    posterPath: '/ztkUQFLlC19CCMYHW73WxxWgMD5.jpg',
    seasonNumber: 1,
    episodeNumber: 1,
    quality: 'medium',
    fileSize: 536870912,
    status: 'downloading',
    expiresAt: null,
    createdAt: '2026-03-03T08:00:00Z',
  },
  {
    id: 'mock-3',
    userId: 'demo',
    contentId: '789',
    contentType: 'movie',
    title: 'Inception',
    posterPath: '/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg',
    seasonNumber: null,
    episodeNumber: null,
    quality: 'high',
    fileSize: 3221225472,
    status: 'completed',
    expiresAt: '2026-04-01T00:00:00Z',
    createdAt: '2026-02-15T14:20:00Z',
  },
  {
    id: 'mock-4',
    userId: 'demo',
    contentId: '101',
    contentType: 'tv',
    title: 'Stranger Things',
    posterPath: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    seasonNumber: 2,
    episodeNumber: 4,
    quality: 'low',
    fileSize: 268435456,
    status: 'pending',
    expiresAt: null,
    createdAt: '2026-03-03T09:15:00Z',
  },
  {
    id: 'mock-5',
    userId: 'demo',
    contentId: '202',
    contentType: 'movie',
    title: 'Interstellar',
    posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    seasonNumber: null,
    episodeNumber: null,
    quality: 'high',
    fileSize: 4294967296,
    status: 'failed',
    expiresAt: null,
    createdAt: '2026-03-02T16:45:00Z',
  },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

function getQualityColor(quality: string): string {
  switch (quality) {
    case 'low': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'high': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function getQualityLabel(quality: string): string {
  switch (quality) {
    case 'low': return 'Low';
    case 'medium': return 'Medium';
    case 'high': return 'High';
    default: return quality;
  }
}

function getStatusConfig(status: string): { color: string; icon: React.ElementType; label: string } {
  switch (status) {
    case 'pending':
      return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'Pending' };
    case 'downloading':
      return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Loader2, label: 'Downloading' };
    case 'completed':
      return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2, label: 'Completed' };
    case 'failed':
      return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Failed' };
    case 'expired':
      return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Ban, label: 'Expired' };
    default:
      return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: AlertCircle, label: status };
  }
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function DownloadsPage() {
  const { navigate, isAuthenticated } = useAppStore();
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [totalStorage, setTotalStorage] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DownloadItem | null>(null);
  const [downloadingProgress, setDownloadingProgress] = useState<Record<string, number>>({});

  const fetchDownloads = useCallback(async () => {
    if (!isAuthenticated) {
      // Show mock data for unauthenticated demo
      setDownloads(MOCK_DOWNLOADS);
      setTotalStorage(MOCK_DOWNLOADS.reduce((s, d) => s + d.fileSize, 0));
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch('/api/downloads');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setDownloads(data.items);
          setTotalStorage(data.totalStorage || 0);
        } else {
          // Show mock data for demo when empty
          setDownloads(MOCK_DOWNLOADS);
          setTotalStorage(MOCK_DOWNLOADS.reduce((s, d) => s + d.fileSize, 0));
        }
      } else {
        setDownloads(MOCK_DOWNLOADS);
        setTotalStorage(MOCK_DOWNLOADS.reduce((s, d) => s + d.fileSize, 0));
      }
    } catch {
      setDownloads(MOCK_DOWNLOADS);
      setTotalStorage(MOCK_DOWNLOADS.reduce((s, d) => s + d.fileSize, 0));
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  // Auto-refresh while downloading (simulated progress)
  const hasDownloading = downloads.some(d => d.status === 'downloading');

  useEffect(() => {
    if (!hasDownloading) return;

    const progressInterval = setInterval(() => {
      setDownloadingProgress(prev => {
        const next = { ...prev };
        downloads.forEach(d => {
          if (d.status === 'downloading') {
            const current = next[d.id] || 0;
            next[d.id] = Math.min(current + Math.random() * 8 + 2, 100);
          }
        });
        return next;
      });
    }, 1000);

    // Refresh list every 10 seconds
    const refreshInterval = setInterval(fetchDownloads, 10000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(refreshInterval);
    };
  }, [hasDownloading, downloads, fetchDownloads]);

  const handleDelete = async (item: DownloadItem) => {
    setDeletingId(item.id);
    try {
      if (isAuthenticated) {
        const res = await fetch(`/api/downloads?id=${item.id}`, { method: 'DELETE' });
        if (res.ok) {
          setDownloads(prev => prev.filter(d => d.id !== item.id));
          setTotalStorage(prev => prev - item.fileSize);
        }
      } else {
        // Mock delete
        setDownloads(prev => prev.filter(d => d.id !== item.id));
        setTotalStorage(prev => prev - item.fileSize);
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (!isAuthenticated && !loaded) {
    // Still show the page with mock data
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
            <Download className="h-7 w-7 text-primary" />
            Downloads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {downloads.length} {downloads.length === 1 ? 'item' : 'items'} downloaded
          </p>
        </div>
      </div>

      {/* Storage Used */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 rounded-xl bg-card border border-border"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Storage Used</span>
          </div>
          <span className="text-sm font-bold text-primary">{formatFileSize(totalStorage)}</span>
        </div>
        <Progress value={Math.min((totalStorage / (10 * 1024 * 1024 * 1024)) * 100, 100)} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {formatFileSize(totalStorage)} of 10 GB used
        </p>
      </motion.div>

      {/* Downloads Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : downloads.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Download className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No downloads yet</h3>
          <p className="text-muted-foreground mb-6">
            Download movies and TV shows to watch offline
          </p>
          <Button onClick={() => navigate('home')} className="gap-2">
            Browse Content
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {downloads.map((item, index) => {
              const statusConfig = getStatusConfig(item.status);
              const StatusIcon = statusConfig.icon;
              const progress = downloadingProgress[item.id] || 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  className="group relative"
                >
                  <div className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-colors">
                    {/* Poster */}
                    <div className="aspect-[3/4] relative overflow-hidden">
                      {item.posterPath ? (
                        <img
                          src={`${TMDB_IMAGE_BASE}/w500${item.posterPath}`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 ${item.posterPath ? 'hidden' : ''}`}>
                        {item.contentType === 'movie' ? (
                          <Film className="h-12 w-12 text-primary/40" />
                        ) : (
                          <Tv className="h-12 w-12 text-primary/40" />
                        )}
                      </div>

                      {/* Quality Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getQualityColor(item.quality)}`}>
                          {getQualityLabel(item.quality)}
                        </span>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 right-2">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded text-white ${
                          item.contentType === 'movie' ? 'bg-primary' : 'bg-emerald-600'
                        }`}>
                          {item.contentType === 'movie' ? 'MOVIE' : 'TV'}
                        </span>
                      </div>

                      {/* Status Overlay for downloading */}
                      {item.status === 'downloading' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                          <span className="text-xs text-blue-300 font-medium">{Math.round(progress)}%</span>
                          <div className="w-3/4">
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        </div>
                      )}

                      {/* Status Overlay for pending */}
                      {item.status === 'pending' && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                          <Wifi className="h-8 w-8 text-yellow-400" />
                          <span className="text-xs text-yellow-300 font-medium">Waiting...</span>
                        </div>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteTarget(item)}
                        disabled={deletingId === item.id}
                        className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 hover:bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {deletingId === item.id ? (
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                      {item.seasonNumber && item.episodeNumber && (
                        <p className="text-xs text-muted-foreground">
                          S{item.seasonNumber}E{item.episodeNumber}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.fileSize)}
                        </span>
                        <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${statusConfig.color}`}>
                          <StatusIcon className={`h-3 w-3 ${item.status === 'downloading' ? 'animate-spin' : ''}`} />
                          {statusConfig.label}
                        </span>
                      </div>
                      {item.expiresAt && item.status === 'completed' && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Expires {new Date(item.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Download</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;{deleteTarget?.seasonNumber && deleteTarget?.episodeNumber ? ` S${deleteTarget.seasonNumber}E${deleteTarget.episodeNumber}` : ''} from your downloads? This will free up {deleteTarget ? formatFileSize(deleteTarget.fileSize) : ''} of storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
