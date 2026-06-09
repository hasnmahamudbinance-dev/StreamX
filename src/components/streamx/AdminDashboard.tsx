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
  Lock, Key, Fingerprint, Monitor, Globe, Unlock,
  CreditCard, DollarSign, TrendingUp, Download as DownloadIcon, Megaphone, Tag,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
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

interface SecurityData {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  usersWith2FA: number;
  recentLogins: number;
  failedLogins: number;
  newDeviceLogins: number;
  lockedAccounts: number;
  activeSessions: number;
  passwordResets: number;
  emailVerificationRequests: number;
  recentActivity: {
    id: string;
    userId: string;
    action: string;
    deviceName: string | null;
    platform: string | null;
    browser: string | null;
    ipAddress: string | null;
    country: string | null;
    details: string | null;
    createdAt: string;
    user: { id: string; name: string; email: string } | null;
  }[];
  loginChartData: { date: string; successful: number; failed: number; newDevice: number }[];
  recentFailedLogins: {
    id: string;
    userId: string;
    action: string;
    ipAddress: string | null;
    deviceName: string | null;
    createdAt: string;
    user: { id: string; name: string; email: string } | null;
  }[];
  lockedAccountsList: {
    id: string;
    email: string;
    name: string;
    failedLoginAttempts: number;
    lockedUntil: string | null;
  }[];
  recentPasswordResets: {
    id: string;
    code: string;
    used: boolean;
    createdAt: string;
    expiresAt: string;
    user: { id: string; name: string; email: string } | null;
  }[];
}

