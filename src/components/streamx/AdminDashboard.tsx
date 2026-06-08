'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield, Users, BarChart3, Bell, FolderOpen,
  Loader2, Trash2, Search, Send, Film,
  Calendar, LayoutDashboard, Settings, HardDrive,
  AlertTriangle, Database, Mail, ArrowUp, ArrowDown,
  GripVertical, Plus, RefreshCw, Clock, CheckCircle,
  XCircle, Eye, EyeOff, Save,
} from 'lucide-react';
import { ContentManager } from './ContentManager';
import { toast } from 'sonner';

// ─── Interfaces ───────────────────────────────────────────────

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

interface ScheduleItem {
  id: string;
  contentId: string;
  action: string;
  scheduledAt: string;
  executed: boolean;
  executedAt: string | null;
  createdAt: string;
  content: { id: string; title: string; type: string; status: string };
}

interface HomepageSection {
  id: string;
  title: string;
  type: string;
  order: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  items: HomepageSectionItem[];
}

interface HomepageSectionItem {
  id: string;
  sectionId: string;
  contentId: string | null;
  contentType: string | null;
  uploadedId: string | null;
  order: number;
  uploaded: { id: string; title: string; type: string; posterUrl: string | null } | null;
}

interface ErrorLogItem {
  id: string;
  type: string;
  message: string;
  stack: string | null;
  endpoint: string | null;
  userId: string | null;
  metadata: string | null;
  resolved: boolean;
  createdAt: string;
}

interface BackupItem {
  id: string;
  filename: string;
  size: number;
  type: string;
  status: string;
  createdAt: string;
}

interface EmailLogItem {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  error: string | null;
  createdAt: string;
}

interface UploadedContentOption {
  id: string;
  title: string;
  type: string;
}

