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
  XCircle, Eye, EyeOff, Save, Activity, ScrollText, Flag, Headphones, MessageSquare,
} from 'lucide-react';
import { ContentManager } from './ContentManager';
import { toast } from 'sonner';
import type { HealthStatus, AuditLogItem, ContentReportItem, SupportTicketItem, EnhancedAnalytics, SecurityOverview, UserDeviceInfo } from '@/lib/types';

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

  // Health
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthAutoRefresh, setHealthAutoRefresh] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('all');

  // Reports
  const [reports, setReports] = useState<ContentReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFilter, setReportsFilter] = useState('all');

  // Support
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportFilter, setSupportFilter] = useState('all');
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketReply, setTicketReply] = useState('');

  // Analytics
  const [enhancedAnalytics, setEnhancedAnalytics] = useState<EnhancedAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Security
  const [securityData, setSecurityData] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<any[]>([]);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [rateLimitFilter, setRateLimitFilter] = useState('all');

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

  // ─── Health tab data ────────────────────────────────────────

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch {
      // silently fail
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (healthAutoRefresh) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [healthAutoRefresh, fetchHealth]);

  // ─── Audit Logs tab data ────────────────────────────────────

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(auditPage));
      params.set('limit', '50');
      if (auditActionFilter !== 'all') params.set('action', auditActionFilter);
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();
      setAuditLogs(data.logs || []);
      setAuditTotal(data.total || 0);
    } catch {
      // silently fail
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditActionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // ─── Reports tab data ───────────────────────────────────────

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (reportsFilter !== 'all') params.set('status', reportsFilter);
      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      // silently fail
    } finally {
      setReportsLoading(false);
    }
  }, [reportsFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ─── Support tab data ───────────────────────────────────────

  const fetchSupportTickets = useCallback(async () => {
    setSupportLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (supportFilter !== 'all') params.set('status', supportFilter);
      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      const data = await res.json();
      setSupportTickets(data.tickets || []);
    } catch {
      // silently fail
    } finally {
      setSupportLoading(false);
    }
  }, [supportFilter]);

  useEffect(() => {
    fetchSupportTickets();
  }, [fetchSupportTickets]);

  // ─── Analytics tab data ─────────────────────────────────────

  const fetchEnhancedAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/enhanced');
      const data = await res.json();
      setEnhancedAnalytics(data);
    } catch {
      // silently fail
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchEnhancedAnalytics();
    }
  }, [isAuthenticated, user?.role, fetchEnhancedAnalytics]);

  // ─── Security tab data ──────────────────────────────────────

  const fetchSecurityData = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const [securityRes, devicesRes, rateLimitsRes] = await Promise.all([
        fetch('/api/admin/security').then(r => r.ok ? r.json() : {}),
        fetch('/api/admin/devices').then(r => r.ok ? r.json() : { devices: [] }),
        fetch(`/api/admin/rate-limits?limit=100${rateLimitFilter !== 'all' ? '&blocked=true' : ''}`).then(r => r.ok ? r.json() : { logs: [] }),
      ]);
      setSecurityData(securityRes);
      setDevices((devicesRes as Record<string, unknown>).devices ? (devicesRes as Record<string, unknown>).devices as unknown[] : securityRes?.activeDevices || []);
      setRateLimits(rateLimitsRes?.logs || securityRes?.rateLimitViolations?.recent || []);
    } catch {
      // silently fail
    } finally {
      setSecurityLoading(false);
    }
  }, [rateLimitFilter]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchSecurityData();
    }
  }, [isAuthenticated, user?.role, fetchSecurityData]);

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

  // ─── Reports handlers ──────────────────────────────────────

  const handleUpdateReportStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Report ${status}`);
        fetchReports();
      } else {
        toast.error('Failed to update report');
      }
    } catch {
      toast.error('Failed to update report');
    }
  };

  // ─── Support handlers ───────────────────────────────────────

  const handleReplyToTicket = async (ticketId: string) => {
    if (!ticketReply.trim()) return;
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: ticketReply, isAdmin: true }),
      });
      if (res.ok) {
        setTicketReply('');
        toast.success('Reply sent');
        fetchSupportTickets();
      } else {
        toast.error('Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      if (res.ok) {
        toast.success('Ticket closed');
        fetchSupportTickets();
      } else {
        toast.error('Failed to close ticket');
      }
    } catch {
      toast.error('Failed to close ticket');
    }
  };

  // ─── Security handlers ──────────────────────────────────────

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      const res = await fetch('/api/admin/devices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      if (res.ok) {
        toast.success('Device revoked');
        fetchSecurityData();
      }
    } catch {
      toast.error('Failed to revoke device');
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
            <TabsTrigger value="health" className="gap-1.5 text-xs sm:text-sm"><Activity className="h-4 w-4" /> Health</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm"><ScrollText className="h-4 w-4" /> Audit</TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm"><Flag className="h-4 w-4" /> Reports</TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5 text-xs sm:text-sm"><Headphones className="h-4 w-4" /> Support</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm"><Shield className="h-4 w-4" /> Security</TabsTrigger>
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

        {/* ── Health Monitor Tab ── */}
        <TabsContent value="health">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">System Health</h3>
                {healthData && (
                  <Badge className={
                    healthData.status === 'healthy' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                    healthData.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                    'bg-red-500/20 text-red-500 border-red-500/30'
                  }>
                    {healthData.status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="health-autorefresh" className="text-sm">Auto-refresh</Label>
                  <Switch id="health-autorefresh" checked={healthAutoRefresh} onCheckedChange={setHealthAutoRefresh} />
                </div>
                <Button variant="outline" size="sm" onClick={fetchHealth} disabled={healthLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${healthLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>

            {healthLoading && !healthData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : healthData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DB Check */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="h-4 w-4" /> Database Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className={
                          healthData.checks.db.status === 'ok' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                          'bg-red-500/20 text-red-500 border-red-500/30'
                        }>
                          {healthData.checks.db.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{healthData.checks.db.responseTime}ms</span>
                      </div>
                      {healthData.checks.db.details && (
                        <p className="text-xs text-muted-foreground mt-2">{healthData.checks.db.details}</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* TMDB Check */}
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Film className="h-4 w-4" /> TMDB Check
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className={
                          healthData.checks.tmdb.status === 'ok' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                          'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                        }>
                          {healthData.checks.tmdb.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{healthData.checks.tmdb.responseTime}ms</span>
                      </div>
                      {healthData.checks.tmdb.details && (
                        <p className="text-xs text-muted-foreground mt-2">{healthData.checks.tmdb.details}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* System Info */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">System Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Uptime</p>
                        <p className="font-medium">{(() => {
                          const d = Math.floor(healthData.uptime / 86400);
                          const h = Math.floor((healthData.uptime % 86400) / 3600);
                          const m = Math.floor((healthData.uptime % 3600) / 60);
                          return `${d}d ${h}h ${m}m`;
                        })()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Memory</p>
                        <p className="font-medium">{formatBytes(healthData.system.memory.heapUsed)} / {formatBytes(healthData.system.memory.heapTotal)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Node Version</p>
                        <p className="font-medium">{healthData.system.nodeVersion}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Environment</p>
                        <p className="font-medium">{healthData.system.environment}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Failed to load health data
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Audit Logs Tab ── */}
        <TabsContent value="audit">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5" /> Audit Logs
                  </CardTitle>
                  <CardDescription>Track admin and system actions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={auditActionFilter} onValueChange={(v) => { setAuditActionFilter(v); setAuditPage(1); }}>
                    <SelectTrigger className="w-[160px] bg-secondary border-border">
                      <SelectValue placeholder="Filter action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="user_create">User Create</SelectItem>
                      <SelectItem value="user_update">User Update</SelectItem>
                      <SelectItem value="user_delete">User Delete</SelectItem>
                      <SelectItem value="content_create">Content Create</SelectItem>
                      <SelectItem value="content_update">Content Update</SelectItem>
                      <SelectItem value="content_delete">Content Delete</SelectItem>
                      <SelectItem value="settings_update">Settings Update</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.user?.name || 'System'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{log.action.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate text-muted-foreground">{log.details || '-'}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing page {auditPage} ({auditTotal} total)
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>Previous</Button>
                      <Button variant="outline" size="sm" disabled={auditPage * 50 >= auditTotal} onClick={() => setAuditPage(p => p + 1)}>Next</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports Tab ── */}
        <TabsContent value="reports">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="h-5 w-5" /> Content Reports
                  </CardTitle>
                  <CardDescription>Review and manage reported content</CardDescription>
                </div>
                <Select value={reportsFilter} onValueChange={setReportsFilter}>
                  <SelectTrigger className="w-[160px] bg-secondary border-border">
                    <SelectValue placeholder="Filter status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No reports found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm max-w-[120px] truncate">{r.contentId}</TableCell>
                          <TableCell className="capitalize text-sm">{r.contentType}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${
                              r.reason === 'copyright' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                              r.reason === 'inappropriate' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                              r.reason === 'broken' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                              'bg-gray-500/20 text-gray-500 border-gray-500/30'
                            }`}>
                              {r.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{r.user?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <Badge className={`capitalize ${
                              r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                              r.status === 'reviewed' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                              r.status === 'resolved' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                              'bg-gray-500/20 text-gray-500 border-gray-500/30'
                            }`}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.status !== 'resolved' && (
                                <Button size="sm" variant="outline" onClick={() => handleUpdateReportStatus(r.id, 'resolved')}>Resolve</Button>
                              )}
                              {r.status !== 'dismissed' && (
                                <Button size="sm" variant="ghost" onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}>Dismiss</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Support Tab ── */}
        <TabsContent value="support">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="h-5 w-5" /> Support Tickets
                  </CardTitle>
                  <CardDescription>Manage user support requests</CardDescription>
                </div>
                <Select value={supportFilter} onValueChange={setSupportFilter}>
                  <SelectTrigger className="w-[160px] bg-secondary border-border">
                    <SelectValue placeholder="Filter status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {supportLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : supportTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Headphones className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No support tickets found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supportTickets.map(t => (
                    <div key={t.id} className="border border-border rounded-lg">
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.subject}</p>
                          <p className="text-sm text-muted-foreground">{t.user?.name || 'Unknown'} &middot; {t.category}</p>
                        </div>
                        <Badge className={`capitalize ${
                          t.priority === 'low' ? 'bg-gray-500/20 text-gray-500 border-gray-500/30' :
                          t.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                          'bg-red-500/20 text-red-500 border-red-500/30'
                        }`}>
                          {t.priority}
                        </Badge>
                        <Badge className={`capitalize ${
                          t.status === 'open' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                          t.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                          t.status === 'resolved' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                          'bg-gray-500/20 text-gray-500 border-gray-500/30'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(t.createdAt)}</span>
                      </div>

                      {expandedTicket === t.id && (
                        <div className="border-t border-border p-4 space-y-4">
                          {/* Ticket description */}
                          <div className="text-sm">
                            <p className="font-medium mb-1">Description</p>
                            <p className="text-muted-foreground">{t.description}</p>
                          </div>

                          {/* Messages */}
                          {t.messages && t.messages.length > 0 && (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              <p className="text-sm font-medium">Messages</p>
                              {t.messages.map(msg => (
                                <div key={msg.id} className={`rounded-lg p-3 text-sm ${msg.isAdmin ? 'bg-primary/10 ml-8' : 'bg-secondary mr-8'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{msg.user?.name || 'User'}</span>
                                    {msg.isAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
                                    <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
                                  </div>
                                  <p className="text-muted-foreground">{msg.message}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply form */}
                          <div className="flex gap-2">
                            <Textarea
                              value={expandedTicket === t.id ? ticketReply : ''}
                              onChange={(e) => setTicketReply(e.target.value)}
                              placeholder="Type your reply..."
                              className="bg-secondary border-border min-h-[60px] flex-1"
                            />
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => handleReplyToTicket(t.id)} disabled={!ticketReply.trim()}>
                                <Send className="h-4 w-4 mr-1" /> Reply
                              </Button>
                              {t.status !== 'resolved' && t.status !== 'closed' && (
                                <Button size="sm" variant="outline" onClick={() => handleCloseTicket(t.id)}>
                                  <XCircle className="h-4 w-4 mr-1" /> Close
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : enhancedAnalytics ? (
            <div className="space-y-6">
              {/* User Analytics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">User Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.dau}</p>
                      <p className="text-xs text-muted-foreground">DAU</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.wau}</p>
                      <p className="text-xs text-muted-foreground">WAU</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.mau}</p>
                      <p className="text-xs text-muted-foreground">MAU</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.retentionRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Retention</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.newUsersToday}</p>
                      <p className="text-xs text-muted-foreground">New Today</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.newUsersThisWeek}</p>
                      <p className="text-xs text-muted-foreground">New This Week</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.newUsersThisMonth}</p>
                      <p className="text-xs text-muted-foreground">New This Month</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Content Analytics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Content Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Watched Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>Views</TableHead>
                              <TableHead>Avg Completion</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enhancedAnalytics.topWatchedContent.map((c) => (
                              <TableRow key={c.contentId}>
                                <TableCell className="font-medium max-w-[200px] truncate">{c.title}</TableCell>
                                <TableCell>{c.viewCount}</TableCell>
                                <TableCell>{c.avgCompletion.toFixed(0)}%</TableCell>
                              </TableRow>
                            ))}
                            {enhancedAnalytics.topWatchedContent.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">No data</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Genres</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {enhancedAnalytics.topGenres.slice(0, 8).map((g) => {
                          const maxCount = Math.max(...enhancedAnalytics.topGenres.map(x => x.count), 1);
                          const width = (g.count / maxCount) * 100;
                          return (
                            <div key={g.genre} className="flex items-center gap-2">
                              <span className="text-sm w-24 truncate">{g.genre}</span>
                              <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
                                <div className="h-full bg-primary rounded" style={{ width: `${width}%` }} />
                              </div>
                              <span className="text-sm text-muted-foreground w-8 text-right">{g.count}</span>
                            </div>
                          );
                        })}
                        {enhancedAnalytics.topGenres.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">No data</p>
                        )}
                      </div>
                      <Separator className="my-3" />
                      <div>
                        <span className="text-sm text-muted-foreground">Average Completion Rate: </span>
                        <span className="text-sm font-semibold">{enhancedAnalytics.averageCompletionRate.toFixed(1)}%</span>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${enhancedAnalytics.averageCompletionRate}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Engagement Analytics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Engagement Analytics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.totalPlayEvents}</p>
                      <p className="text-xs text-muted-foreground">Play Events</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.totalCompleteEvents}</p>
                      <p className="text-xs text-muted-foreground">Complete Events</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{Math.round(enhancedAnalytics.averageWatchDuration)}m</p>
                      <p className="text-xs text-muted-foreground">Avg Watch Duration</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{enhancedAnalytics.searchToPlayRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Search-to-Play Rate</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Peak Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-1 h-24">
                      {enhancedAnalytics.peakHours.map(({ hour, count }) => {
                        const maxCount = Math.max(...enhancedAnalytics.peakHours.map(h => h.count), 1);
                        const height = (count / maxCount) * 100;
                        return (
                          <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-primary rounded-t"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${hour}:00 - ${count} events`}
                            />
                            {hour % 4 === 0 && (
                              <span className="text-[9px] text-muted-foreground">{hour}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search Analytics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Search Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Top Searches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {enhancedAnalytics.topSearches.map((s, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="truncate max-w-[200px]">{s.query}</span>
                            <span className="text-muted-foreground">{s.count}</span>
                          </div>
                        ))}
                        {enhancedAnalytics.topSearches.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">No data</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Zero-Result Searches</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {enhancedAnalytics.zeroResultSearches.map((s, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="truncate max-w-[200px]">{s.query}</span>
                            <span className="text-muted-foreground">{s.count}</span>
                          </div>
                        ))}
                        {enhancedAnalytics.zeroResultSearches.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">No zero-result searches</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Device Analytics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Device Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { label: 'Desktop', value: enhancedAnalytics.deviceBreakdown.desktop, color: 'bg-blue-500' },
                          { label: 'Mobile', value: enhancedAnalytics.deviceBreakdown.mobile, color: 'bg-green-500' },
                          { label: 'Tablet', value: enhancedAnalytics.deviceBreakdown.tablet, color: 'bg-orange-500' },
                        ].map(({ label, value, color }) => {
                          const total = enhancedAnalytics.deviceBreakdown.desktop + enhancedAnalytics.deviceBreakdown.mobile + enhancedAnalytics.deviceBreakdown.tablet;
                          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{label}</span>
                                <span className="text-muted-foreground">{value} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Browser Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {enhancedAnalytics.browserBreakdown.map((b, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span>{b.browser}</span>
                            <span className="text-muted-foreground">{b.count}</span>
                          </div>
                        ))}
                        {enhancedAnalytics.browserBreakdown.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">No data</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center text-muted-foreground">
                Failed to load analytics data
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="security">
          {securityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Security Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="text-2xl font-bold">{securityData?.activeDeviceCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Active Devices</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <p className="text-2xl font-bold">{securityData?.rateLimitViolations?.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Rate Limit Violations</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                    <p className="text-2xl font-bold">{securityData?.rateLimitViolations?.last24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Recent Violations (24h)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Devices Table */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Active Devices</CardTitle>
                  <CardDescription>Manage authenticated user devices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Browser</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Last Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {devices.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.userName || d.user?.name || 'Unknown'}</TableCell>
                            <TableCell>{d.browser || '-'}</TableCell>
                            <TableCell>{d.os || '-'}</TableCell>
                            <TableCell>{d.device || '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{d.ipAddress || '-'}</TableCell>
                            <TableCell>{formatDate(d.lastActive)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="destructive" onClick={() => handleRevokeDevice(d.id)}>
                                <Trash2 className="h-3 w-3 mr-1" /> Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {devices.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">No active devices</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Rate Limit Logs */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Rate Limit Logs</CardTitle>
                      <CardDescription>Monitor rate-limited requests</CardDescription>
                    </div>
                    <Select value={rateLimitFilter} onValueChange={setRateLimitFilter}>
                      <SelectTrigger className="w-[150px] bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="blocked">Blocked Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Requests</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Window Start</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rateLimits.map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{r.ipAddress || '-'}</TableCell>
                            <TableCell>{r.endpoint || '-'}</TableCell>
                            <TableCell>{r.requests ?? '-'}</TableCell>
                            <TableCell>
                              <Badge variant={r.blocked ? 'destructive' : 'secondary'}>
                                {r.blocked ? 'Blocked' : 'Allowed'}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.windowStart ? formatDate(r.windowStart) : '-'}</TableCell>
                          </TableRow>
                        ))}
                        {rateLimits.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">No rate limit logs</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
