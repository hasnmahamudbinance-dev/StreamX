'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Shield, Star, Megaphone, Film, AlertTriangle,
  ArrowLeft, CheckCheck, Loader2, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import type { NotificationItem } from '@/lib/types';

type NotificationCategory = 'all' | 'content' | 'security' | 'recommendation' | 'admin';

interface NotificationTypeConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const NOTIFICATION_TYPE_MAP: Record<string, NotificationTypeConfig> = {
  info: { icon: Bell, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  security: { icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  recommendation: { icon: Star, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  admin: { icon: Megaphone, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  content: { icon: Film, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  warning: { icon: AlertTriangle, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
};

const CATEGORY_TABS: { key: NotificationCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'content', label: 'Content' },
  { key: 'security', label: 'Security' },
  { key: 'recommendation', label: 'Recommendations' },
  { key: 'admin', label: 'Admin' },
];

// Mock notifications for demo
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'mock-n1',
    title: 'New Movie Available',
    message: 'The latest blockbuster "Galactic Odyssey" is now streaming on StreamX.',
    type: 'content',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'mock-n2',
    title: 'New Login Detected',
    message: 'Your account was accessed from a new device in San Francisco, CA.',
    type: 'security',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'mock-n3',
    title: 'Recommended for You',
    message: 'Based on your watch history, you might enjoy "Shadow Protocol".',
    type: 'recommendation',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'mock-n4',
    title: 'System Maintenance',
    message: 'StreamX will undergo scheduled maintenance on March 5th from 2:00 AM to 4:00 AM UTC.',
    type: 'admin',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-n5',
    title: 'New Episode Released',
    message: 'Season 3, Episode 8 of "The Last Frontier" is now available.',
    type: 'content',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'mock-n6',
    title: 'Password Changed',
    message: 'Your StreamX password was successfully changed. If this wasn\'t you, contact support immediately.',
    type: 'security',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: 'mock-n7',
    title: 'Trending Now',
    message: '"Midnight Circuit" is trending #1 on StreamX this week!',
    type: 'recommendation',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'mock-n8',
    title: 'Subscription Renewal',
    message: 'Your Premium subscription will renew on March 15th. Manage your billing in settings.',
    type: 'admin',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    id: 'mock-n9',
    title: 'Download Expiring Soon',
    message: 'Your download of "Inception" expires in 2 days. Watch it before it\'s removed.',
    type: 'warning',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: 'mock-n10',
    title: 'Account Security Alert',
    message: 'Multiple failed login attempts detected on your account. Consider enabling two-factor authentication.',
    type: 'security',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  return new Date(dateString).toLocaleDateString();
}

function getNotificationTypeConfig(type: string): NotificationTypeConfig {
  return NOTIFICATION_TYPE_MAP[type] || NOTIFICATION_TYPE_MAP.info;
}

export function NotificationCenterPage() {
  const { navigate, isAuthenticated, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState<NotificationCategory>('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setNotifications(data.items);
        } else {
          setNotifications(MOCK_NOTIFICATIONS);
        }
      } else {
        setNotifications(MOCK_NOTIFICATIONS);
      }
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = category === 'all'
    ? notifications
    : notifications.filter(n => n.type === category);

  const displayedNotifications = filteredNotifications.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNotifications.length;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {}
    setMarkingAllRead(false);
  };

  const isLoading = !loaded;

  // Category counts
  const categoryCounts = {
    all: notifications.length,
    content: notifications.filter(n => n.type === 'content').length,
    security: notifications.filter(n => n.type === 'security').length,
    recommendation: notifications.filter(n => n.type === 'recommendation').length,
    admin: notifications.filter(n => n.type === 'admin').length,
  };

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[900px] mx-auto pb-24 md:pb-8">
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
            <Bell className="h-7 w-7 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="gap-1.5"
          >
            {markingAllRead ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark All Read
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setCategory(tab); setVisibleCount(10); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              category === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="text-xs opacity-70">({categoryCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-xl bg-card border border-border">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No notifications</h3>
          <p className="text-muted-foreground">
            {category === 'all'
              ? 'You\'re all caught up! Check back later.'
              : `No ${category} notifications at the moment.`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayedNotifications.map((notification, index) => {
              const typeConfig = getNotificationTypeConfig(notification.type);
              const TypeIcon = typeConfig.icon;

              return (
                <motion.button
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-xl transition-colors border ${
                    notification.read
                      ? 'bg-card border-border hover:bg-accent/50'
                      : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  }`}
                >
                  {/* Type Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${typeConfig.bgColor}`}>
                    <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {getTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {/* Load More */}
          {hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-4"
            >
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Load More ({filteredNotifications.length - visibleCount} remaining)
              </Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