// ─── Helpers ──────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function timeUntil(dateStr: string): string {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Overdue';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ─── Component ────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, isAuthenticated, navigate } = useAppStore();

  // Overview
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Notifications
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [isSending, setIsSending] = useState(false);

  // Scheduling
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [scheduleContentId, setScheduleContentId] = useState('');
  const [scheduleAction, setScheduleAction] = useState('publish');
  const [scheduleDate, setScheduleDate] = useState('');
  const [contentOptions, setContentOptions] = useState<UploadedContentOption[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [nextScheduleIn, setNextScheduleIn] = useState('');

  // Homepage
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [homepageLoading, setHomepageLoading] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionType, setNewSectionType] = useState('trending');
  const [addingItemToSection, setAddingItemToSection] = useState<string | null>(null);
  const [addItemContentId, setAddItemContentId] = useState('');

  // Settings
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  // Storage
  const [storageData, setStorageData] = useState<{
    totalStorage: number;
    videoStorage: number;
    imageStorage: number;
    fileCount: number;
    breakdown: Record<string, { size: number; fileCount: number }>;
  } | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Errors
  const [errors, setErrors] = useState<ErrorLogItem[]>([]);
  const [errorFilterType, setErrorFilterType] = useState('all');
  const [errorFilterResolved, setErrorFilterResolved] = useState('all');
  const [errorsLoading, setErrorsLoading] = useState(false);

  // Backup
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Email
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailType, setEmailType] = useState('notification');
  const [emailContent, setEmailContent] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  // ─── Initial data fetch ─────────────────────────────────────

  const fetchInitialData = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/users').then(r => r.json()),
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users || []);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ─── Scheduling tab data ────────────────────────────────────

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/schedules?executed=false');
      const data = await res.json();
      setSchedules(data.schedules || []);
      const pending = (data.schedules || []) as ScheduleItem[];
      if (pending.length > 0) {
        const next = pending.sort((a: ScheduleItem, b: ScheduleItem) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        )[0];
        setNextScheduleIn(timeUntil(next.scheduledAt));
      } else {
        setNextScheduleIn('');
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchContentOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content?limit=100');
      const data = await res.json();
      setContentOptions((data.content || []).map((c: { id: string; title: string; type: string }) => ({
        id: c.id, title: c.title, type: c.type,
      })));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchSchedules();
      fetchContentOptions();
    }
  }, [isAuthenticated, user?.role, fetchSchedules, fetchContentOptions]);

  // Auto-refresh scheduling indicator every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const pendingSchedules = schedules.filter(s => !s.executed);
      if (pendingSchedules.length > 0) {
        const next = pendingSchedules.sort((a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        )[0];
        setNextScheduleIn(timeUntil(next.scheduledAt));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [schedules]);

  // ─── Homepage tab data ──────────────────────────────────────

  const fetchHomepage = useCallback(async () => {
    setHomepageLoading(true);
    try {
      const res = await fetch('/api/admin/homepage');
      const data = await res.json();
      setHomepageSections(data.sections || []);
    } catch {
      // silently fail
    } finally {
      setHomepageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchHomepage();
    }
  }, [isAuthenticated, user?.role, fetchHomepage]);

  // ─── Settings tab data ──────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data.settings || {});
    } catch {
      // silently fail
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchSettings();
    }
  }, [isAuthenticated, user?.role, fetchSettings]);

  // ─── Storage tab data ───────────────────────────────────────

  const fetchStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      const res = await fetch('/api/admin/storage');
      const data = await res.json();
      setStorageData(data);
    } catch {
      // silently fail
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchStorage();
    }
  }, [isAuthenticated, user?.role, fetchStorage]);

  // ─── Errors tab data ────────────────────────────────────────

  const fetchErrors = useCallback(async () => {
    setErrorsLoading(true);
    try {
      const params = new URLSearchParams();
      if (errorFilterType !== 'all') params.set('type', errorFilterType);
      if (errorFilterResolved !== 'all') params.set('resolved', errorFilterResolved);
      const res = await fetch(`/api/admin/errors?${params.toString()}`);
      const data = await res.json();
      setErrors(data.errors || []);
    } catch {
      // silently fail
    } finally {
      setErrorsLoading(false);
    }
  }, [errorFilterType, errorFilterResolved]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchErrors();
    }
  }, [isAuthenticated, user?.role, fetchErrors]);

  // ─── Backup tab data ────────────────────────────────────────

  const fetchBackups = useCallback(async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/admin/backup');
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      // silently fail
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchBackups();
    }
  }, [isAuthenticated, user?.role, fetchBackups]);

  // ─── Email tab data ─────────────────────────────────────────

  const fetchEmailLogs = useCallback(async () => {
    setEmailLogsLoading(true);
    try {
      const res = await fetch('/api/admin/email?limit=50');
      const data = await res.json();
      setEmailLogs(data.emails || []);
    } catch {
      // silently fail
    } finally {
      setEmailLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchEmailLogs();
    }
  }, [isAuthenticated, user?.role, fetchEmailLogs]);

  // ─── Users handlers ─────────────────────────────────────────

  const handleSearchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // silently fail
    }
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
        toast.success(`User role updated to ${newRole}`);
      }
    } catch {
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        toast.success('User deleted');
      }
    } catch {
      toast.error('Failed to delete user');
    }
  };

  // ─── Notifications handlers ─────────────────────────────────

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
        toast.success('Notification sent successfully!');
      }
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  // ─── Scheduling handlers ────────────────────────────────────

  const handleCreateSchedule = async () => {
    if (!scheduleContentId || !scheduleAction || !scheduleDate) return;
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: scheduleContentId, action: scheduleAction, scheduledAt: scheduleDate }),
      });
      if (res.ok) {
        setScheduleContentId('');
        setScheduleAction('publish');
        setScheduleDate('');
        toast.success('Schedule created');
        fetchSchedules();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create schedule');
      }
    } catch {
      toast.error('Failed to create schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch('/api/admin/schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Schedule deleted');
        fetchSchedules();
      }
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  // ─── Homepage handlers ──────────────────────────────────────

  const handleAddSection = async () => {
    if (!newSectionTitle || !newSectionType) return;
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSectionTitle,
          type: newSectionType,
          order: homepageSections.length,
        }),
      });
      if (res.ok) {
        setNewSectionTitle('');
        setNewSectionType('trending');
        toast.success('Section added');
        fetchHomepage();
      }
    } catch {
      toast.error('Failed to add section');
    }
  };

  const handleToggleSectionVisibility = async (id: string, visible: boolean) => {
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, visible: !visible }),
      });
      if (res.ok) {
        toast.success(`Section ${!visible ? 'shown' : 'hidden'}`);
        fetchHomepage();
      }
    } catch {
      toast.error('Failed to update section');
    }
  };

  const handleMoveSection = async (id: string, direction: 'up' | 'down') => {
    const idx = homepageSections.findIndex(s => s.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === homepageSections.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...homepageSections];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];

    // Optimistic update
    setHomepageSections(updated);

    try {
      await Promise.all(
        updated.map((section, i) =>
          fetch('/api/admin/homepage', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: section.id, order: i }),
          })
        )
      );
    } catch {
      toast.error('Failed to reorder sections');
      fetchHomepage();
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section and all its items?')) return;
    try {
      const res = await fetch('/api/admin/homepage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Section deleted');
        fetchHomepage();
      }
    } catch {
      toast.error('Failed to delete section');
    }
  };

  const handleAddItemToSection = async () => {
    if (!addingItemToSection || !addItemContentId) return;
    try {
      const res = await fetch('/api/admin/homepage/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: addingItemToSection,
          uploadedId: addItemContentId,
          contentType: 'uploaded',
        }),
      });
      if (res.ok) {
        setAddingItemToSection(null);
        setAddItemContentId('');
        toast.success('Content item added');
        fetchHomepage();
      }
    } catch {
      toast.error('Failed to add item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch('/api/admin/homepage/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Item removed');
        fetchHomepage();
      }
    } catch {
      toast.error('Failed to remove item');
    }
  };

  // ─── Settings handlers ──────────────────────────────────────

  const settingsGroups: Record<string, { label: string; keys: { key: string; label: string }[] }> = {
    general: {
      label: 'General',
      keys: [
        { key: 'platform_name', label: 'Platform Name' },
        { key: 'contact_email', label: 'Contact Email' },
      ],
    },
    content: {
      label: 'Content',
      keys: [
        { key: 'upload_limit', label: 'Upload Limit (MB)' },
        { key: 'default_status', label: 'Default Status' },
      ],
    },
    maintenance: {
      label: 'Maintenance',
      keys: [
        { key: 'maintenance_mode', label: 'Maintenance Mode' },
      ],
    },
  };

  const handleSettingsChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettingsGroup = async (groupKey: string) => {
    setSavingGroup(groupKey);
    const group = settingsGroups[groupKey];
    const settingsArr = group.keys.map(k => ({
      key: k.key,
      value: settings[k.key] || '',
    }));
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArr }),
      });
      if (res.ok) {
        toast.success(`${group.label} settings saved`);
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingGroup(null);
    }
  };

  // ─── Errors handlers ────────────────────────────────────────

  const handleResolveError = async (id: string) => {
    try {
      await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      toast.success('Error marked as resolved');
      fetchErrors();
    } catch {
      toast.error('Failed to resolve error');
    }
  };

  const handleClearResolved = async () => {
    if (!confirm('Delete all resolved errors?')) return;
    try {
      const res = await fetch('/api/admin/errors', { method: 'DELETE' });
      const data = await res.json();
      toast.success(`Cleared ${data.deleted} resolved errors`);
      fetchErrors();
    } catch {
      toast.error('Failed to clear errors');
    }
  };

  // ─── Backup handlers ────────────────────────────────────────

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      if (res.ok) {
        toast.success('Backup created');
        fetchBackups();
      } else {
        toast.error('Failed to create backup');
      }
    } catch {
      toast.error('Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Backup deleted');
        fetchBackups();
      }
    } catch {
      toast.error('Failed to delete backup');
    }
  };

  // ─── Email handlers ─────────────────────────────────────────

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailType) return;
    setEmailSending(true);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, type: emailType, content: emailContent }),
      });
      if (res.ok) {
        setEmailTo('');
        setEmailSubject('');
        setEmailContent('');
        setEmailType('notification');
        toast.success('Email sent');
        fetchEmailLogs();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  // ─── Guard ──────────────────────────────────────────────────

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

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto pb-12">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your StreamX platform</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-secondary w-max min-w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm"><Users className="h-4 w-4" /> Users</TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5 text-xs sm:text-sm"><Film className="h-4 w-4" /> Content</TabsTrigger>
            <TabsTrigger value="scheduling" className="gap-1.5 text-xs sm:text-sm"><Calendar className="h-4 w-4" /> Scheduling</TabsTrigger>
            <TabsTrigger value="homepage" className="gap-1.5 text-xs sm:text-sm"><LayoutDashboard className="h-4 w-4" /> Homepage</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
            <TabsTrigger value="storage" className="gap-1.5 text-xs sm:text-sm"><HardDrive className="h-4 w-4" /> Storage</TabsTrigger>
            <TabsTrigger value="errors" className="gap-1.5 text-xs sm:text-sm"><AlertTriangle className="h-4 w-4" /> Errors</TabsTrigger>
            <TabsTrigger value="backup" className="gap-1.5 text-xs sm:text-sm"><Database className="h-4 w-4" /> Backup</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm"><Mail className="h-4 w-4" /> Email</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
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
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center text-muted-foreground">
                Failed to load stats
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Users Tab ── */}
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

        {/* ── Content Tab ── */}
        <TabsContent value="content">
          <ContentManager />
        </TabsContent>

        {/* ── Scheduling Tab ── */}
        <TabsContent value="scheduling">
          <div className="space-y-6">
            {/* Next schedule indicator */}
            {nextScheduleIn && (
              <Card className="bg-card border-border border-primary/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                  <div>
                    <p className="text-sm font-medium">Next scheduled action executes in</p>
                    <p className="text-lg font-bold text-primary">{nextScheduleIn}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={fetchSchedules}>
                    <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Create schedule form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Create Schedule
                </CardTitle>
                <CardDescription>Schedule content publishing or archiving</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Select value={scheduleContentId} onValueChange={setScheduleContentId}>
                      <SelectTrigger className="w-full bg-secondary border-border">
                        <SelectValue placeholder="Select content..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contentOptions.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title} ({c.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select value={scheduleAction} onValueChange={setScheduleAction}>
                      <SelectTrigger className="w-full bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="publish">Publish</SelectItem>
                        <SelectItem value="archive">Archive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreateSchedule} disabled={scheduleLoading || !scheduleContentId || !scheduleDate} className="w-full">
                      {scheduleLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Create
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedules list */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Pending Schedules</CardTitle>
                <CardDescription>Upcoming scheduled content actions</CardDescription>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pending schedules</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Content</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Scheduled Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Time Until</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{s.content.title}</p>
                                <p className="text-xs text-muted-foreground">{s.content.type}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.action === 'publish' ? 'default' : 'secondary'}>
                                {s.action}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(s.scheduledAt)}</TableCell>
                            <TableCell>
                              <Badge variant={s.executed ? 'secondary' : 'outline'}>
                                {s.executed ? 'Executed' : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.executed ? '—' : timeUntil(s.scheduledAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteSchedule(s.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Homepage Tab ── */}
        <TabsContent value="homepage">
          <div className="space-y-6">
            {/* Add section form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5" /> Add Homepage Section
                </CardTitle>
                <CardDescription>Create sections for the homepage layout</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Section Title</Label>
                    <Input
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="e.g. Trending Now"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Section Type</Label>
                    <Select value={newSectionType} onValueChange={setNewSectionType}>
                      <SelectTrigger className="w-full bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trending">Trending</SelectItem>
                        <SelectItem value="popular">Popular</SelectItem>
                        <SelectItem value="top_rated">Top Rated</SelectItem>
                        <SelectItem value="now_playing">Now Playing</SelectItem>
                        <SelectItem value="on_the_air">On The Air</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddSection} disabled={!newSectionTitle} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Add Section
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections list */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Homepage Sections</CardTitle>
                <CardDescription>Manage the order and visibility of homepage sections</CardDescription>
              </CardHeader>
              <CardContent>
                {homepageLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : homepageSections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LayoutDashboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No homepage sections configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {homepageSections.map((section, idx) => (
                      <div key={section.id} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{section.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {section.type} &middot; Order: {section.order}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                              {section.visible ? (
                                <Eye className="h-4 w-4 text-green-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                              <Switch
                                checked={section.visible}
                                onCheckedChange={() => handleToggleSectionVisibility(section.id, section.visible)}
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={idx === 0}
                              onClick={() => handleMoveSection(section.id, 'up')}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={idx === homepageSections.length - 1}
                              onClick={() => handleMoveSection(section.id, 'down')}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteSection(section.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Custom section items */}
                        {section.type === 'custom' && (
                          <div className="ml-8 space-y-2">
                            <Separator />
                            <p className="text-sm font-medium text-muted-foreground">Content Items</p>
                            {section.items.length > 0 && (
                              <div className="space-y-1">
                                {section.items.map(item => (
                                  <div key={item.id} className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-3 py-1.5">
                                    <span className="flex-1 truncate">
                                      {item.uploaded?.title || item.contentId || 'Unknown'}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <XCircle className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {addingItemToSection === section.id ? (
                              <div className="flex items-center gap-2">
                                <Select value={addItemContentId} onValueChange={setAddItemContentId}>
                                  <SelectTrigger className="flex-1 bg-secondary border-border h-8 text-sm">
                                    <SelectValue placeholder="Select content..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {contentOptions.map(c => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.title} ({c.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" onClick={handleAddItemToSection} disabled={!addItemContentId}>
                                  Add
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setAddingItemToSection(null); setAddItemContentId(''); }}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setAddingItemToSection(section.id)}>
                                <Plus className="h-3 w-3 mr-1" /> Add Content
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>Send notifications to all users or specific users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-2 flex-wrap">
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

        {/* ── Settings Tab ── */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              Object.entries(settingsGroups).map(([groupKey, group]) => (
                <Card key={groupKey} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {groupKey === 'general' && <Settings className="h-5 w-5" />}
                      {groupKey === 'content' && <Film className="h-5 w-5" />}
                      {groupKey === 'maintenance' && <AlertTriangle className="h-5 w-5" />}
                      {group.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {group.keys.map(k => (
                      <div key={k.key} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <Label className="text-sm font-medium">{k.label}</Label>
                        <div className="sm:col-span-2">
                          {k.key === 'maintenance_mode' ? (
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={settings[k.key] === 'true' || settings[k.key] === '1'}
                                onCheckedChange={(checked) => handleSettingsChange(k.key, checked ? 'true' : 'false')}
                              />
                              <span className="text-sm text-muted-foreground">
                                {settings[k.key] === 'true' || settings[k.key] === '1' ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          ) : (
                            <Input
                              value={settings[k.key] || ''}
                              onChange={(e) => handleSettingsChange(k.key, e.target.value)}
                              className="bg-secondary border-border"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSaveSettingsGroup(groupKey)}
                        disabled={savingGroup === groupKey}
                      >
                        {savingGroup === groupKey ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save {group.label}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── Storage Tab ── */}
        <TabsContent value="storage">
          <div className="space-y-6">
            {storageLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : storageData ? (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <HardDrive className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{formatBytes(storageData.totalStorage)}</p>
                      <p className="text-sm text-muted-foreground">Total Storage</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <Film className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{formatBytes(storageData.videoStorage)}</p>
                      <p className="text-sm text-muted-foreground">Video Storage</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{formatBytes(storageData.imageStorage)}</p>
                      <p className="text-sm text-muted-foreground">Image Storage</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{storageData.fileCount}</p>
                      <p className="text-sm text-muted-foreground">Total Files</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Visual storage bar */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Storage Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Bar */}
                      <div className="h-8 rounded-full overflow-hidden bg-secondary flex">
                        {Object.entries(storageData.breakdown).map(([key, val]) => {
                          const pct = storageData.totalStorage > 0
                            ? (val.size / storageData.totalStorage) * 100
                            : 0;
                          if (pct === 0) return null;
                          const colors: Record<string, string> = {
                            videos: 'bg-blue-500',
                            images: 'bg-green-500',
                            avatars: 'bg-yellow-500',
                            other: 'bg-purple-500',
                          };
                          return (
                            <div
                              key={key}
                              className={`${colors[key] || 'bg-gray-500'} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                              title={`${key}: ${formatBytes(val.size)} (${pct.toFixed(1)}%)`}
                            />
                          );
                        })}
                      </div>

                      {/* Legend + details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(storageData.breakdown).map(([key, val]) => {
                          const colors: Record<string, string> = {
                            videos: 'bg-blue-500',
                            images: 'bg-green-500',
                            avatars: 'bg-yellow-500',
                            other: 'bg-purple-500',
                          };
                          const pct = storageData.totalStorage > 0
                            ? ((val.size / storageData.totalStorage) * 100).toFixed(1)
                            : '0';
                          return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <div className={`w-3 h-3 rounded-full ${colors[key] || 'bg-gray-500'}`} />
                              <div>
                                <p className="font-medium capitalize">{key}</p>
                                <p className="text-muted-foreground">{formatBytes(val.size)} &middot; {val.fileCount} files &middot; {pct}%</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Failed to load storage data
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Errors Tab ── */}
        <TabsContent value="errors">
          <div className="space-y-6">
            {/* Filters */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Error Logs
                    </CardTitle>
                    <CardDescription>View and manage platform errors</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearResolved}>
                    <Trash2 className="h-4 w-4 mr-2" /> Clear Resolved
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Type:</Label>
                    <Select value={errorFilterType} onValueChange={setErrorFilterType}>
                      <SelectTrigger className="w-[140px] bg-secondary border-border h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="upload">Upload</SelectItem>
                        <SelectItem value="playback">Playback</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Status:</Label>
                    <Select value={errorFilterResolved} onValueChange={setErrorFilterResolved}>
                      <SelectTrigger className="w-[140px] bg-secondary border-border h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="false">Unresolved</SelectItem>
                        <SelectItem value="true">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {errorsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : errors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No errors found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead className="hidden md:table-cell">Endpoint</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.map(e => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{e.type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">{e.message}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                              {e.endpoint || '—'}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(e.createdAt)}</TableCell>
                            <TableCell>
                              {e.resolved ? (
                                <Badge variant="secondary" className="text-green-500">Resolved</Badge>
                              ) : (
                                <Badge variant="destructive">Unresolved</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!e.resolved && (
                                <Button size="sm" variant="outline" onClick={() => handleResolveError(e.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Backup Tab ── */}
        <TabsContent value="backup">
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" /> Database Backups
                    </CardTitle>
                    <CardDescription>Create and manage database backups</CardDescription>
                  </div>
                  <Button onClick={handleCreateBackup} disabled={creatingBackup}>
                    {creatingBackup ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Create Backup</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {backupLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No backups available</p>
                    <p className="text-sm">Create your first backup to get started</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backups.map(b => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium font-mono text-sm">{b.filename}</TableCell>
                            <TableCell>{formatBytes(b.size)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{b.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={b.status === 'completed' ? 'secondary' : b.status === 'failed' ? 'destructive' : 'outline'}
                                className={
                                  b.status === 'completed' ? 'text-green-500' :
                                  b.status === 'in_progress' ? 'text-yellow-500' : ''
                                }
                              >
                                {b.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(b.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteBackup(b.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Email Tab ── */}
        <TabsContent value="email">
          <div className="space-y-6">
            {/* Send email form */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Send Email
                </CardTitle>
                <CardDescription>Send emails from the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="recipient@example.com"
                      className="bg-secondary border-border"
                      type="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Type</Label>
                    <Select value={emailType} onValueChange={setEmailType}>
                      <SelectTrigger className="w-full bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome</SelectItem>
                        <SelectItem value="password_reset">Password Reset</SelectItem>
                        <SelectItem value="verification">Verification</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Email content..."
                    className="bg-secondary border-border min-h-[120px]"
                  />
                </div>
                <Button onClick={handleSendEmail} disabled={emailSending || !emailTo || !emailSubject}>
                  {emailSending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Email</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Email logs */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>History of sent emails</CardDescription>
              </CardHeader>
              <CardContent>
                {emailLogsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : emailLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No email logs yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>To</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {emailLogs.map(e => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium text-sm">{e.to}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{e.subject}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{e.type.replace('_', ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={e.status === 'sent' ? 'secondary' : 'destructive'}>
                                {e.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(e.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
