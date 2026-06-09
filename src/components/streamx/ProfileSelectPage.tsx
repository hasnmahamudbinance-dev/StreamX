'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Film,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Baby,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/types';

// ─── Avatar Colors ──────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'bg-red-600', text: 'text-white' },      // crimson
  { bg: 'bg-blue-600', text: 'text-white' },      // blue
  { bg: 'bg-green-600', text: 'text-white' },     // green
  { bg: 'bg-purple-600', text: 'text-white' },    // purple
  { bg: 'bg-orange-500', text: 'text-white' },    // orange
  { bg: 'bg-teal-500', text: 'text-white' },      // teal
];

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

// ─── Component ──────────────────────────────────────────────────────

export function ProfileSelectPage() {
  const { navigate, setActiveProfile, isAuthenticated } = useAppStore();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  // PIN dialog
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [pinProfile, setPinProfile] = useState<UserProfile | null>(null);

  // Add profile dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileKids, setNewProfileKids] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);

  // Edit profile dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delete profile dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Profiles ─────────────────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles');
      if (!res.ok) throw new Error('Failed to fetch profiles');
      const data = await res.json();
      setProfiles(data.profiles || []);

      // Auto-select if only 1 profile (default)
      if (data.profiles?.length === 1 && data.profiles[0].isDefault) {
        handleSelectProfile(data.profiles[0]);
      }
    } catch {
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ─── Select Profile ─────────────────────────────────────────────
  const handleSelectProfile = (profile: UserProfile) => {
    if (editMode) return;

    // If profile has a PIN, show PIN dialog
    if (profile.pin) {
      setPinProfile(profile);
      setPinInput('');
      setShowPinDialog(true);
      return;
    }

    setSelectedProfile(profile);
    setActiveProfile(profile);
    toast.success(`Welcome, ${profile.profileName}!`);

    // Small delay for visual feedback then navigate
    setTimeout(() => {
      navigate('home');
    }, 300);
  };

  // ─── Verify PIN ─────────────────────────────────────────────────
  const handleVerifyPin = async () => {
    if (!pinProfile || pinInput.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    setPinVerifying(true);
    try {
      const res = await fetch(`/api/profiles/${pinProfile.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Invalid PIN');
      }

      setShowPinDialog(false);
      setPinInput('');
      setPinProfile(null);
      setSelectedProfile(pinProfile);
      setActiveProfile(pinProfile);
      toast.success(`Welcome, ${pinProfile.profileName}!`);

      setTimeout(() => {
        navigate('home');
      }, 300);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid PIN');
      setPinInput('');
    } finally {
      setPinVerifying(false);
    }
  };

  // ─── Add Profile ────────────────────────────────────────────────
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
        body: JSON.stringify({ profileName: newProfileName.trim(), isKids: newProfileKids }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create profile');
      }

      toast.success('Profile created!');
      setShowAddDialog(false);
      setNewProfileName('');
      setNewProfileKids(false);
      fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setAddingProfile(false);
    }
  };

  // ─── Edit Profile ───────────────────────────────────────────────
  const handleEditProfile = (profile: UserProfile) => {
    setEditingProfile(profile);
    setEditProfileName(profile.profileName);
    setShowEditDialog(true);
  };

  const handleSaveProfile = async () => {
    if (!editingProfile || !editProfileName.trim()) {
      toast.error('Profile name is required');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`/api/profiles/${editingProfile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileName: editProfileName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated!');
      setShowEditDialog(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Delete Profile ─────────────────────────────────────────────
  const handleDeleteProfile = (profile: UserProfile) => {
    if (profile.isDefault) {
      toast.error('Cannot delete the default profile');
      return;
    }
    setDeletingProfile(profile);
    setShowDeleteDialog(true);
  };

  const confirmDeleteProfile = async () => {
    if (!deletingProfile) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/profiles/${deletingProfile.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete profile');
      }

      toast.success('Profile deleted!');
      setShowDeleteDialog(false);
      setDeletingProfile(null);
      fetchProfiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Get Avatar Color ───────────────────────────────────────────
  const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 mb-12">
          <Film className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <p className="text-xl text-muted-foreground mb-8">Loading profiles...</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Not Authenticated ──────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 mb-8">
          <Film className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please sign in to select a profile</p>
            <Button onClick={() => navigate('login')} className="gap-2">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <Film className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold text-primary tracking-tight">StreamX</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-3xl font-bold text-center mb-2"
        >
          Who&apos;s Watching?
        </motion.h1>

        {/* Manage / Done Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            {editMode ? (
              <>
                <Check className="h-4 w-4" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" /> Manage
              </>
            )}
          </Button>
        </motion.div>

        {/* Profile Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 mb-8"
        >
          {profiles.map((profile, index) => {
            const color = getAvatarColor(index);
            const isSelected = selectedProfile?.id === profile.id;
            const initial = profile.profileName.charAt(0).toUpperCase();

            return (
              <motion.div
                key={profile.id}
                variants={itemVariants}
                className="flex flex-col items-center gap-3"
              >
                <div className="relative group">
                  {/* Avatar Circle */}
                  <button
                    onClick={() => handleSelectProfile(profile)}
                    className={`
                      relative h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center
                      ${color.bg} transition-all duration-200
                      ${editMode ? 'cursor-default' : 'cursor-pointer hover:ring-4 hover:ring-primary/40'}
                      ${isSelected ? 'ring-4 ring-primary scale-105' : ''}
                    `}
                    disabled={editMode}
                  >
                    {profile.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.profileName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className={`text-3xl sm:text-4xl font-bold ${color.text}`}>
                        {initial}
                      </span>
                    )}

                    {/* Kids badge */}
                    {profile.isKids && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1">
                        <Baby className="h-3 w-3" />
                      </div>
                    )}

                    {/* PIN indicator */}
                    {profile.pin && (
                      <div className="absolute bottom-1 right-1 bg-background/80 rounded-full p-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">PIN</Badge>
                      </div>
                    )}

                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute inset-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="h-10 w-10 text-primary-foreground" />
                      </div>
                    )}

                    {/* Edit overlay in edit mode */}
                    {editMode && (
                      <div
                        className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                        onClick={() => handleEditProfile(profile)}
                      >
                        <Pencil className="h-7 w-7 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Delete button in edit mode */}
                  {editMode && !profile.isDefault && (
                    <button
                      onClick={() => handleDeleteProfile(profile)}
                      className="absolute -top-2 -left-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors z-10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Profile Name */}
                <span className={`text-sm font-medium text-center truncate max-w-[120px] ${
                  editMode ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {profile.profileName}
                </span>

                {/* Kids label */}
                {profile.isKids && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-500 gap-1">
                    <Baby className="h-3 w-3" /> Kids
                  </Badge>
                )}
              </motion.div>
            );
          })}

          {/* Add Profile Button */}
          {profiles.length < 5 && (
            <motion.div variants={itemVariants} className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  if (editMode) return;
                  setShowAddDialog(true);
                }}
                className={`
                  h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-dashed border-muted-foreground/40
                  flex items-center justify-center transition-all duration-200
                  ${editMode
                    ? 'cursor-default opacity-40'
                    : 'cursor-pointer hover:border-primary hover:bg-primary/5'
                  }
                `}
                disabled={editMode}
              >
                <Plus className="h-10 w-10 text-muted-foreground/60" />
              </button>
              <span className="text-sm text-muted-foreground">Add Profile</span>
            </motion.div>
          )}
        </motion.div>

        {/* Profile count info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground"
        >
          {profiles.length}/5 profiles
        </motion.p>
      </div>

      {/* ─── PIN Entry Dialog ──────────────────────────────────────── */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Enter PIN for {pinProfile?.profileName}
            </DialogTitle>
            <DialogDescription>
              This profile is protected by a 4-digit PIN
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`
                    h-12 w-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold
                    transition-colors duration-150
                    ${pinInput.length > i
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground'
                    }
                  `}
                >
                  {pinInput.length > i ? pinInput[i] : ''}
                </div>
              ))}
            </div>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPinInput(val);
              }}
              className="sr-only"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pinInput.length === 4) {
                  handleVerifyPin();
                }
              }}
            />
            {/* Numeric keypad for mobile-friendly input */}
            <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-12 text-lg font-medium"
                  onClick={() => {
                    if (pinInput.length < 4) {
                      setPinInput(prev => prev + num.toString());
                    }
                  }}
                >
                  {num}
                </Button>
              ))}
              <div />
              <Button
                variant="outline"
                className="h-12 text-lg font-medium"
                onClick={() => {
                  if (pinInput.length < 4) {
                    setPinInput(prev => prev + '0');
                  }
                }}
              >
                0
              </Button>
              <Button
                variant="ghost"
                className="h-12 text-lg"
                onClick={() => setPinInput(prev => prev.slice(0, -1))}
              >
                ←
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowPinDialog(false); setPinInput(''); }}>
              Cancel
            </Button>
            <Button onClick={handleVerifyPin} disabled={pinVerifying || pinInput.length !== 4} className="gap-2">
              {pinVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Profile Dialog ────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Profile
            </DialogTitle>
            <DialogDescription>
              Create a new profile for a personalized experience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Enter profile name"
                className="bg-background"
                maxLength={20}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={newProfileKids ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewProfileKids(!newProfileKids)}
                className="gap-1.5"
              >
                <Baby className="h-4 w-4" />
                {newProfileKids ? 'Kids Profile' : 'Kids?'}
              </Button>
              {newProfileKids && (
                <span className="text-xs text-muted-foreground">
                  Content will be restricted to age-appropriate titles
                </span>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowAddDialog(false); setNewProfileName(''); setNewProfileKids(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAddProfile} disabled={addingProfile || !newProfileName.trim()} className="gap-2">
              {addingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Profile Dialog ────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update profile name and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-profile-name">Profile Name</Label>
              <Input
                id="edit-profile-name"
                value={editProfileName}
                onChange={(e) => setEditProfileName(e.target.value)}
                placeholder="Enter profile name"
                className="bg-background"
                maxLength={20}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowEditDialog(false); setEditingProfile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile || !editProfileName.trim()} className="gap-2">
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Profile Dialog ──────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Profile
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingProfile?.profileName}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowDeleteDialog(false); setDeletingProfile(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteProfile} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
