'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Bookmark, Film, LogOut, Shield, Settings } from 'lucide-react';
import type { NotificationItem } from '@/lib/types';

export function ProfilePage() {
  const { user, isAuthenticated, navigate, logout } = useAppStore();
  const [stats, setStats] = useState({ watchlist: 0, progress: 0, notifications: 0 });

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch('/api/watchlist').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/progress').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/notifications').then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([wl, prog, notif]) => {
      setStats({
        watchlist: wl.items?.length || 0,
        progress: prog.items?.length || 0,
        notifications: notif.items?.filter((n: NotificationItem) => !n.read).length || 0,
      });
    });
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view your profile</h2>
          <Button onClick={() => navigate('login')} className="mt-4">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pt-4">
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold">{user?.name}</h1>
          <p className="text-muted-foreground flex items-center gap-1 justify-center sm:justify-start mt-1">
            <Mail className="h-4 w-4" /> {user?.email}
          </p>
          <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
            <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
              {user?.role === 'admin' ? (
                <><Shield className="h-3 w-3 mr-1" /> Admin</>
              ) : (
                <><User className="h-3 w-3 mr-1" /> Member</>
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('watchlist')}>
          <CardContent className="p-4 text-center">
            <Bookmark className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.watchlist}</p>
            <p className="text-xs text-muted-foreground">Watchlist</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Film className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.progress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <Settings className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{stats.notifications}</p>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <button onClick={() => navigate('watchlist')} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors">
              <Bookmark className="h-5 w-5 text-primary" />
              <span className="flex-1 text-left">My List</span>
              <span className="text-sm text-muted-foreground">{stats.watchlist} items</span>
            </button>
            <Separator />
            {user?.role === 'admin' && (
              <>
                <button onClick={() => navigate('admin')} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">Admin Dashboard</span>
                </button>
                <Separator />
              </>
            )}
            <button onClick={logout} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-destructive">
              <LogOut className="h-5 w-5" />
              <span className="flex-1 text-left">Sign Out</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
