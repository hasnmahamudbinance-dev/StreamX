'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, Users, BarChart3, Bell, FolderOpen,
  Loader2, Trash2, Search, Send, Film,
} from 'lucide-react';
import { ContentManager } from './ContentManager';

interface AdminStats {
  totalUsers: number;
  totalWatchlistItems: number;
  totalProgressItems: number;
  totalCollections: number;
  totalNotifications: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: { watchlistItems: number; progressItems: number };
}

export function AdminDashboard() {
  const { user, isAuthenticated, navigate } = useAppStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;

    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([statsData, usersData]) => {
      setStats(statsData.stats);
      setUsers(usersData.users || []);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [isAuthenticated, user?.role]);

  const handleSearchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch {}
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch {}
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifTitle, message: notifMessage, type: notifType }),
      });
      if (res.ok) {
        setNotifTitle('');
        setNotifMessage('');
        alert('Notification sent successfully!');
      }
    } catch {} finally {
      setIsSending(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-4">You need admin privileges to access this page</p>
          <Button onClick={() => navigate('login')}>Sign In as Admin</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your StreamX platform</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-2" /> Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" /> Users</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="content"><Film className="h-4 w-4 mr-2" /> Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stats.totalWatchlistItems}</p>
                  <p className="text-sm text-muted-foreground">Watchlist Items</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stats.totalProgressItems}</p>
                  <p className="text-sm text-muted-foreground">Progress Records</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <FolderOpen className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold">{stats.totalCollections}</p>
                  <p className="text-sm text-muted-foreground">Collections</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Bell className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-3xl font-bold">{stats.totalNotifications}</p>
                  <p className="text-sm text-muted-foreground">Notifications</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search and manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by email or name..."
                  className="max-w-sm bg-secondary border-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                />
                <Button variant="outline" onClick={handleSearchUsers}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Watchlist</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u._count.watchlistItems}</TableCell>
                        <TableCell>{u._count.progressItems}</TableCell>
                        <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            >
                              {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </Button>
                            {u.id !== user?.id && (
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>Send notifications to all users or specific users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {['info', 'alert', 'announcement'].map(t => (
                    <button
                      key={t}
                      onClick={() => setNotifType(t)}
                      className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                        notifType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Notification title..."
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Notification message..."
                  className="bg-secondary border-border min-h-[100px]"
                />
              </div>
              <Button onClick={handleSendNotification} disabled={isSending || !notifTitle || !notifMessage}>
                {isSending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Send to All Users</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="content">
          <ContentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
