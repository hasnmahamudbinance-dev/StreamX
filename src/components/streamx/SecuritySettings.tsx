'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Smartphone,
  Mail,
  Monitor,
  Tablet,
  Clock,
  Globe,
  Chrome,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  QrCode,
  Copy,
  Download,
  RefreshCw,
  User,
  Baby,
  Fingerprint,
  Search,
  Play,
  ChevronDown,
  ChevronUp,
  Activity,
  LogIn,
  Settings,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile, DeviceSession } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────

interface SecurityOverviewData {
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  activeSessions: number;
  lastPasswordChange: string | null;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  action: string;
  deviceName: string | null;
  platform: string | null;
  browser: string | null;
  ipAddress: string | null;
  country: string | null;
  details: string | null;
  createdAt: string;
}

interface ProfileWithRestrictions extends UserProfile {
  pin: string | null;
  maxRating: string | null;
  allowedGenres: string | null;
  restrictedGenres: string | null;
  searchRestricted: boolean;
  playbackRestricted: boolean;
  profileLocked: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
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

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local : local[0] + '***' + local[local.length - 1];
  return `${visible}@${domain}`;
}

function getSecurityScore(data: SecurityOverviewData): { score: number; label: string; color: string; icon: typeof Shield } {
  let score = 0;
  if (data.emailVerified) score += 25;
  if (data.twoFactorEnabled) score += 35;
  if (data.activeSessions <= 2) score += 20;
  if (data.lastPasswordChange) score += 20;
  else score += 5;

  if (score <= 25) return { score, label: 'Weak', color: 'text-red-500', icon: ShieldAlert };
  if (score <= 50) return { score, label: 'Fair', color: 'text-orange-500', icon: ShieldAlert };
  if (score <= 75) return { score, label: 'Strong', color: 'text-yellow-500', icon: ShieldCheck };
  return { score, label: 'Very Strong', color: 'text-green-500', icon: ShieldCheck };
}

function getActivityIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('sign_in')) return LogIn;
  if (a.includes('2fa') || a.includes('two_factor')) return Shield;
  if (a.includes('password') || a.includes('pin')) return KeyRound;
  if (a.includes('email')) return Mail;
  if (a.includes('session') || a.includes('device')) return Smartphone;
  if (a.includes('profile')) return User;
  return Activity;
}

function getProgressColor(score: number): string {
  if (score <= 25) return '[&>div]:bg-red-500';
  if (score <= 50) return '[&>div]:bg-orange-500';
  if (score <= 75) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western',
];

const RATING_OPTIONS = [
  { value: 'G', label: 'G — General Audiences' },
  { value: 'PG', label: 'PG — Parental Guidance' },
  { value: 'PG-13', label: 'PG-13 — Parents Strongly Cautioned' },
  { value: 'R', label: 'R — Restricted' },
  { value: 'NC-17', label: 'NC-17 — Adults Only' },
];

// ─── Tab Content Components ──────────────────────────────────────────

