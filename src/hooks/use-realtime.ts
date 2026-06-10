'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import type { NotificationItem, ProgressItem } from '@/lib/types';

interface RealtimeEvents {
  onProgressUpdate: (data: ProgressItem) => void;
  onWatchlistAdd: (data: Record<string, unknown>) => void;
  onWatchlistRemove: (data: Record<string, unknown>) => void;
  onNotification: (data: NotificationItem) => void;
  onAdminBroadcast: (data: { title: string; message: string; type: string }) => void;
  onPresenceOnline: (data: { userId: string }) => void;
  onPresenceOffline: (data: { userId: string }) => void;
}

export function useRealtime() {
  const socketRef = useRef<ReturnType<typeof import('socket.io-client').io> | null>(null);
  const { user, isAuthenticated } = useAppStore();
  const eventsRef = useRef<Partial<RealtimeEvents>>({});

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let socket: ReturnType<typeof import('socket.io-client').io>;

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io('/?XTransformPort=3003', {
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          socket.emit('user:join', user.id);
        });

        socket.on('progress:update', (data: ProgressItem) => {
          eventsRef.current.onProgressUpdate?.(data);
        });

        socket.on('watchlist:add', (data: Record<string, unknown>) => {
          eventsRef.current.onWatchlistAdd?.(data);
        });

        socket.on('watchlist:remove', (data: Record<string, unknown>) => {
          eventsRef.current.onWatchlistRemove?.(data);
        });

        socket.on('notification:new', (data: { id?: string; title?: string; message?: string; type?: string }) => {
          const notif: NotificationItem = {
            id: data.id || Date.now().toString(),
            title: data.title || 'New Notification',
            message: data.message || '',
            type: data.type || 'info',
            read: false,
            createdAt: new Date().toISOString(),
          };
          // Use toast for immediate display
          import('sonner').then(({ toast }) => {
            toast.info(notif.title, { description: notif.message });
          });
          eventsRef.current.onNotification?.(notif);
        });

        socket.on('admin:broadcast', (data: { title: string; message: string; type: string }) => {
          import('sonner').then(({ toast }) => {
            toast.info(data.title, { description: data.message });
          });
          eventsRef.current.onAdminBroadcast?.(data);
        });

        socketRef.current = socket;
      } catch (err) {
        console.error('Socket.IO connection failed:', err);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, user?.id]);

  const emitProgress = useCallback((data: {
    contentId: string;
    contentType: string;
    position: number;
    duration: number;
    seasonNumber?: number;
    episodeNumber?: number;
  }) => {
    socketRef.current?.emit('progress:update', data);
  }, []);

  const emitWatchlistAdd = useCallback((data: {
    contentId: string;
    contentType: string;
    title: string;
    posterPath?: string;
  }) => {
    socketRef.current?.emit('watchlist:add', data);
  }, []);

  const emitWatchlistRemove = useCallback((data: {
    contentId: string;
    contentType: string;
  }) => {
    socketRef.current?.emit('watchlist:remove', data);
  }, []);

  return {
    emitProgress,
    emitWatchlistAdd,
    emitWatchlistRemove,
  };
}
