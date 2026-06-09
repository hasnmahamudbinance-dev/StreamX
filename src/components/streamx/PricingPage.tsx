'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check,
  X,
  Crown,
  Users,
  Star,
  Loader2,
  Film,
  Sparkles,
  Tag,
  ArrowLeft,
  Monitor,
  Smartphone,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SubscriptionPlan, UserSubscription } from '@/lib/types';

// ─── Animation Variants ─────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

// ─── Plan Card Icons ────────────────────────────────────────────────
function getPlanIcon(planName: string) {
  const name = planName.toLowerCase();
  if (name.includes('family')) return Users;
  if (name.includes('premium') || name.includes('pro')) return Crown;
  return Star;
}

// ─── Feature Check Component ────────────────────────────────────────
function FeatureCheck({ included, text }: { included: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {included ? (
        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
      )}
      <span className={`text-sm ${included ? 'text-foreground' : 'text-muted-foreground/60'}`}>
        {text}
      </span>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export function PricingPage() {
  const { navigate, isAuthenticated } = useAppStore();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [annualPricing, setAnnualPricing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<{ type: string; value: number } | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  // ─── Fetch Data ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch('/api/subscriptions/plans'),
        fetch('/api/subscriptions/current'),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }

      if (subRes.ok) {
        const subData = await subRes.json();
        setCurrentSubscription(subData.subscription || null);
      }
    } catch {
      toast.error('Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Get Plan Features ──────────────────────────────────────────
  const getPlanFeatures = (plan: SubscriptionPlan): string[] => {
    const features: string[] = [];

    // Parse features from JSON string if available
    if (plan.features) {
      try {
        const parsed = JSON.parse(plan.features);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fall through to defaults
      }
    }

    // Default features based on plan properties
    features.push(`${plan.maxResolution} streaming quality`);
    features.push(`Watch on ${plan.maxDevices} device${plan.maxDevices !== 1 ? 's' : ''} at a time`);
    features.push(`Up to ${plan.maxProfiles} profile${plan.maxProfiles !== 1 ? 's' : ''}`);

    if (plan.allowDownloads) features.push('Download content');
    if (plan.allowOffline) features.push('Offline viewing');
    if (plan.trialDays > 0) features.push(`${plan.trialDays}-day free trial`);

    return features;
  };

  // ─── Get Price ──────────────────────────────────────────────────
  const getPrice = (plan: SubscriptionPlan): number => {
    if (annualPricing && plan.interval === 'month') {
      return plan.price * 10; // ~2 months free for annual
    }
    return plan.price;
  };

  const getPriceInterval = (plan: SubscriptionPlan): string => {
    if (annualPricing && plan.interval === 'month') return '/year';
    return plan.interval === 'year' ? '/year' : '/month';
  };

  // ─── Get Button Label ───────────────────────────────────────────
  const getButtonLabel = (plan: SubscriptionPlan): { text: string; variant: 'default' | 'outline' | 'secondary' } => {
    if (!isAuthenticated) {
      return { text: 'Sign Up to Subscribe', variant: 'default' };
    }

    if (!currentSubscription) {
      if (plan.trialDays > 0) {
        return { text: 'Start Free Trial', variant: 'default' };
      }
      if (plan.price === 0) {
        return { text: 'Get Started', variant: 'default' };
      }
      return { text: 'Subscribe', variant: 'default' };
    }

    if (currentSubscription.planId === plan.id) {
      return { text: 'Current Plan', variant: 'secondary' };
    }

    // Determine upgrade vs downgrade based on price
    const currentPrice = currentSubscription.plan?.price ?? 0;
    if (plan.price > currentPrice) {
      return { text: 'Upgrade', variant: 'default' };
    }
    return { text: 'Downgrade', variant: 'outline' };
  };

  // ─── Apply Coupon ───────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponApplying(true);
    try {
      const res = await fetch('/api/subscriptions/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid coupon code');

      setCouponDiscount({ type: data.discountType, value: data.discountValue });
      toast.success(`Coupon applied: ${data.discountType === 'percentage' ? `${data.discountValue}% off` : `$${data.discountValue} off`}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid coupon code');
      setCouponDiscount(null);
    } finally {
      setCouponApplying(false);
    }
  };

  // ─── Handle Subscribe ───────────────────────────────────────────
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      navigate('register');
      return;
    }

    if (currentSubscription?.planId === plan.id) return;

    setSubscribing(plan.id);
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          couponCode: couponDiscount ? couponCode : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');

      toast.success(currentSubscription ? 'Plan updated successfully!' : 'Subscribed successfully!');
      setCurrentSubscription(data.subscription || null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[480px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sort plans by order then price
  const sortedPlans = [...plans].sort((a, b) => a.order - b.order || a.price - b.price);

  // ─── Main Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Film className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-primary">StreamX</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pick the plan that&apos;s right for you. Upgrade, downgrade, or cancel anytime.
          </p>
        </motion.div>

        {/* Annual Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-10"
        >
          <span className={`text-sm font-medium ${!annualPricing ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={annualPricing}
            onCheckedChange={setAnnualPricing}
          />
          <span className={`text-sm font-medium ${annualPricing ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual
          </span>
          {annualPricing && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 text-xs gap-1">
              <Sparkles className="h-3 w-3" /> Save ~17%
            </Badge>
          )}
        </motion.div>

        {/* Not authenticated CTA */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mb-6"
          >
            <p className="text-muted-foreground text-sm">
              You need an account to subscribe.{' '}
              <button
                onClick={() => navigate('register')}
                className="text-primary hover:underline font-medium"
              >
                Sign up now
              </button>
            </p>
          </motion.div>
        )}

        {/* Plan Cards */}
        {sortedPlans.length === 0 ? (
          <div className="text-center py-20">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No plans available at this time</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('home')}>
              <ArrowLeft className="h-4 w-4" /> Go Home
            </Button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            {sortedPlans.map((plan, index) => {
              const Icon = getPlanIcon(plan.name);
              const isPremium = plan.name.toLowerCase().includes('premium') || plan.name.toLowerCase().includes('pro');
              const isFamily = plan.name.toLowerCase().includes('family');
              const isFree = plan.price === 0;
              const isCurrentPlan = currentSubscription?.planId === plan.id;
              const buttonInfo = getButtonLabel(plan);
              const features = getPlanFeatures(plan);
              const price = getPrice(plan);
              const priceInterval = getPriceInterval(plan);

              return (
                <motion.div key={plan.id} variants={cardVariants}>
                  <Card className={`
                    relative h-full flex flex-col transition-shadow duration-300
                    ${isPremium
                      ? 'bg-card border-primary shadow-lg shadow-primary/10 hover:shadow-primary/20'
                      : isFamily
                        ? 'bg-card border-purple-500/50 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20'
                        : 'bg-card border-border hover:border-muted-foreground/30'
                    }
                    ${isCurrentPlan ? 'ring-2 ring-primary' : ''}
                  `}>
                    {/* Most Popular Badge */}
                    {isPremium && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-4 py-1 gap-1">
                          <Crown className="h-3 w-3" /> Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-2 pt-6">
                      <div className={`
                        mx-auto mb-3 p-3 rounded-xl
                        ${isPremium ? 'bg-primary/10 text-primary' : isFamily ? 'bg-purple-500/10 text-purple-500' : 'bg-muted text-muted-foreground'}
                      `}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{plan.displayName || plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription className="text-xs">{plan.description}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col px-6 pb-6">
                      {/* Price */}
                      <div className="text-center mb-6">
                        {isFree ? (
                          <div className="text-4xl font-bold">Free</div>
                        ) : (
                          <div>
                            <span className="text-4xl font-bold">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {priceInterval}
                            </span>
                          </div>
                        )}
                        {annualPricing && !isFree && plan.interval === 'month' && (
                          <p className="text-xs text-green-500 mt-1">
                            ${(plan.price).toFixed(2)}/mo billed annually
                          </p>
                        )}
                        {couponDiscount && !isFree && (
                          <p className="text-xs text-green-500 mt-1">
                            Coupon: {couponDiscount.type === 'percentage' ? `${couponDiscount.value}%` : `$${couponDiscount.value}`} off
                          </p>
                        )}
                      </div>

                      <Separator className="mb-4" />

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <Monitor className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-medium">{plan.maxResolution}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <Smartphone className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-medium">{plan.maxDevices} device{plan.maxDevices !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <Download className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-medium">{plan.allowDownloads ? 'Yes' : 'No'}</p>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="space-y-2.5 flex-1 mb-6">
                        {features.map((feature, fIndex) => (
                          <FeatureCheck key={fIndex} included={true} text={feature} />
                        ))}
                        {/* Show some disabled features for contrast */}
                        {!plan.allowDownloads && (
                          <FeatureCheck included={false} text="Download content" />
                        )}
                        {!plan.allowOffline && (
                          <FeatureCheck included={false} text="Offline viewing" />
                        )}
                      </div>

                      {/* CTA Button */}
                      {isCurrentPlan ? (
                        <Button
                          variant="secondary"
                          className="w-full gap-2"
                          disabled
                        >
                          <Check className="h-4 w-4" /> Current Plan
                        </Button>
                      ) : (
                        <Button
                          variant={buttonInfo.variant}
                          className={`
                            w-full gap-2
                            ${isPremium && buttonInfo.variant === 'default' ? 'bg-primary hover:bg-primary/90' : ''}
                            ${isFamily && buttonInfo.variant === 'default' ? 'bg-purple-600 hover:bg-purple-600/90' : ''}
                          `}
                          onClick={() => handleSubscribe(plan)}
                          disabled={subscribing === plan.id}
                        >
                          {subscribing === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : plan.trialDays > 0 && !currentSubscription ? (
                            <Sparkles className="h-4 w-4" />
                          ) : null}
                          {buttonInfo.text}
                        </Button>
                      )}

                      {/* Free Trial Info */}
                      {plan.trialDays > 0 && !isCurrentPlan && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          {plan.trialDays}-day free trial, cancel anytime
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Coupon Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="max-w-md mx-auto bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Have a coupon code?</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="bg-background flex-1"
                  maxLength={20}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={couponApplying || !couponCode.trim()}
                >
                  {couponApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {couponDiscount && (
                <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Coupon applied: {couponDiscount.type === 'percentage' ? `${couponDiscount.value}% off` : `$${couponDiscount.value} off`}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          All plans include access to the full content library. Prices may vary by region.
          <br />
          Cancel anytime from your account settings.
        </motion.p>
      </div>
    </div>
  );
}
