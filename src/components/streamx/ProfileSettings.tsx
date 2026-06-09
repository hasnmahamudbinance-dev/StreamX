'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  User,
  Mail,
  ArrowLeft,
  Camera,
  Save,
  Globe,
  Bell,
  Play,
  Shield,
  Calendar,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  Settings,
  Monitor,
  Smartphone,
  Plus,
  Pencil,
  X,
  Check,
  Baby,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile, DeviceSession } from '@/lib/types';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  language: string;
  autoplay: boolean;
  emailNotify: boolean;
  emailVerified: boolean;
  createdAt: string;
}

const avatarColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-yellow-500',
];

function getAvatarColor(index: number): string {
  return avatarColors[index % avatarColors.length];
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 25, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 50, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 4) return { score: 75, label: 'Good', color: 'bg-yellow-500' };
  return { score: 100, label: 'Strong', color: 'bg-green-500' };
}

export function ProfileSettings() {
  const { user, isAuthenticated, navigate, logout, setUser } = useAppStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile tab state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Preferences state
  const [language, setLanguage] = useState('en');
  const [emailNotify, setEmailNotify] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Security tab state
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loadingSessionCount, setLoadingSessionCount] = useState(true);
  const [sendingVerification, setSendingVerification] = useState(false);

  // Profiles tab state
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileIsKids, setNewProfileIsKids] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      setProfile(data);
      setEditName(data.name);
      setEditEmail(data.email);
      setLanguage(data.language || 'en');
      setEmailNotify(data.emailNotify ?? true);
      setAutoplay(data.autoplay ?? true);
      setAvatarPreview(data.avatar || null);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionCount = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessionCount(data.sessions?.length || 0);
    } catch {
      // Graceful fallback
      setSessionCount(0);
    } finally {
      setLoadingSessionCount(false);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles');
      if (!res.ok) throw new Error('Failed to fetch profiles');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      // Graceful fallback
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchProfile();
    fetchSessionCount();
    fetchProfiles();
  }, [isAuthenticated, fetchProfile, fetchSessionCount, fetchProfiles]);

  // Redirect if not authenticated
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

  const handleSaveName = async () => {
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update name');
      }
      const data = await res.json();
      setProfile(data);
      if (user) {
        setUser({ ...user, name: data.name });
      }
      setIsEditingName(false);
      toast.success('Name updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!editEmail.trim() || !editEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmail.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update email');
      }
      const data = await res.json();
      setProfile(data);
      if (user) {
        setUser({ ...user, email: data.email });
      }
      setIsEditingEmail(false);
      toast.success('Email updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }
      const data = await res.json();
      setProfile(prev => prev ? { ...prev, avatar: data.avatar } : prev);
      if (user) {
        setUser({ ...user, avatar: data.avatar, image: data.avatar });
      }
      toast.success('Avatar updated successfully');
    } catch (err) {
      // Revert preview on error
      setAvatarPreview(profile?.avatar || null);
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      // Reset the file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to change password');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!profile?.email) return;
    setSendingVerification(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification');
      }
      toast.success('Verification email sent! Check your inbox.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send verification');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleSavePreferences = async (fields: { language?: string; emailNotify?: boolean; autoplay?: boolean }) => {
    setSavingPrefs(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update preferences');
      }
      const data = await res.json();
      setProfile(data);
      if (user) {
        setUser({
          ...user,
          language: data.language,
          emailNotify: data.emailNotify,
          autoplay: data.autoplay,
        });
      }
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    handleSavePreferences({ language: value });
  };

  const handleEmailNotifyChange = (checked: boolean) => {
    setEmailNotify(checked);
    handleSavePreferences({ emailNotify: checked });
  };

  const handleAutoplayChange = (checked: boolean) => {
    setAutoplay(checked);
    handleSavePreferences({ autoplay: checked });
  };

  // Profile management handlers
  const handleAddProfile = async () => {
    if (!newProfileName.trim()) {
      toast.error('Profile name is required');
      return;
    }
    setAddingProfile(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileName: newProfileName.trim(), isKids: newProfileIsKids }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create profile');
      }
      const data = await res.json();
      setProfiles(prev => [...prev, data.profile]);
      setNewProfileName('');
      setNewProfileIsKids(false);
      setShowAddDialog(false);
      toast.success('Profile created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setAddingProfile(false);
    }
  };

  const handleSaveProfileName = async (profileId: string) => {
    if (!editingProfileName.trim()) {
      toast.error('Profile name is required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileName: editingProfileName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      const data = await res.json();
      setProfiles(prev => prev.map(p => p.id === profileId ? data.profile : p));
      setEditingProfileId(null);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleKids = async (profileItem: UserProfile) => {
    try {
      const res = await fetch(`/api/profiles/${profileItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isKids: !profileItem.isKids }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      const data = await res.json();
      setProfiles(prev => prev.map(p => p.id === profileItem.id ? data.profile : p));
      toast.success(profileItem.isKids ? 'Kids mode disabled' : 'Kids mode enabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    setDeletingProfileId(profileId);
    try {
      const res = await fetch(`/api/profiles/${profileId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete profile');
      }
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      toast.success('Profile deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete profile');
    } finally {
      setDeletingProfileId(null);
    }
  };

  const languageLabels: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    ko: 'Korean',
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="pt-4 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-80" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Failed to load profile</h2>
          <Button onClick={fetchProfile} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Header with back button */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('home')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-full sm:w-auto mb-6 flex-nowrap">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-1.5">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Profiles</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5">
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Avatar Section */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <Avatar className="h-24 w-24">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt={profile.name} />
                    ) : null}
                    <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                      {profile.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">Click the avatar to upload a new photo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Name */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Display Name
              </CardTitle>
              <CardDescription className="text-sm">This is how your name will appear on StreamX</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isEditingName ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') { setIsEditingName(false); setEditName(profile.name); }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveName} disabled={saving} size="sm">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setIsEditingName(false); setEditName(profile.name); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm">{profile.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Address */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Address
              </CardTitle>
              <CardDescription className="text-sm">Your email address for account notifications</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {isEditingEmail ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Enter your email"
                      type="email"
                      className="flex-1 bg-background"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEmail();
                        if (e.key === 'Escape') { setIsEditingEmail(false); setEditEmail(profile.email); }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEmail} disabled={saving} size="sm">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setIsEditingEmail(false); setEditEmail(profile.email); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  {!profile.emailVerified && (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Email verification will be sent to your new address
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{profile.email}</span>
                    {profile.emailVerified ? (
                      <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-500">
                        <AlertCircle className="h-3 w-3" /> Unverified
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingEmail(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Language */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Language
              </CardTitle>
              <CardDescription className="text-sm">Choose your preferred display language</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full sm:w-64 bg-background">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Current language: {languageLabels[language] || language}
              </p>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription className="text-sm">Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive email updates about new content and recommendations</p>
                </div>
                <Switch
                  checked={emailNotify}
                  onCheckedChange={handleEmailNotifyChange}
                  disabled={savingPrefs}
                />
              </div>
            </CardContent>
          </Card>

          {/* Autoplay */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Playback
              </CardTitle>
              <CardDescription className="text-sm">Control your playback experience</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Autoplay</p>
                  <p className="text-xs text-muted-foreground">Automatically play the next episode or suggested content</p>
                </div>
                <Switch
                  checked={autoplay}
                  onCheckedChange={handleAutoplayChange}
                  disabled={savingPrefs}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Change Password */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription className="text-sm">Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Enter current password"
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Enter new password"
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Password strength</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.label === 'Weak' ? 'text-red-500' :
                        passwordStrength.label === 'Fair' ? 'text-orange-500' :
                        passwordStrength.label === 'Good' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <Progress value={passwordStrength.score} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">Minimum 8 characters with a mix of letters, numbers, and symbols</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                    placeholder="Confirm new password"
                    className="bg-background pr-10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleChangePassword();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Passwords do not match
                  </p>
                )}
              </div>

              {passwordError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> {passwordError}
                </p>
              )}

              <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-2">
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Email Verification */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Email Verification
              </CardTitle>
              <CardDescription className="text-sm">Verify your email to secure your account</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{profile.email}</span>
                  {profile.emailVerified ? (
                    <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-500">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-500">
                      <AlertCircle className="h-3 w-3" /> Unverified
                    </Badge>
                  )}
                </div>
                {!profile.emailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={sendingVerification}
                    className="gap-2"
                  >
                    {sendingVerification ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Verify Now
                  </Button>
                )}
              </div>
              {!profile.emailVerified && (
                <p className="text-xs text-muted-foreground mt-2">
                  A verified email helps protect your account and enables password recovery.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Active Sessions
              </CardTitle>
              <CardDescription className="text-sm">View and manage devices where you&apos;re signed in</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {loadingSessionCount ? (
                    <Skeleton className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {sessionCount}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {sessionCount} active session{sessionCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sessionCount > 1
                        ? `${sessionCount - 1} other device${sessionCount - 1 !== 1 ? 's' : ''} signed in`
                        : 'Only this device is signed in'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('devices')}
                  className="gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  Manage Devices
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-sm">Active</span>
                </div>
                <Badge variant="secondary" className="text-xs">Good Standing</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your account is in good standing with no security issues detected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                Streaming Profiles
              </CardTitle>
              <CardDescription className="text-sm">
                Create profiles for different members of your household.{' '}
                {profiles.length}/5 profiles created.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingProfiles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No profiles found. Create one to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profiles.map((profileItem, index) => {
                    const avatarColor = getAvatarColor(index);
                    const isEditing = editingProfileId === profileItem.id;
                    const isDeleting = deletingProfileId === profileItem.id;

                    return (
                      <Card key={profileItem.id} className="bg-background border-border">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div
                              className={`flex-shrink-0 h-12 w-12 rounded-lg ${avatarColor} flex items-center justify-center text-white font-bold text-lg`}
                            >
                              {profileItem.profileName?.[0]?.toUpperCase() || '?'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingProfileName}
                                    onChange={(e) => setEditingProfileName(e.target.value)}
                                    className="h-8 text-sm bg-background"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveProfileName(profileItem.id);
                                      if (e.key === 'Escape') setEditingProfileId(null);
                                    }}
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 flex-shrink-0"
                                    onClick={() => handleSaveProfileName(profileItem.id)}
                                    disabled={savingProfile}
                                  >
                                    {savingProfile ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5 text-green-500" />
                                    )}
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 flex-shrink-0"
                                    onClick={() => setEditingProfileId(null)}
                                  >
                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {profileItem.profileName}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 flex-shrink-0"
                                    onClick={() => {
                                      setEditingProfileId(profileItem.id);
                                      setEditingProfileName(profileItem.profileName);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {profileItem.isDefault && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5 bg-primary/10 text-primary">
                                    Default
                                  </Badge>
                                )}
                                {profileItem.isKids && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5 bg-amber-500/10 text-amber-500">
                                    <Baby className="h-2.5 w-2.5" />
                                    Kids
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              {!profileItem.isDefault && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground">Kids</span>
                                    <Switch
                                      checked={profileItem.isKids}
                                      onCheckedChange={() => handleToggleKids(profileItem)}
                                      className="scale-75"
                                    />
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        disabled={isDeleting}
                                      >
                                        {isDeleting ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete &quot;{profileItem.profileName}&quot;?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this profile. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteProfile(profileItem.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete Profile
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Add Profile Card */}
                  {profiles.length < 5 && (
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Card className="border-dashed border-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors h-full min-h-[88px]">
                          <CardContent className="flex items-center justify-center p-4 h-full">
                            <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                              <Plus className="h-5 w-5" />
                              <span className="text-sm font-medium">Add Profile</span>
                            </div>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Profile</DialogTitle>
                          <DialogDescription>
                            Add a new profile for a member of your household.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="profileName">Profile Name</Label>
                            <Input
                              id="profileName"
                              value={newProfileName}
                              onChange={(e) => setNewProfileName(e.target.value)}
                              placeholder="Enter profile name"
                              maxLength={30}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddProfile();
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Kids Profile</Label>
                              <p className="text-xs text-muted-foreground">Show only age-appropriate content</p>
                            </div>
                            <Switch
                              checked={newProfileIsKids}
                              onCheckedChange={setNewProfileIsKids}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddProfile} disabled={addingProfile || !newProfileName.trim()}>
                            {addingProfile ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Create Profile
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}

              {profiles.length >= 5 && (
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  You&apos;ve reached the maximum of 5 profiles.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          {/* Account Info */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Role</span>
                </div>
                <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                  {profile.role === 'admin' ? (
                    <><Shield className="h-3 w-3 mr-1" /> Admin</>
                  ) : (
                    <><User className="h-3 w-3 mr-1" /> Member</>
                  )}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Member since</span>
                </div>
                <span className="text-sm">{formatDate(profile.createdAt)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email verification</span>
                </div>
                {profile.emailVerified ? (
                  <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-500">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/10 text-amber-500">
                    <AlertCircle className="h-3 w-3" /> Unverified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
                </div>
                <Button variant="outline" onClick={logout} className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-card border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-sm">Irreversible actions that affect your account</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" disabled className="gap-2 opacity-60 cursor-not-allowed">
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming Soon</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
