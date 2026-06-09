'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Crown,
  RefreshCw,
  XCircle,
  Clock,
  Receipt,
  Zap,
  Film,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserSubscription, PaymentRecord, SubscriptionPlan } from '@/lib/types';

// ─── Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
  trial: { label: 'Free Trial', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock },
  past_due: { label: 'Past Due', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: 'Paid', color: 'text-green-500' },
  pending: { label: 'Pending', color: 'text-amber-500' },
  failed: { label: 'Failed', color: 'text-red-500' },
  refunded: { label: 'Refunded', color: 'text-blue-500' },
};

// ─── Helpers ────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// ─── Component ──────────────────────────────────────────────────────

export function BillingPage() {
  const { navigate, isAuthenticated } = useAppStore();

  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // ─── Fetch Data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [subRes, billingRes] = await Promise.all([
        fetch('/api/subscriptions/current'),
        fetch('/api/subscriptions/billing'),
      ]);

      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription || null);
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setPayments(billingData.payments || []);
      }
    } catch {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Cancel Subscription ────────────────────────────────────────
  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription');

      toast.success('Subscription cancelled. You can continue using it until the end of your billing period.');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  // ─── Reactivate Subscription ────────────────────────────────────
  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const res = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate subscription');

      toast.success('Subscription reactivated successfully!');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate subscription');
    } finally {
      setReactivating(false);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Not Authenticated ──────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-border">
          <CardContent className="p-6 text-center">
            <Film className="h-8 w-8 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Please sign in to manage your billing</p>
            <Button onClick={() => navigate('login')} className="gap-2">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = subscription ? STATUS_CONFIG[subscription.status] || STATUS_CONFIG.expired : null;
  const StatusIcon = statusConfig?.icon || XCircle;
  const isCancelled = subscription?.status === 'cancelled';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trial';
  const canReactivate = isCancelled && subscription?.cancelAtPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date();
  const plan = subscription?.plan;

  // ─── Empty State ────────────────────────────────────────────────
  if (!subscription) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-8"
          >
            <Button variant="ghost" size="icon" onClick={() => navigate('home')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Billing</h1>
              <p className="text-sm text-muted-foreground">Manage your subscription</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card border-border text-center py-16">
              <CardContent>
                <CreditCard className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Active Subscription</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You don&apos;t have an active subscription. Choose a plan to unlock premium content and features.
                </p>
                <Button onClick={() => navigate('pricing')} className="gap-2">
                  <Crown className="h-4 w-4" /> View Plans
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate('home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Billing</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription and payments</p>
          </div>
        </motion.div>

        {/* Current Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border mb-6">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Current Plan</CardTitle>
                    <CardDescription>{plan?.displayName || plan?.name || 'Unknown Plan'}</CardDescription>
                  </div>
                </div>
                {statusConfig && (
                  <Badge variant="outline" className={`gap-1.5 ${statusConfig.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plan Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plan?.price !== undefined && plan.price > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(plan.price, plan.currency || 'USD')}/{plan.interval || 'month'}
                      </p>
                    </div>
                  </div>
                )}
                {plan?.maxResolution && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Resolution</p>
                      <p className="text-sm font-medium">{plan.maxResolution}</p>
                    </div>
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isCancelled ? 'Access Until' : 'Next Billing Date'}
                      </p>
                      <p className="text-sm font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
                    </div>
                  </div>
                )}
                {subscription.trialEnd && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Trial Ends</p>
                      <p className="text-sm font-medium">{formatDate(subscription.trialEnd)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cancelled notice */}
              {isCancelled && subscription.cancelledAt && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-500">Subscription Cancelled</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your subscription was cancelled on {formatDate(subscription.cancelledAt)}.
                      You can continue using it until {formatDate(subscription.currentPeriodEnd)}.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {canReactivate && (
                  <Button
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="gap-2"
                  >
                    {reactivating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Reactivate
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => navigate('pricing')}
                  className="gap-2"
                >
                  <Crown className="h-4 w-4" /> Change Plan
                </Button>

                {isActive && !isCancelled && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="gap-2 ml-auto">
                        <XCircle className="h-4 w-4" /> Cancel Subscription
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription will remain active until the end of your current billing period
                          ({formatDate(subscription.currentPeriodEnd)}). After that, you&apos;ll lose access
                          to premium features and content.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancel}
                          disabled={cancelling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                        >
                          {cancelling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Cancel Anyway
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Payment History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No payment history yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Your payment records will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const payStatus = PAYMENT_STATUS_CONFIG[payment.status] || PAYMENT_STATUS_CONFIG.pending;
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {formatDate(payment.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {payment.description || `${plan?.displayName || plan?.name || 'Plan'} subscription`}
                            </TableCell>
                            <TableCell className="text-sm font-medium whitespace-nowrap">
                              {formatCurrency(payment.amount, payment.currency || 'USD')}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium ${payStatus.color}`}>
                                {payStatus.label}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {payment.status === 'completed' && (
                                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground">
                                  <ExternalLink className="h-3 w-3" /> View
                                </Button>
                              )}
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
        </motion.div>

        {/* Footer Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Need help with billing?{' '}
          <button className="text-primary hover:underline">Contact Support</button>
        </motion.p>
      </div>
    </div>
  );
}