interface SearchedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
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

  // Security
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityUserSearch, setSecurityUserSearch] = useState('');
  const [securitySearchResult, setSecuritySearchResult] = useState<SearchedUser | null>(null);
  const [securitySearching, setSecuritySearching] = useState(false);
  const [unlockingUserId, setUnlockingUserId] = useState<string | null>(null);

  // Analytics
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [contentAnalytics, setContentAnalytics] = useState<any>(null);
  const [exportType, setExportType] = useState('users');
  const [exportFormat, setExportFormat] = useState('csv');

  // Subscriptions
  const [adminSubs, setAdminSubs] = useState<any[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<any[]>([]);
  const [adminSubsLoading, setAdminSubsLoading] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponType, setNewCouponType] = useState('percentage');

  // Campaigns
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');
  const [newCampaignType, setNewCampaignType] = useState('custom');
  const [newCampaignAudience, setNewCampaignAudience] = useState('all');

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

  // ─── Analytics tab data ─────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/detailed');
      const data = await res.json();
      if (data.success) setAnalyticsData(data.data);
    } catch {} finally { setAnalyticsLoading(false); }
  }, []);

  const fetchContentAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/content');
      const data = await res.json();
      if (data.success) setContentAnalytics(data.data);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchAnalytics();
      fetchContentAnalytics();
    }
  }, [isAuthenticated, user?.role, fetchAnalytics, fetchContentAnalytics]);

  // ─── Subscriptions tab data ─────────────────────────────────

  const fetchAdminSubs = useCallback(async () => {
    setAdminSubsLoading(true);
    try {
      const [subsRes, couponsRes] = await Promise.all([
        fetch('/api/admin/subscriptions').then(r => r.json()),
        fetch('/api/admin/coupons').then(r => r.json()),
      ]);
      setAdminSubs(subsRes.subscriptions || []);
      setAdminCoupons(couponsRes.coupons || []);
    } catch {} finally { setAdminSubsLoading(false); }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchAdminSubs();
    }
  }, [isAuthenticated, user?.role, fetchAdminSubs]);

  // ─── Campaigns tab data ─────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch('/api/admin/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {} finally { setCampaignsLoading(false); }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchCampaigns();
    }
  }, [isAuthenticated, user?.role, fetchCampaigns]);

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

  // ─── Security tab data ─────────────────────────────────────

  const fetchSecurity = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const res = await fetch('/api/admin/security');
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setSecurityData(data);
      }
    } catch {
      // silently fail
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchSecurity();
    }
  }, [isAuthenticated, user?.role, fetchSecurity]);

  // ─── Security handlers ─────────────────────────────────────

  const handleSecurityUserSearch = async () => {
    if (!securityUserSearch) return;
    setSecuritySearching(true);
    setSecuritySearchResult(null);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(securityUserSearch)}&limit=1`);
      const data = await res.json();
      const found = data.users?.[0];
      if (found) {
        setSecuritySearchResult({
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role,
          status: found.status || 'active',
          failedLoginAttempts: found.failedLoginAttempts || 0,
          lockedUntil: found.lockedUntil || null,
          twoFactorEnabled: found.twoFactorEnabled || false,
          emailVerified: found.emailVerified || false,
        });
      } else {
        toast.error('User not found');
      }
    } catch {
      toast.error('Search failed');
    } finally {
      setSecuritySearching(false);
    }
  };

  const handleUnlockAccount = async (userId: string) => {
    setUnlockingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', failedLoginAttempts: 0, lockedUntil: null }),
      });
      if (res.ok) {
        toast.success('Account unlocked successfully');
        fetchSecurity();
        setSecuritySearchResult(prev => prev ? { ...prev, status: 'active', failedLoginAttempts: 0, lockedUntil: null } : null);
      } else {
        toast.error('Failed to unlock account');
      }
    } catch {
      toast.error('Failed to unlock account');
    } finally {
      setUnlockingUserId(null);
    }
  };

  // ─── Analytics handlers ─────────────────────────────────────

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/admin/analytics/export?type=${exportType}&format=${exportFormat}`);
      if (exportFormat === 'csv') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${exportType}-export.csv`;
        a.click(); URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${exportType}-export.json`;
        a.click(); URL.revokeObjectURL(url);
      }
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  // ─── Subscriptions handlers ─────────────────────────────────

  const handleCreateCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) return;
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCouponCode,
          discountType: newCouponType,
          discountValue: parseFloat(newCouponDiscount),
          maxUses: -1,
          active: true,
        }),
      });
      if (res.ok) {
        setNewCouponCode(''); setNewCouponDiscount(''); setNewCouponType('percentage');
        toast.success('Coupon created');
        fetchAdminSubs();
      }
    } catch { toast.error('Failed to create coupon'); }
  };

  // ─── Campaigns handlers ─────────────────────────────────────

  const handleCreateCampaign = async () => {
    if (!newCampaignName || !newCampaignSubject) return;
    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaignName,
          subject: newCampaignSubject,
          body: '<p>Email content</p>',
          type: newCampaignType,
          targetAudience: newCampaignAudience,
          status: 'draft',
        }),
      });
      if (res.ok) {
        setNewCampaignName(''); setNewCampaignSubject('');
        toast.success('Campaign created');
        fetchCampaigns();
      }
    } catch { toast.error('Failed to create campaign'); }
  };

  const handleSendCampaign = async (id: string) => {
    try {
      const res = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id }),
      });
      if (res.ok) {
        toast.success('Campaign sent');
        fetchCampaigns();
      }
    } catch { toast.error('Failed to send campaign'); }
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
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm"><Lock className="h-4 w-4" /> Security</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm"><TrendingUp className="h-4 w-4" /> Analytics</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5 text-xs sm:text-sm"><CreditCard className="h-4 w-4" /> Subscriptions</TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm"><Megaphone className="h-4 w-4" /> Campaigns</TabsTrigger>
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

        {/* ── Security Tab ── */}
        <TabsContent value="security">
          {securityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : securityData ? (
            <div className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-3xl font-bold">{securityData.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <div className="flex justify-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />{securityData.verifiedUsers} verified
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {securityData.unverifiedUsers} unverified
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Fingerprint className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-3xl font-bold">{securityData.usersWith2FA}</p>
                    <p className="text-sm text-muted-foreground">2FA Enabled</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {securityData.totalUsers > 0 ? ((securityData.usersWith2FA / securityData.totalUsers) * 100).toFixed(1) : 0}% adoption rate
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Monitor className="h-8 w-8 mx-auto text-sky-500 mb-2" />
                    <p className="text-3xl font-bold">{securityData.activeSessions}</p>
                    <p className="text-sm text-muted-foreground">Active Sessions</p>
                  </CardContent>
                </Card>
                <Card className={`bg-card border-border ${securityData.lockedAccounts > 0 ? 'border-red-500/50' : ''}`}>
                  <CardContent className="p-4 text-center">
                    <Lock className={`h-8 w-8 mx-auto mb-2 ${securityData.lockedAccounts > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <p className={`text-3xl font-bold ${securityData.lockedAccounts > 0 ? 'text-red-500' : ''}`}>{securityData.lockedAccounts}</p>
                    <p className="text-sm text-muted-foreground">Locked Accounts</p>
                    {securityData.lockedAccounts > 0 && (
                      <Badge variant="destructive" className="mt-1 text-xs">Action Required</Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Login Activity */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" /> Login Activity (24h)
                  </CardTitle>
                  <CardDescription>Authentication events in the last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                      <CheckCircle className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
                      <p className="text-2xl font-bold text-emerald-500">{securityData.recentLogins}</p>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                      <XCircle className="h-6 w-6 mx-auto text-red-500 mb-1" />
                      <p className="text-2xl font-bold text-red-500">{securityData.failedLogins}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
                      <AlertTriangle className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                      <p className="text-2xl font-bold text-amber-500">{securityData.newDeviceLogins}</p>
                      <p className="text-sm text-muted-foreground">New Devices</p>
                    </div>
                  </div>
                  {/* 7-day Login Chart */}
                  {securityData.loginChartData.length > 0 && (
                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={securityData.loginChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Legend />
                          <Bar dataKey="successful" name="Successful" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="newDevice" name="New Device" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Security Events */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" /> Recent Security Events
                      </CardTitle>
                      <CardDescription>Latest 20 security-relevant activity entries</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchSecurity}>
                      <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {securityData.recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No security events recorded</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>IP</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {securityData.recentActivity.map(a => {
                            const severity =
                              a.action === 'login_failed' ? 'red' :
                              a.action === 'login' ? 'green' :
                              ['new_device', '2fa_disabled', 'email_change', 'password_change'].includes(a.action) ? 'amber' : 'default';
                            return (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs whitespace-nowrap">
                                  {formatDate(a.createdAt)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {a.user?.name || 'Unknown'}
                                  <p className="text-xs text-muted-foreground">{a.user?.email}</p>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      severity === 'red' ? 'border-red-500/50 text-red-500' :
                                      severity === 'green' ? 'border-emerald-500/50 text-emerald-500' :
                                      severity === 'amber' ? 'border-amber-500/50 text-amber-500' : ''
                                    }
                                  >
                                    {a.action.replace(/_/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {a.deviceName || a.platform || a.browser || '—'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {a.ipAddress || '—'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions + Security Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" /> Quick Actions
                    </CardTitle>
                    <CardDescription>Search users and manage account security</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={securityUserSearch}
                        onChange={(e) => setSecurityUserSearch(e.target.value)}
                        placeholder="Search by email..."
                        className="bg-secondary border-border"
                        onKeyDown={(e) => e.key === 'Enter' && handleSecurityUserSearch()}
                      />
                      <Button variant="outline" onClick={handleSecurityUserSearch} disabled={securitySearching}>
                        {securitySearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>

                    {securitySearchResult && (
                      <div className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{securitySearchResult.name}</p>
                            <p className="text-sm text-muted-foreground">{securitySearchResult.email}</p>
                          </div>
                          <Badge variant={securitySearchResult.status === 'active' ? 'default' : 'destructive'}>
                            {securitySearchResult.status}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Role:</span>{' '}
                            <Badge variant="secondary" className="text-xs">{securitySearchResult.role}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email:</span>{' '}
                            <Badge variant={securitySearchResult.emailVerified ? 'default' : 'outline'} className="text-xs">
                              {securitySearchResult.emailVerified ? 'Verified' : 'Unverified'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">2FA:</span>{' '}
                            <Badge variant={securitySearchResult.twoFactorEnabled ? 'default' : 'outline'} className="text-xs">
                              {securitySearchResult.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Failed Attempts:</span>{' '}
                            <span className={securitySearchResult.failedLoginAttempts > 0 ? 'text-red-500 font-medium' : ''}>
                              {securitySearchResult.failedLoginAttempts}
                            </span>
                          </div>
                        </div>
                        {securitySearchResult.lockedUntil && (
                          <div className="flex items-center gap-2 text-sm text-red-500">
                            <Lock className="h-4 w-4" />
                            <span>Locked until {formatDate(securitySearchResult.lockedUntil)}</span>
                          </div>
                        )}
                        {(securitySearchResult.status !== 'active' || securitySearchResult.lockedUntil) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleUnlockAccount(securitySearchResult.id)}
                            disabled={unlockingUserId === securitySearchResult.id}
                          >
                            {unlockingUserId === securitySearchResult.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Unlock className="h-4 w-4 mr-2" />
                            )}
                            Unlock Account
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Locked Accounts Quick Unlock */}
                    {securityData.lockedAccountsList.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-500 flex items-center gap-1">
                          <Lock className="h-4 w-4" /> Locked Accounts
                        </p>
                        {securityData.lockedAccountsList.map(u => (
                          <div key={u.id} className="flex items-center justify-between border border-red-500/20 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email} · {u.failedLoginAttempts} failed attempts</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnlockAccount(u.id)}
                              disabled={unlockingUserId === u.id}
                            >
                              {unlockingUserId === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unlock className="h-3 w-3 mr-1" />
                              )}
                              Unlock
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Security Alerts */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> Security Alerts
                    </CardTitle>
                    <CardDescription>Recent security concerns requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Failed Login Attempts */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" /> Recent Failed Logins
                      </p>
                      {securityData.recentFailedLogins.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-5">No failed login attempts in the last 24h</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {securityData.recentFailedLogins.map(f => (
                            <div key={f.id} className="flex items-center justify-between text-sm bg-red-500/5 border border-red-500/10 rounded px-3 py-2">
                              <div>
                                <span className="font-medium">{f.user?.email || 'Unknown'}</span>
                                <span className="text-muted-foreground ml-2">from {f.ipAddress || 'unknown IP'}</span>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(f.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Locked Accounts */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Lock className="h-4 w-4 text-red-500" /> Locked Accounts
                      </p>
                      {securityData.lockedAccountsList.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-5">No locked accounts</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {securityData.lockedAccountsList.map(u => (
                            <div key={u.id} className="flex items-center justify-between text-sm bg-red-500/5 border border-red-500/10 rounded px-3 py-2">
                              <div>
                                <span className="font-medium">{u.email}</span>
                                <span className="text-muted-foreground ml-2">{u.failedLoginAttempts} attempts</span>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                until {u.lockedUntil ? formatDate(u.lockedUntil) : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Password Reset Requests */}
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Key className="h-4 w-4 text-amber-500" /> Password Reset Requests (24h)
                      </p>
                      {securityData.recentPasswordResets.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-5">No pending password resets</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {securityData.recentPasswordResets.map(r => (
                            <div key={r.id} className="flex items-center justify-between text-sm bg-amber-500/5 border border-amber-500/10 rounded px-3 py-2">
                              <div>
                                <span className="font-medium">{r.user?.email || 'Unknown'}</span>
                                <span className="text-muted-foreground ml-2">expires {formatDate(r.expiresAt)}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">{r.used ? 'Used' : 'Pending'}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold">{securityData.passwordResets}</p>
                        <p className="text-muted-foreground">Password Resets (24h)</p>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold">{securityData.emailVerificationRequests}</p>
                        <p className="text-muted-foreground">Email Verifications (24h)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center text-muted-foreground">
                Failed to load security data
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : analyticsData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.dau ?? 0}</p>
                      <p className="text-sm text-muted-foreground">DAU</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.mau ?? 0}</p>
                      <p className="text-sm text-muted-foreground">MAU</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.totalUsers ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.newUsersToday ?? 0}</p>
                      <p className="text-sm text-muted-foreground">New Today</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.newUsersThisWeek ?? 0}</p>
                      <p className="text-sm text-muted-foreground">New This Week</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.newUsersThisMonth ?? 0}</p>
                      <p className="text-sm text-muted-foreground">New This Month</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <CreditCard className="h-6 w-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">{analyticsData.activeSubscriptions ?? 0}</p>
                      <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                      <p className="text-2xl font-bold">${(analyticsData.revenue ?? 0).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <Badge variant="outline" className="text-red-500 border-red-500/30">
                        {(analyticsData.churnRate ?? 0).toFixed(1)}%
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">Churn Rate</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        {(analyticsData.retentionRate ?? 0).toFixed(1)}%
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">Retention Rate</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Data Export */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DownloadIcon className="h-5 w-5" /> Data Export
                    </CardTitle>
                    <CardDescription>Export platform data in CSV or JSON format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={exportType} onValueChange={setExportType}>
                          <SelectTrigger className="w-[160px] bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="users">Users</SelectItem>
                            <SelectItem value="content">Content</SelectItem>
                            <SelectItem value="revenue">Revenue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Select value={exportFormat} onValueChange={setExportFormat}>
                          <SelectTrigger className="w-[160px] bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleExport} className="gap-2">
                        <DownloadIcon className="h-4 w-4" /> Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Content Analytics */}
                {contentAnalytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Film className="h-5 w-5" /> Most Watched Movies
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto max-h-80 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="text-right">Views</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(contentAnalytics.mostWatchedMovies || []).map((m: any, i: number) => (
                                <TableRow key={m.id || i}>
                                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                  <TableCell className="font-medium">{m.title}</TableCell>
                                  <TableCell className="text-right">{m.views}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Film className="h-5 w-5" /> Most Watched TV Shows
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto max-h-80 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="text-right">Views</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(contentAnalytics.mostWatchedTVShows || []).map((s: any, i: number) => (
                                <TableRow key={s.id || i}>
                                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                  <TableCell className="font-medium">{s.title}</TableCell>
                                  <TableCell className="text-right">{s.views}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Failed to load analytics data
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Subscriptions Tab ── */}
        <TabsContent value="subscriptions">
          <div className="space-y-6">
            {adminSubsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" /> Subscriptions
                    </CardTitle>
                    <CardDescription>All user subscriptions on the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User Email</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Period End</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminSubs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No subscriptions found
                              </TableCell>
                            </TableRow>
                          ) : (
                            adminSubs.map((sub: any) => (
                              <TableRow key={sub.id}>
                                <TableCell className="font-medium">{sub.user?.email || 'Unknown'}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{sub.plan?.displayName || sub.plan?.name || 'Unknown'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      sub.status === 'active' ? 'border-emerald-500/50 text-emerald-500' :
                                      sub.status === 'trial' ? 'border-amber-500/50 text-amber-500' :
                                      sub.status === 'cancelled' ? 'border-red-500/50 text-red-500' :
                                      'border-muted-foreground/30 text-muted-foreground'
                                    }
                                  >
                                    {sub.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline" onClick={() => { navigate('billing'); }}>
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Coupons Management */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" /> Coupons
                    </CardTitle>
                    <CardDescription>Manage discount coupons for subscriptions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Uses</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminCoupons.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                No coupons found
                              </TableCell>
                            </TableRow>
                          ) : (
                            adminCoupons.map((coupon: any) => (
                              <TableRow key={coupon.id}>
                                <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{coupon.discountType}</Badge>
                                </TableCell>
                                <TableCell>
                                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
                                </TableCell>
                                <TableCell className="text-sm">{coupon.timesUsed ?? 0}/{coupon.maxUses === -1 ? '∞' : coupon.maxUses}</TableCell>
                                <TableCell>
                                  <Badge variant={coupon.active ? 'default' : 'outline'}>
                                    {coupon.active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-3">Create New Coupon</p>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Code</Label>
                          <Input
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                            placeholder="SAVE20"
                            className="w-32 bg-secondary border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select value={newCouponType} onValueChange={setNewCouponType}>
                            <SelectTrigger className="w-[140px] bg-secondary border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Value</Label>
                          <Input
                            value={newCouponDiscount}
                            onChange={(e) => setNewCouponDiscount(e.target.value)}
                            placeholder={newCouponType === 'percentage' ? '20' : '5.00'}
                            type="number"
                            className="w-24 bg-secondary border-border"
                          />
                        </div>
                        <Button onClick={handleCreateCoupon} disabled={!newCouponCode || !newCouponDiscount}>
                          <Plus className="h-4 w-4 mr-1" /> Create
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Campaigns Tab ── */}
        <TabsContent value="campaigns">
          <div className="space-y-6">
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5" /> Email Campaigns
                    </CardTitle>
                    <CardDescription>Manage email marketing campaigns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Audience</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead>Opens</TableHead>
                            <TableHead>Clicks</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaigns.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                No campaigns found
                              </TableCell>
                            </TableRow>
                          ) : (
                            campaigns.map((c: any) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{c.type?.replace(/_/g, ' ')}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{c.targetAudience}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      c.status === 'sent' ? 'border-emerald-500/50 text-emerald-500' :
                                      c.status === 'draft' ? 'border-amber-500/50 text-amber-500' :
                                      c.status === 'sending' ? 'border-blue-500/50 text-blue-500' :
                                      'border-muted-foreground/30 text-muted-foreground'
                                    }
                                  >
                                    {c.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{c.recipientCount ?? '—'}</TableCell>
                                <TableCell className="text-sm">{c.openCount ?? 0}</TableCell>
                                <TableCell className="text-sm">{c.clickCount ?? 0}</TableCell>
                                <TableCell className="text-right">
                                  {c.status === 'draft' && (
                                    <Button size="sm" variant="outline" onClick={() => handleSendCampaign(c.id)}>
                                      <Send className="h-3 w-3 mr-1" /> Send
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Create Campaign */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" /> Create Campaign
                    </CardTitle>
                    <CardDescription>Create a new email marketing campaign</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Campaign Name</Label>
                        <Input
                          value={newCampaignName}
                          onChange={(e) => setNewCampaignName(e.target.value)}
                          placeholder="Weekly Recommendations"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input
                          value={newCampaignSubject}
                          onChange={(e) => setNewCampaignSubject(e.target.value)}
                          placeholder="Check out what's new this week!"
                          className="bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Campaign Type</Label>
                        <Select value={newCampaignType} onValueChange={setNewCampaignType}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly_recommendations">Weekly Recommendations</SelectItem>
                            <SelectItem value="watchlist_reminder">Watchlist Reminder</SelectItem>
                            <SelectItem value="new_releases">New Releases</SelectItem>
                            <SelectItem value="continue_watching">Continue Watching</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <Select value={newCampaignAudience} onValueChange={setNewCampaignAudience}>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="free">Free Users</SelectItem>
                            <SelectItem value="premium">Premium Users</SelectItem>
                            <SelectItem value="inactive">Inactive Users</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button onClick={handleCreateCampaign} disabled={!newCampaignName || !newCampaignSubject}>
                        <Plus className="h-4 w-4 mr-1" /> Create Campaign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
