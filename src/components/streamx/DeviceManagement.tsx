'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Tablet,
  Shield,
  Trash2,
  LogOut,
  AlertCircle,
  Loader2,
  Clock,
  Globe,
  Chrome,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DeviceSession } from '@/lib/types';

function getDeviceIcon(platform: string | null) {
  if (!platform) return Monitor;
  const p = platform.toLowerCase();
  if (p.includes('android') || p.includes('ios') || p.includes('iphone')) return Smartphone;
  if (p.includes('ipad') || p.includes('tablet')) return Tablet;
  return Monitor;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function DeviceManagement() {
  const { isAuthenticated, navigate } = useAppStore();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSessions();
  }, [isAuthenticated, fetchSessions]);

  const handleRemoveSession = async (sessionId: string) => {
    setRemovingId(sessionId);
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove session');
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Device signed out successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove session');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      const res = await fetch('/api/auth/logout-all', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sign out all devices');
      }
      // Keep only the most recent session (current)
      const currentSession = sessions.length > 0 ? [sessions[0]] : [];
      setSessions(currentSession);
      toast.success('Signed out of all other devices');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out all devices');
    } finally {
      setSigningOutAll(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to manage devices</h2>
          <Button onClick={() => navigate('login')} className="mt-4">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto pb-24 md:pb-8">
        <div className="pt-4 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentSessionId = sessions.length > 0 ? sessions[0].id : null;
  const otherSessions = sessions.filter(s => s.id !== currentSessionId);

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('profile')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Device Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your active sessions</p>
        </div>
      </div>

      {/* Sessions count summary */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          {otherSessions.length > 0 && ` (${otherSessions.length} other device${otherSessions.length !== 1 ? 's' : ''})`}
        </span>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Active Sessions</h3>
            <p className="text-sm text-muted-foreground">There are no active sessions for your account.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => {
            const DeviceIcon = getDeviceIcon(session.platform);
            const isCurrent = session.id === currentSessionId;
            const isRemoving = removingId === session.id;

            return (
              <Card
                key={session.id}
                className={`bg-card border-border ${isCurrent ? 'border-primary/30' : ''}`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div
                      className={`flex-shrink-0 p-3 rounded-lg ${
                        isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <DeviceIcon className="h-6 w-6" />
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base truncate">
                          {session.browser || 'Unknown Browser'}
                          {session.platform ? ` · ${session.platform}` : ''}
                        </h3>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs gap-1 bg-primary text-primary-foreground">
                            <Chrome className="h-3 w-3" />
                            Current
                          </Badge>
                        )}
                      </div>

                      {session.deviceName && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {session.deviceName}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {session.ipAddress && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.ipAddress}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(session.lastActiveAt)}
                        </p>
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        Logged in {formatDate(session.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    {!isCurrent && (
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isRemoving}
                          onClick={() => handleRemoveSession(session.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sign Out All Devices */}
      {otherSessions.length > 0 && (
        <Card className="bg-card border-destructive/30 mt-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 p-2 rounded-lg bg-destructive/10 text-destructive">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Sign Out All Other Devices</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This will sign you out of {otherSessions.length} other device
                    {otherSessions.length !== 1 ? 's' : ''}. You will stay signed in on this device.
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={signingOutAll}
                    className="gap-2 flex-shrink-0"
                  >
                    {signingOutAll ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    Sign Out All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out of all other devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out of {otherSessions.length} other device
                      {otherSessions.length !== 1 ? 's' : ''}. You will remain signed in on this device.
                      Any active sessions on other devices will be terminated immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSignOutAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sign Out All Devices
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card className="bg-card border-border mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
              If you see a device you don&apos;t recognize, remove it and change your password.
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
              Always sign out of shared or public devices after use.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