function OverviewTab({
  overview,
  loading,
  onNavigate,
}: {
  overview: SecurityOverviewData | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  const secScore = getSecurityScore(overview);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Security Score Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className={`flex-shrink-0 p-4 rounded-full ${secScore.score <= 50 ? 'bg-red-500/10' : secScore.score <= 75 ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
              <secScore.icon className={`h-10 w-10 ${secScore.color}`} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold">Security Score</h3>
              <div className="flex items-center gap-3 mt-2">
                <Progress value={secScore.score} className={`flex-1 h-2.5 ${getProgressColor(secScore.score)}`} />
                <span className={`text-sm font-bold ${secScore.color}`}>{secScore.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {secScore.score <= 25 && 'Your account needs better protection. Enable 2FA and verify your email.'}
                {secScore.score > 25 && secScore.score <= 50 && 'Your account security is fair. Enable 2FA for better protection.'}
                {secScore.score > 50 && secScore.score <= 75 && 'Your account is well protected. Consider adding more security features.'}
                {secScore.score > 75 && 'Excellent! Your account has strong security measures in place.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overview.emailVerified ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Email Verified</p>
                <p className="text-xs text-muted-foreground truncate">{maskEmail(overview.email)}</p>
              </div>
              {overview.emailVerified ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overview.twoFactorEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Two-Factor Auth</p>
                <p className="text-xs text-muted-foreground">
                  {overview.twoFactorEnabled ? `Enabled (${overview.twoFactorMethod})` : 'Not enabled'}
                </p>
              </div>
              {overview.twoFactorEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Active Sessions</p>
                <p className="text-xs text-muted-foreground">
                  {overview.activeSessions} device{overview.activeSessions !== 1 ? 's' : ''} signed in
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">{overview.activeSessions}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Last Password Change</p>
                <p className="text-xs text-muted-foreground">
                  {overview.lastPasswordChange ? formatRelativeTime(overview.lastPasswordChange) : 'Never changed'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {!overview.twoFactorEnabled && (
              <Button
                variant="outline"
                className="gap-2 justify-start h-auto py-3"
                onClick={() => onNavigate('2fa')}
              >
                <Shield className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Enable 2FA</p>
                  <p className="text-xs text-muted-foreground">Add extra security</p>
                </div>
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2 justify-start h-auto py-3"
              onClick={() => onNavigate('email')}
            >
              <Mail className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">Change Email</p>
                <p className="text-xs text-muted-foreground">Update your email</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="gap-2 justify-start h-auto py-3"
              onClick={() => onNavigate('devices')}
            >
              <Smartphone className="h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">View Devices</p>
                <p className="text-xs text-muted-foreground">Manage sessions</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function TwoFactorTab({
  overview,
  onRefresh,
}: {
  overview: SecurityOverviewData | null;
  onRefresh: () => void;
}) {
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [step, setStep] = useState<'choose' | 'setup-app' | 'verify-app' | 'recovery'>('choose');
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'app'>('email');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [recoveryCodesData, setRecoveryCodesData] = useState<{ code: string; used: boolean }[]>([]);
  const [loadingRecovery, setLoadingRecovery] = useState(false);

  const handleEnable2FA = async (method: 'email' | 'app') => {
    setEnabling(true);
    setSelectedMethod(method);
    try {
      const res = await fetch('/api/auth/enable-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enable 2FA');

      if (method === 'app') {
        setOtpauthUri(data.otpauthUri || '');
        setSecretKey(data.secret || '');
        setRecoveryCodes(data.recoveryCodes || []);
        setStep('setup-app');
      } else {
        setRecoveryCodes(data.recoveryCodes || []);
        setStep('recovery');
        toast.success('2FA enabled with email verification');
        onRefresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enable 2FA');
    } finally {
      setEnabling(false);
    }
  };

  const handleVerifyApp = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      toast.error('Please enter the 6-digit code from your authenticator app');
      return;
    }
    setEnabling(true);
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode, method: 'app' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      toast.success('2FA verified successfully!');
      setStep('recovery');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Password is required');
      return;
    }
    setDisabling(true);
    try {
      const res = await fetch('/api/auth/disable-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');
      toast.success('2FA disabled');
      setShowDisableDialog(false);
      setDisablePassword('');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerateCodes = async () => {
    if (!regenPassword) {
      toast.error('Password is required');
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch('/api/auth/regenerate-recovery-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: regenPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate codes');
      setRecoveryCodes(data.recoveryCodes || []);
      setShowRegenDialog(false);
      setRegenPassword('');
      toast.success('Recovery codes regenerated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate codes');
    } finally {
      setRegenerating(false);
    }
  };

  const fetchRecoveryCodes = async () => {
    setLoadingRecovery(true);
    try {
      const res = await fetch('/api/auth/recovery-codes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch recovery codes');
      setRecoveryCodesData(data.codes || []);
      setShowRecoveryCodes(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch recovery codes');
    } finally {
      setLoadingRecovery(false);
    }
  };

  const downloadRecoveryCodes = (codes: string[]) => {
    const text = `StreamX Recovery Codes\nGenerated: ${new Date().toISOString()}\n\n${codes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streamx-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    toast.success('Secret key copied to clipboard');
  };

  const is2FAEnabled = overview?.twoFactorEnabled ?? false;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Current Status */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${is2FAEnabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled
                    ? `Enabled via ${overview?.twoFactorMethod === 'app' ? 'Authenticator App' : 'Email OTP'}`
                    : 'Not enabled — your account is less secure'}
                </p>
              </div>
            </div>
            {is2FAEnabled && (
              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!is2FAEnabled ? (
        /* Enable 2FA Flow */
        <AnimatePresence mode="wait">
          {step === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Choose Your 2FA Method</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => !enabling && handleEnable2FA('email')}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Email OTP</p>
                      <p className="text-xs text-muted-foreground">Receive a verification code via email each time you sign in</p>
                    </div>
                    {enabling && selectedMethod === 'email' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
                    )}
                  </div>

                  <div
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => !enabling && handleEnable2FA('app')}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Authenticator App</p>
                      <p className="text-xs text-muted-foreground">Use Google Authenticator, Authy, or similar apps for codes</p>
                    </div>
                    {enabling && selectedMethod === 'app' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground rotate-[-90deg]" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'setup-app' && (
            <motion.div key="setup-app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    Set Up Authenticator App
                  </CardTitle>
                  <CardDescription>Scan the QR code with your authenticator app</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    {otpauthUri && (
                      <div className="p-3 bg-white rounded-lg">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`}
                          alt="2FA QR Code"
                          className="h-[200px] w-[200px]"
                        />
                      </div>
                    )}

                    <div className="w-full space-y-2">
                      <Label className="text-sm">Secret Key (manual entry)</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-background rounded text-sm font-mono break-all border border-border">
                          {secretKey}
                        </code>
                        <Button variant="outline" size="icon" onClick={copySecret}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="w-full space-y-2">
                      <Label className="text-sm">Verification Code</Label>
                      <Input
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="bg-background text-center text-lg tracking-[0.5em] font-mono"
                        maxLength={6}
                      />
                    </div>

                    <div className="flex gap-3 w-full">
                      <Button variant="outline" onClick={() => setStep('choose')} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={handleVerifyApp} disabled={enabling || verifyCode.length < 6} className="flex-1 gap-2">
                        {enabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Verify
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'recovery' && recoveryCodes.length > 0 && (
            <motion.div key="recovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="bg-card border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Save Your Recovery Codes
                  </CardTitle>
                  <CardDescription>Store these codes in a safe place. Each code can only be used once.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-4 bg-background rounded-lg border border-border">
                    {recoveryCodes.map((code, i) => (
                      <code key={i} className="text-sm font-mono text-center py-1 px-2">
                        {code}
                      </code>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => downloadRecoveryCodes(recoveryCodes)}
                    >
                      <Download className="h-4 w-4" /> Download
                    </Button>
                    <Button onClick={() => { setStep('choose'); setRecoveryCodes([]); }}>
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        /* 2FA Already Enabled — Disable / Regenerate */
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Manage Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={fetchRecoveryCodes}
                  disabled={loadingRecovery}
                >
                  {loadingRecovery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  View Recovery Codes
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowRegenDialog(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate Codes
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setShowDisableDialog(true)}
                >
                  <Shield className="h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recovery Codes Dialog */}
          <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Your Recovery Codes</DialogTitle>
                <DialogDescription>Each code can only be used once. Keep them safe.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {recoveryCodesData.map((rc, i) => (
                  <code key={i} className={`text-sm font-mono text-center py-1 ${rc.used ? 'line-through text-muted-foreground' : ''}`}>
                    {rc.code}
                  </code>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => downloadRecoveryCodes(recoveryCodesData.filter(c => !c.used).map(c => c.code))} className="gap-2">
                  <Download className="h-4 w-4" /> Download Unused Codes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Disable 2FA Dialog */}
          <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
                <DialogDescription>This will make your account less secure. Enter your password to confirm.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-background"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setShowDisableDialog(false); setDisablePassword(''); }}>Cancel</Button>
                <Button variant="destructive" onClick={handleDisable2FA} disabled={disabling} className="gap-2">
                  {disabling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Disable 2FA
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Regenerate Recovery Codes Dialog */}
          <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regenerate Recovery Codes?</DialogTitle>
                <DialogDescription>Your old recovery codes will be invalidated. Enter your password to confirm.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={regenPassword}
                  onChange={(e) => setRegenPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-background"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setShowRegenDialog(false); setRegenPassword(''); }}>Cancel</Button>
                <Button onClick={handleRegenerateCodes} disabled={regenerating} className="gap-2">
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Regenerate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Show regenerated codes */}
          {recoveryCodes.length > 0 && (
            <Card className="bg-card border-amber-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  New Recovery Codes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 p-4 bg-background rounded-lg border border-border">
                  {recoveryCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono text-center py-1">{code}</code>
                  ))}
                </div>
                <Button variant="outline" className="gap-2" onClick={() => downloadRecoveryCodes(recoveryCodes)}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function EmailChangeTab({ overview, onRefresh }: { overview: SecurityOverviewData | null; onRefresh: () => void }) {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [oldEmailCode, setOldEmailCode] = useState('');
  const [newEmailCode, setNewEmailCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!password) {
      toast.error('Current password is required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate email change');
      setStep('verify');
      toast.success('Verification codes sent to both email addresses');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!oldEmailCode || oldEmailCode.length < 6) {
      toast.error('Please enter the code from your current email');
      return;
    }
    if (!newEmailCode || newEmailCode.length < 6) {
      toast.error('Please enter the code from your new email');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldEmailCode, newEmailCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      toast.success('Email changed successfully!');
      setStep('form');
      setNewEmail('');
      setPassword('');
      setOldEmailCode('');
      setNewEmailCode('');
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Current Email */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Email</p>
              <p className="font-medium">{overview?.email ? maskEmail(overview.email) : 'Loading...'}</p>
            </div>
            {overview?.emailVerified && (
              <Badge variant="secondary" className="ml-auto gap-1 bg-green-500/10 text-green-500 text-xs">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {step === 'form' ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Change Email Address</CardTitle>
                <CardDescription>Verification codes will be sent to both your current and new email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">New Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPassword">Current Password</Label>
                  <Input
                    id="emailPassword"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="bg-background"
                  />
                </div>
                <Button onClick={handleChangeEmail} disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send Verification Codes
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Verify Email Change</CardTitle>
                <CardDescription>Enter the codes sent to your current and new email addresses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-500 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Codes have been sent to both your current and new email addresses.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Code from current email ({overview?.email ? maskEmail(overview.email) : ''})</Label>
                  <Input
                    value={oldEmailCode}
                    onChange={(e) => setOldEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="bg-background text-center text-lg tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Code from new email ({newEmail ? maskEmail(newEmail) : ''})</Label>
                  <Input
                    value={newEmailCode}
                    onChange={(e) => setNewEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="bg-background text-center text-lg tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyEmailChange}
                    disabled={verifying || oldEmailCode.length < 6 || newEmailCode.length < 6}
                    className="flex-1 gap-2"
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Verify & Change Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function DevicesTab() {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/devices');
      if (!res.ok) throw new Error('Failed to fetch devices');
      const data = await res.json();
      setDevices(data.devices || []);
    } catch {
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleRemoveDevice = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/auth/devices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove device');
      }
      setDevices(prev => prev.filter(d => d.id !== id));
      toast.success('Device signed out');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove device');
    } finally {
      setRemovingId(null);
    }
  };

  const handleSignOutAll = async () => {
    try {
      const res = await fetch('/api/auth/logout-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sign out all devices');
      setDevices(prev => prev.length > 0 ? [prev[0]] : []);
      toast.success('Signed out of all other devices');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out all devices');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  const currentSessionId = devices.length > 0 ? devices[0].id : null;
  const otherDevices = devices.filter(d => d.id !== currentSessionId);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {devices.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Active Sessions</h3>
            <p className="text-sm text-muted-foreground">There are no active sessions for your account.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {devices.length} active session{devices.length !== 1 ? 's' : ''}
            </p>
            {otherDevices.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <LogOut className="h-4 w-4" /> Sign Out All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out of {otherDevices.length} other device{otherDevices.length !== 1 ? 's' : ''}. You will stay signed in on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOutAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sign Out All Devices
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="space-y-3">
            {devices.map(device => {
              const DeviceIcon = getDeviceIcon(device.platform);
              const isCurrent = device.id === currentSessionId;

              return (
                <Card key={device.id} className={`bg-card border-border ${isCurrent ? 'border-primary/30' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 p-2.5 rounded-lg ${isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <DeviceIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">
                            {device.browser || 'Unknown Browser'}
                            {device.platform ? ` · ${device.platform}` : ''}
                          </h4>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs gap-1 bg-primary text-primary-foreground">
                              <Chrome className="h-3 w-3" /> Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {device.ipAddress && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {device.ipAddress}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatRelativeTime(device.lastActiveAt)}
                          </span>
                        </div>
                      </div>
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removingId === device.id}
                          onClick={() => handleRemoveDevice(device.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        >
                          {removingId === device.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ActivityLogTab() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  const fetchActivities = useCallback(async (p: number, action?: string, append = false) => {
    try {
      const params = new URLSearchParams({ page: p.toString(), limit: '20' });
      if (action && action !== 'all') params.set('action', action);
      const res = await fetch(`/api/auth/activity?${params}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      setActivities(prev => append ? [...prev, ...data.items] : data.items);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchActivities(1, filter);
  }, [filter, fetchActivities]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchActivities(nextPage, filter, true);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setPage(1);
    setActivities([]);
    setLoading(true);
    fetchActivities(1, value);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'login', label: 'Login' },
          { value: 'security', label: 'Security' },
          { value: 'profile', label: 'Profile' },
        ].map(f => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(f.value)}
            className="gap-1.5"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      {activities.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Activity Found</h3>
            <p className="text-sm text-muted-foreground">No recent activity matches your filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
          {activities.map((item, idx) => {
            const Icon = getActivityIcon(item.action);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="bg-card border-border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 p-2 rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{item.action.replace(/_/g, ' ')}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {item.ipAddress && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {item.ipAddress}
                            </span>
                          )}
                          {item.browser && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Chrome className="h-3 w-3" /> {item.browser}
                            </span>
                          )}
                          {item.platform && (
                            <span className="text-xs text-muted-foreground">{item.platform}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {page < totalPages && (
        <div className="text-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore} className="gap-2">
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
            Load More
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ProfilePinTab() {
  const [profiles, setProfiles] = useState<ProfileWithRestrictions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [pinValues, setPinValues] = useState<Record<string, string>>({});
  const [currentPinValues, setCurrentPinValues] = useState<Record<string, string>>({});
  const [settingPin, setSettingPin] = useState<string | null>(null);
  const [removingPin, setRemovingPin] = useState<string | null>(null);
  const [savingRestrictions, setSavingRestrictions] = useState<string | null>(null);
  const [restrictionEdits, setRestrictionEdits] = useState<Record<string, {
    maxRating: string;
    allowedGenres: string[];
    restrictedGenres: string[];
    searchRestricted: boolean;
    playbackRestricted: boolean;
    profileLocked: boolean;
  }>>({});

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch profiles');
      const data = await res.json();
      const profilesWithRestrictions: ProfileWithRestrictions[] = (data.profiles || []).map((p: any) => ({
        ...p,
        pin: p.pin || null,
        maxRating: p.maxRating || null,
        allowedGenres: p.allowedGenres || null,
        restrictedGenres: p.restrictedGenres || null,
        searchRestricted: p.searchRestricted || false,
        playbackRestricted: p.playbackRestricted || false,
        profileLocked: p.profileLocked || false,
      }));
      setProfiles(profilesWithRestrictions);
    } catch {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSetPin = async (profileId: string) => {
    const pin = pinValues[profileId];
    if (!pin || !/^\d{4}$/.test(pin)) {
      toast.error('PIN must be a 4-digit number');
      return;
    }
    setSettingPin(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set PIN');
      toast.success('PIN set successfully');
      setPinValues(prev => ({ ...prev, [profileId]: '' }));
      fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set PIN');
    } finally {
      setSettingPin(null);
    }
  };

  const handleRemovePin = async (profileId: string) => {
    const currentPin = currentPinValues[profileId];
    if (!currentPin) {
      toast.error('Current PIN is required');
      return;
    }
    setRemovingPin(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/pin`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove PIN');
      toast.success('PIN removed');
      setCurrentPinValues(prev => ({ ...prev, [profileId]: '' }));
      fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove PIN');
    } finally {
      setRemovingPin(null);
    }
  };

  const getRestrictionEdit = (profileId: string) => {
    if (restrictionEdits[profileId]) return restrictionEdits[profileId];
    const p = profiles.find(pr => pr.id === profileId);
    return {
      maxRating: p?.maxRating || '',
      allowedGenres: p?.allowedGenres ? p.allowedGenres.split(',').filter(Boolean) : [],
      restrictedGenres: p?.restrictedGenres ? p.restrictedGenres.split(',').filter(Boolean) : [],
      searchRestricted: p?.searchRestricted || false,
      playbackRestricted: p?.playbackRestricted || false,
      profileLocked: p?.profileLocked || false,
    };
  };

  const updateRestrictionEdit = (profileId: string, updates: Partial<typeof restrictionEdits[string]>) => {
    setRestrictionEdits(prev => ({
      ...prev,
      [profileId]: { ...getRestrictionEdit(profileId), ...updates },
    }));
  };

  const handleSaveRestrictions = async (profileId: string) => {
    setSavingRestrictions(profileId);
    const edits = getRestrictionEdit(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}/restrictions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save restrictions');
      toast.success('Restrictions saved');
      fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save restrictions');
    } finally {
      setSavingRestrictions(null);
    }
  };

  const toggleGenre = (profileId: string, field: 'allowedGenres' | 'restrictedGenres', genre: string) => {
    const current = getRestrictionEdit(profileId)[field];
    const updated = current.includes(genre)
      ? current.filter((g: string) => g !== genre)
      : [...current, genre];
    updateRestrictionEdit(profileId, { [field]: updated });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {profiles.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No Profiles</h3>
            <p className="text-sm text-muted-foreground">Create profiles from Account Settings first.</p>
          </CardContent>
        </Card>
      ) : (
        profiles.map((profile) => {
          const isExpanded = expandedProfile === profile.id;
          const restrictions = getRestrictionEdit(profile.id);

          return (
            <Card key={profile.id} className="bg-card border-border">
              <CardContent className="p-4 sm:p-6">
                {/* Profile Header */}
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedProfile(isExpanded ? null : profile.id)}
                >
                  <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg ${profile.isKids ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                    {profile.isKids ? <Baby className="h-5 w-5" /> : profile.profileName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{profile.profileName}</h4>
                      {profile.isKids && (
                        <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-500">
                          <Baby className="h-3 w-3" /> Kids
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profile.pin ? 'PIN set' : 'No PIN'} · {profile.isDefault ? 'Default' : 'Custom'} profile
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {profile.pin ? (
                      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500 text-xs">
                        <Fingerprint className="h-3 w-3" /> PIN
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground text-xs">
                        <Fingerprint className="h-3 w-3" /> No PIN
                      </Badge>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        {/* PIN Management */}
                        <div>
                          <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-primary" />
                            PIN Management
                          </h5>

                          {!profile.pin ? (
                            /* Set PIN */
                            <div className="flex items-center gap-2">
                              <Input
                                value={pinValues[profile.id] || ''}
                                onChange={(e) => setPinValues(prev => ({ ...prev, [profile.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                placeholder="4-digit PIN"
                                className="bg-background w-32 text-center tracking-[0.3em] font-mono"
                                maxLength={4}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSetPin(profile.id)}
                                disabled={settingPin === profile.id || (pinValues[profile.id] || '').length !== 4}
                                className="gap-1.5"
                              >
                                {settingPin === profile.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                                Set PIN
                              </Button>
                            </div>
                          ) : (
                            /* Change / Remove PIN */
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={pinValues[profile.id] || ''}
                                  onChange={(e) => setPinValues(prev => ({ ...prev, [profile.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                  placeholder="New 4-digit PIN"
                                  className="bg-background w-32 text-center tracking-[0.3em] font-mono"
                                  maxLength={4}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSetPin(profile.id)}
                                  disabled={settingPin === profile.id || (pinValues[profile.id] || '').length !== 4}
                                  className="gap-1.5"
                                >
                                  {settingPin === profile.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  Change
                                </Button>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  value={currentPinValues[profile.id] || ''}
                                  onChange={(e) => setCurrentPinValues(prev => ({ ...prev, [profile.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                  placeholder="Current PIN"
                                  className="bg-background w-32 text-center tracking-[0.3em] font-mono"
                                  maxLength={4}
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemovePin(profile.id)}
                                  disabled={removingPin === profile.id || (currentPinValues[profile.id] || '').length !== 4}
                                  className="gap-1.5"
                                >
                                  {removingPin === profile.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                  Remove
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Kids Restrictions */}
                        {profile.isKids && (
                          <div>
                            <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary" />
                              Content Restrictions
                            </h5>
                            <div className="space-y-4">
                              {/* Max Rating */}
                              <div className="space-y-1.5">
                                <Label className="text-xs">Maximum Rating</Label>
                                <Select
                                  value={restrictions.maxRating || ''}
                                  onValueChange={(value) => updateRestrictionEdit(profile.id, { maxRating: value })}
                                >
                                  <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select max rating" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {RATING_OPTIONS.map(r => (
                                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Allowed Genres */}
                              <div className="space-y-1.5">
                                <Label className="text-xs">Allowed Genres</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                  {GENRE_OPTIONS.map(genre => (
                                    <div key={genre} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`${profile.id}-allowed-${genre}`}
                                        checked={restrictions.allowedGenres.includes(genre)}
                                        onCheckedChange={() => toggleGenre(profile.id, 'allowedGenres', genre)}
                                      />
                                      <Label htmlFor={`${profile.id}-allowed-${genre}`} className="text-xs cursor-pointer">{genre}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Restricted Genres */}
                              <div className="space-y-1.5">
                                <Label className="text-xs">Restricted Genres</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                                  {GENRE_OPTIONS.map(genre => (
                                    <div key={genre} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`${profile.id}-restricted-${genre}`}
                                        checked={restrictions.restrictedGenres.includes(genre)}
                                        onCheckedChange={() => toggleGenre(profile.id, 'restrictedGenres', genre)}
                                      />
                                      <Label htmlFor={`${profile.id}-restricted-${genre}`} className="text-xs cursor-pointer">{genre}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Toggles */}
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm">Search Restricted</p>
                                      <p className="text-xs text-muted-foreground">Limit search results to safe content</p>
                                    </div>
                                  </div>
                                  <Switch
                                    checked={restrictions.searchRestricted}
                                    onCheckedChange={(checked) => updateRestrictionEdit(profile.id, { searchRestricted: checked })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Play className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm">Playback Restricted</p>
                                      <p className="text-xs text-muted-foreground">Require PIN for playback</p>
                                    </div>
                                  </div>
                                  <Switch
                                    checked={restrictions.playbackRestricted}
                                    onCheckedChange={(checked) => updateRestrictionEdit(profile.id, { playbackRestricted: checked })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm">Profile Locked</p>
                                      <p className="text-xs text-muted-foreground">Require PIN to access this profile</p>
                                    </div>
                                  </div>
                                  <Switch
                                    checked={restrictions.profileLocked}
                                    onCheckedChange={(checked) => updateRestrictionEdit(profile.id, { profileLocked: checked })}
                                  />
                                </div>
                              </div>

                              <Button
                                onClick={() => handleSaveRestrictions(profile.id)}
                                disabled={savingRestrictions === profile.id}
                                className="gap-2 w-full sm:w-auto"
                              >
                                {savingRestrictions === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save Restrictions
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })
      )}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function SecuritySettings() {
  const { isAuthenticated, navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState<SecurityOverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) throw new Error('Failed to fetch user data');
      const data = await res.json();

      // Also get sessions count
      let sessionCount = 0;
      try {
        const sessionRes = await fetch('/api/auth/sessions');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          sessionCount = sessionData.sessions?.length || 0;
        }
      } catch {}

      setOverview({
        email: data.user.email,
        emailVerified: data.user.emailVerified ?? false,
        twoFactorEnabled: data.user.twoFactorEnabled ?? false,
        twoFactorMethod: data.user.twoFactorMethod ?? null,
        activeSessions: sessionCount,
        lastPasswordChange: data.user.createdAt ?? null,
        createdAt: data.user.createdAt ?? new Date().toISOString(),
      });
    } catch {
      toast.error('Failed to load security data');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOverview();
  }, [isAuthenticated, fetchOverview]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Sign in to view security settings</h2>
          <Button onClick={() => navigate('login')} className="mt-4">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Header */}
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
          <h1 className="text-2xl sm:text-3xl font-bold">Security Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Protect your account with advanced security features</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto mb-6 flex-nowrap">
            <TabsTrigger value="overview" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="2fa" className="gap-1.5">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">2FA</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-1.5">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Devices</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="pin" className="gap-1.5">
              <Fingerprint className="h-4 w-4" />
              <span className="hidden sm:inline">PIN</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab overview={overview} loading={loadingOverview} onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="2fa">
          <TwoFactorTab overview={overview} onRefresh={fetchOverview} />
        </TabsContent>

        <TabsContent value="email">
          <EmailChangeTab overview={overview} onRefresh={fetchOverview} />
        </TabsContent>

        <TabsContent value="devices">
          <DevicesTab />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLogTab />
        </TabsContent>

        <TabsContent value="pin">
          <ProfilePinTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
