'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Download,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Eye,
  Lock,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

export function PrivacyPage() {
  const { isAuthenticated, navigate, logout } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to export your data');
      navigate('login');
      return;
    }

    setExporting(true);
    try {
      const res = await fetch('/api/profile/export-data');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to export data');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamx-data-export.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;

    setDeleting(true);
    try {
      const res = await fetch('/api/profile/delete-account', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      toast.success('Account deleted successfully');
      await logout();
      navigate('home');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-24 md:pb-8">
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Privacy & Data</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your data, privacy settings, and account</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Data Export Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Your Data
            </CardTitle>
            <CardDescription>
              Download a copy of all the data we have stored about you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your export will include the following data:
            </p>
            <div className="flex flex-wrap gap-2">
              {['Profile', 'Watchlist', 'Watch History', 'Ratings', 'Reviews', 'Notifications'].map((item) => (
                <Badge key={item} variant="outline" className="gap-1">
                  <Database className="h-3 w-3" />
                  {item}
                </Badge>
              ))}
            </div>
            <Button
              onClick={handleExportData}
              disabled={exporting || !isAuthenticated}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export My Data
            </Button>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground">
                Please sign in to export your data
              </p>
            )}
          </CardContent>
        </Card>

        {/* Account Deletion Section */}
        <Card className="bg-card border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">This action cannot be undone</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All your data including profile, watchlist, history, ratings, reviews, and notifications will be permanently deleted. This cannot be recovered.
                </p>
              </div>
            </div>

            {isAuthenticated ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleting}
                  className="gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete Account
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Please sign in to delete your account
              </p>
            )}
          </CardContent>
        </Card>

        {/* Privacy Policy Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Privacy Policy
            </CardTitle>
            <CardDescription>
              Last updated: March 2026
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Information We Collect */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Information We Collect</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We collect information you provide directly to us, such as when you create an account,
                update your profile, add items to your watchlist, rate content, or contact us for support.
                This may include your name, email address, and preferences. We also automatically collect
                certain information when you use our service, including your watch history, playback progress,
                and device information.
              </p>
            </div>

            <Separator />

            {/* How We Use Your Data */}
            <div>
              <h3 className="text-sm font-semibold mb-2">How We Use Your Data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use the information we collect to provide, maintain, and improve our services,
                including personalizing content recommendations, tracking your watch progress and watchlist,
                sending notifications about new content, processing support requests, and communicating
                with you about your account. We do not sell your personal information to third parties.
              </p>
            </div>

            <Separator />

            {/* Data Storage */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Data Storage</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data is stored securely on our servers with appropriate encryption and access controls.
                We retain your personal data for as long as your account is active or as needed to provide
                you services. If you wish to delete your account, you can do so from the account deletion
                section above, and we will permanently remove your data in accordance with our retention policy.
              </p>
            </div>

            <Separator />

            {/* Your Rights */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Your Rights</h3>
              <div className="space-y-2">
                {[
                  { icon: Download, text: 'Right to access and export your personal data' },
                  { icon: Trash2, text: 'Right to deletion of your personal data' },
                  { icon: Eye, text: 'Right to know what data is collected about you' },
                  { icon: Shield, text: 'Right to object to processing of your personal data' },
                ].map((right, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <right.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground">{right.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Contact</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please
                contact us through our{' '}
                <button
                  onClick={() => navigate('support')}
                  className="text-primary hover:underline font-medium"
                >
                  Help & Support
                </button>{' '}
                page. We are committed to resolving any concerns you may have about your privacy.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Protection Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Data Protection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Lock className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Encryption in Transit</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      All data transmitted between your browser and our servers is encrypted using TLS (Transport Layer Security)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Shield className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Secure Password Storage</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Passwords are hashed using bcrypt with salt rounds, ensuring they cannot be read even by our team
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Eye className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Access Controls</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Strict role-based access controls ensure only authorized personnel can access user data
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Audit Logging</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      All administrative actions and sensitive operations are logged for accountability and security review
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Content Reporting */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Content Reporting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Report content directly from any movie or TV show detail page using the Report button.
              Our team will review all reports and take appropriate action.
            </p>
            <p className="text-xs text-muted-foreground">
              {isAuthenticated ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  You are signed in and can report content
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Content reporting is available for logged-in users only
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
