'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Progress } from '@/components/ui/progress';
import {
  Film, Eye, EyeOff, Loader2, ArrowLeft, Mail, Lock, User,
  CheckCircle2, AlertCircle, Shield, KeyRound, RefreshCw, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

type AuthScreen = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password';

interface AuthPageProps {
  mode?: AuthScreen;
  initialEmail?: string;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: 'Very Weak', color: 'bg-red-500' };
  if (score === 2) return { score: 40, label: 'Weak', color: 'bg-orange-500' };
  if (score === 3) return { score: 60, label: 'Fair', color: 'bg-yellow-500' };
  if (score === 4) return { score: 80, label: 'Strong', color: 'bg-green-400' };
  return { score: 100, label: 'Very Strong', color: 'bg-green-500' };
}

const screenVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const screenTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25,
};

export function AuthPage({ mode = 'login', initialEmail = '' }: AuthPageProps) {
  const { navigate, setUser } = useAppStore();
  const [screen, setScreen] = useState<AuthScreen>(mode);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [screenKey, setScreenKey] = useState(0);

  // Form state
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Verification state
  const [demoCode, setDemoCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resetToken, setResetToken] = useState('');

  // Update screen when mode prop changes
  useEffect(() => {
    setScreen(mode);
    setScreenKey((k) => k + 1);
  }, [mode]);

  // Update email when initialEmail prop changes
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const switchScreen = useCallback((newScreen: AuthScreen) => {
    setError('');
    setOtpValue('');
    setScreen(newScreen);
    setScreenKey((k) => k + 1);
  }, []);

  // ─── LOGIN HANDLER ────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      // Get session after login
      const sessionRes = await fetch('/api/session');
      const sessionData = await sessionRes.json();

      if (sessionData.user) {
        setUser(sessionData.user);

        // Check if user needs email verification
        if (sessionData.user.status === 'pending_verification' || sessionData.user.emailVerified === false) {
          toast.info('Please verify your email to continue');
          switchScreen('verify-email');
          // Request a verification code for them
          try {
            const resendRes = await fetch('/api/auth/resend-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            const resendData = await resendRes.json();
            if (resendData.verificationCode) {
              setDemoCode(resendData.verificationCode);
              setCooldown(60);
            }
          } catch {
            // Silently fail - they can use resend button
          }
        } else {
          toast.success('Welcome back!');
          navigate('home');
        }
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── REGISTER HANDLER ────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      // Show verification code from demo
      if (data.verificationCode) {
        setDemoCode(data.verificationCode);
        setCooldown(60);
      }

      toast.success('Account created! Please verify your email.');
      switchScreen('verify-email');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── VERIFY EMAIL HANDLER ────────────────────────────────
  const handleVerifyEmail = async () => {
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpValue }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        setIsLoading(false);
        return;
      }

      toast.success('Email verified successfully! You can now sign in.');
      setDemoCode('');
      setOtpValue('');
      switchScreen('login');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── RESEND VERIFICATION CODE ────────────────────────────
  const handleResendCode = async () => {
    if (cooldown > 0) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
          toast.error(data.error);
        } else {
          toast.error(data.error || 'Failed to resend code');
        }
        setIsLoading(false);
        return;
      }

      if (data.verificationCode) {
        setDemoCode(data.verificationCode);
      }
      setCooldown(60);
      toast.success('Verification code sent!');
    } catch {
      toast.error('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── FORGOT PASSWORD HANDLER ─────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send reset code');
        setIsLoading(false);
        return;
      }

      if (data.resetCode) {
        setDemoCode(data.resetCode);
      }
      setCooldown(60);
      toast.success('Reset code sent to your email!');
      switchScreen('reset-password');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── VERIFY RESET CODE HANDLER ───────────────────────────
  const handleVerifyResetCode = async () => {
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit reset code');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // First verify the code
      const verifyRes = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpValue }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || 'Invalid or expired reset code');
        setIsLoading(false);
        return;
      }

      // Then reset the password
      const resetRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: verifyData.resetToken, newPassword }),
      });

      const resetData = await resetRes.json();
      if (!resetRes.ok) {
        setError(resetData.error || 'Failed to reset password');
        setIsLoading(false);
        return;
      }

      toast.success('Password reset successfully! Please sign in with your new password.');
      setDemoCode('');
      setOtpValue('');
      setNewPassword('');
      setResetToken('');
      switchScreen('login');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── PASSWORD STRENGTH COMPONENT ─────────────────────────
  const PasswordStrengthMeter = ({ pwd }: { pwd: string }) => {
    if (!pwd) return null;
    const strength = getPasswordStrength(pwd);
    return (
      <div className="space-y-1.5">
        <Progress value={strength.score} className={`h-1.5 ${strength.color}`} />
        <p className={`text-xs ${
          strength.score <= 40 ? 'text-red-400' :
          strength.score <= 60 ? 'text-yellow-400' :
          'text-green-400'
        }`}>
          {strength.label}
        </p>
      </div>
    );
  };

  // ─── DEMO CODE BANNER ────────────────────────────────────
  const DemoCodeBanner = ({ code, label }: { code: string; label?: string }) => {
    if (!code) return null;
    return (
      <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-500">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">{label || 'Demo Code'}:</span>{' '}
          <span className="font-mono text-lg tracking-widest font-bold">{code}</span>
        </AlertDescription>
      </Alert>
    );
  };

  // ─── RENDER SCREENS ──────────────────────────────────────

  const renderLoginScreen = () => (
    <motion.div
      key={`login-${screenKey}`}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={screenTransition}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <CardTitle className="text-xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to access your watchlist and continue watching</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              <button
                type="button"
                onClick={() => switchScreen('forgot-password')}
                className="text-xs text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="bg-secondary border-border pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing In...</>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button
            onClick={() => {
              setEmail('');
              setPassword('');
              switchScreen('register');
            }}
            className="text-primary hover:underline font-medium"
          >
            Sign Up
          </button>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground border border-border/50">
          <p className="font-medium mb-1.5 text-foreground/80">Demo Accounts:</p>
          <div className="space-y-1">
            <p className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-primary" />
              <span>Admin: admin@streamx.com / admin123</span>
            </p>
            <p className="flex items-center gap-2">
              <User className="h-3 w-3 text-primary" />
              <span>User: user@streamx.com / user123</span>
            </p>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );

  const renderRegisterScreen = () => (
    <motion.div
      key={`register-${screenKey}`}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={screenTransition}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <CardTitle className="text-xl">Create Account</CardTitle>
        <CardDescription>Join StreamX to discover and save your favorite content</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reg-name">Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="bg-secondary border-border pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter pwd={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-confirm">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="bg-secondary border-border pl-10"
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Passwords match
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account...</>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={() => {
              setPassword('');
              setConfirmPassword('');
              switchScreen('login');
            }}
            className="text-primary hover:underline font-medium"
          >
            Sign In
          </button>
        </div>
      </CardContent>
    </motion.div>
  );

  const renderVerifyEmailScreen = () => (
    <motion.div
      key={`verify-${screenKey}`}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={screenTransition}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Verify Your Email</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification code to{' '}
          <span className="text-foreground font-medium">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DemoCodeBanner code={demoCode} label="Verification Code (Demo)" />

          <div className="space-y-3">
            <Label className="text-center block">Enter 6-digit code</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => {
                  setOtpValue(value);
                  setError('');
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <Button
            onClick={handleVerifyEmail}
            className="w-full"
            disabled={isLoading || otpValue.length !== 6}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Verify Email
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2">
            {cooldown > 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Resend code in <span className="font-mono text-foreground">{cooldown}s</span>
              </p>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-primary hover:text-primary"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" /> Resend Code
              </Button>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                setDemoCode('');
                setOtpValue('');
                switchScreen('login');
              }}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );

  const renderForgotPasswordScreen = () => (
    <motion.div
      key={`forgot-${screenKey}`}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={screenTransition}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a code to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-secondary border-border pl-10"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Code...</>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" /> Send Reset Code
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setEmail('');
              switchScreen('login');
            }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </button>
        </div>
      </CardContent>
    </motion.div>
  );

  const renderResetPasswordScreen = () => (
    <motion.div
      key={`reset-${screenKey}`}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={screenTransition}
    >
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Film className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-primary tracking-tight">StreamX</span>
        </div>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Set New Password</CardTitle>
        <CardDescription>
          Enter the reset code and your new password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DemoCodeBanner code={demoCode} label="Reset Code (Demo)" />

          <div className="space-y-3">
            <Label className="text-center block">Enter 6-digit reset code</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => {
                  setOtpValue(value);
                  setError('');
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="bg-secondary border-border pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter pwd={newPassword} />
          </div>

          <Button
            onClick={handleVerifyResetCode}
            className="w-full"
            disabled={isLoading || otpValue.length !== 6 || !newPassword}
          >
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting Password...</>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-2" /> Reset Password
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={() => {
                setDemoCode('');
                setOtpValue('');
                setNewPassword('');
                switchScreen('login');
              }}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>
          </div>
        </div>
      </CardContent>
    </motion.div>
  );

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return renderLoginScreen();
      case 'register':
        return renderRegisterScreen();
      case 'verify-email':
        return renderVerifyEmailScreen();
      case 'forgot-password':
        return renderForgotPasswordScreen();
      case 'reset-password':
        return renderResetPasswordScreen();
      default:
        return renderLoginScreen();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-background" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        {/* Decorative blur circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-card/80 backdrop-blur-sm border-border shadow-2xl shadow-black/20">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </Card>
    </div>
  );
}
