'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Film,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password';

interface AuthPageProps {
  mode: AuthMode;
}

// ─── Password Strength Helper ──────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 25;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  if (score <= 25) return { score, label: 'Weak', color: 'text-red-500' };
  if (score <= 50) return { score, label: 'Fair', color: 'text-orange-500' };
  if (score <= 75) return { score, label: 'Good', color: 'text-yellow-500' };
  return { score, label: 'Strong', color: 'text-green-500' };
}

function getProgressColor(score: number): string {
  if (score <= 25) return '[&>div]:bg-red-500';
  if (score <= 50) return '[&>div]:bg-orange-500';
  if (score <= 75) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}

// ─── OTP Input Component ────────────────────────────────────────────
function OTPInput({ length = 6, value, onChange, disabled, error }: {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newValue = value.split('');
    newValue[index] = char.slice(-1);
    const joined = newValue.join('');
    onChange(joined);

    // Auto-focus next input
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
      const newValue = value.split('');
      newValue[index - 1] = '';
      onChange(newValue.join(''));
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
    setFocusedIndex(focusIndex);
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={() => setFocusedIndex(i)}
          disabled={disabled}
          onPaste={handlePaste}
          className={`
            w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold
            rounded-xl border-2 outline-none transition-all duration-200
            ${error
              ? 'border-red-500 bg-red-500/10 text-red-500'
              : value[i]
                ? 'border-primary bg-primary/10 text-primary'
                : focusedIndex === i
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-muted-foreground/30 bg-background text-foreground'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            focus:ring-2 focus:ring-primary/30
          `}
        />
      ))}
    </div>
  );
}

// ─── Cooldown Timer ──────────────────────────────────────────────────
function CooldownTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className="text-sm text-muted-foreground">
      {remaining > 0 ? (
        <>Resend available in {mins > 0 ? `${mins}m ` : ''}{secs}s</>
      ) : (
        <>You can now resend the code</>
      )}
    </span>
  );
}

// ─── Main AuthPage Component ──────────────────────────────────────
export function AuthPage({ mode: initialMode }: AuthPageProps) {
  const { navigate, setUser } = useAppStore();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  // OTP state
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Sync mode changes from navigation
  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccess('');
    setOtp('');
  }, [initialMode]);

  // ─── Registration Handler ──────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const strength = getPasswordStrength(password);
    if (strength.score <= 25) {
      setError('Password is too weak. Include uppercase letters, numbers, or special characters.');
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
        body: JSON.stringify({ email: email.trim(), name: name.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Registration successful — redirect to verify email
      setVerificationEmail(email.trim());
      setSuccess('Account created! Please check your email for a verification code.');
      setCooldown(60);
      setCanResend(false);
      setMode('verify-email');
      navigate('verify-email');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Login Handler ──────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        // Parse the error for lock information
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Get session after login
      const sessionRes = await fetch('/api/session');
      const sessionData = await sessionRes.json();

      if (sessionData.user) {
        setUser(sessionData.user);

        // Check if email needs verification
        if (!sessionData.user.emailVerified || sessionData.user.status === 'pending_verification') {
          setVerificationEmail(sessionData.user.email);
          setCooldown(60);
          setCanResend(false);
          setMode('verify-email');
          navigate('verify-email');
          return;
        }

        navigate('home');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Email Verification Handler ──────────────────────────────
  const handleVerifyEmail = async () => {
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('Maximum verification attempts')) {
          setAttemptsLeft(0);
        }
        setError(data.error || 'Verification failed');
        return;
      }

      setSuccess('Email verified successfully! You can now sign in.');
      setOtp('');

      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        setMode('login');
        navigate('login');
        setSuccess('');
      }, 2000);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resend Verification Code ────────────────────────────────
  const handleResendCode = async () => {
    if (!canResend) return;
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
          setCanResend(false);
        }
        setError(data.error || 'Failed to resend code');
        return;
      }

      setSuccess('New verification code sent!');
      setCooldown(60);
      setCanResend(false);
      setOtp('');
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Forgot Password Handler ──────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      // Always show success even if user doesn't exist (security best practice)
      setVerificationEmail(email.trim());
      setSuccess('If an account exists with this email, a verification code has been sent.');
      setCooldown(60);
      setCanResend(false);
      // Stay on forgot-password to enter the code
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Verify Reset Code Handler ────────────────────────────────
  const handleVerifyResetCode = async () => {
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid or expired code');
        return;
      }

      // Code verified — move to reset password step
      setResetToken(data.resetToken);
      setMode('reset-password');
      navigate('reset-password');
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Reset Password Handler ───────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      setSuccess('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        setMode('login');
        navigate('login');
        setSuccess('');
        setNewPassword('');
        setConfirmNewPassword('');
        setOtp('');
      }, 2000);
    } catch {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Animation Variants ────────────────────────────────────────
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const passwordStrength = getPasswordStrength(mode === 'register' ? password : newPassword);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="bg-card/90 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader className="text-center pb-2">
              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Film className="h-6 w-6 text-primary" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  StreamX
                </span>
              </div>

              {/* Back button for sub-flows */}
              {(mode === 'verify-email' || mode === 'forgot-password' || mode === 'reset-password') && (
                <button
                  onClick={() => {
                    if (mode === 'verify-email') {
                      setMode('login');
                      navigate('login');
                    } else if (mode === 'forgot-password') {
                      setMode('login');
                      navigate('login');
                    } else if (mode === 'reset-password') {
                      setMode('forgot-password');
                      navigate('forgot-password');
                    }
                    setError('');
                    setSuccess('');
                    setOtp('');
                  }}
                  className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

              <CardTitle className="text-xl">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'register' && 'Create Account'}
                {mode === 'verify-email' && 'Verify Your Email'}
                {mode === 'forgot-password' && 'Reset Password'}
                {mode === 'reset-password' && 'Create New Password'}
              </CardTitle>
              <CardDescription>
                {mode === 'login' && 'Sign in to continue watching'}
                {mode === 'register' && 'Start your streaming journey'}
                {mode === 'verify-email' && `We sent a code to ${verificationEmail || 'your email'}`}
                {mode === 'forgot-password' && 'Enter your email to receive a reset code'}
                {mode === 'reset-password' && 'Enter your new password'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {success && (
                <Alert className="mb-4 border-green-500/30 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-sm text-green-500">{success}</AlertDescription>
                </Alert>
              )}

              {/* ─── Login Form ──────────────────────────────── */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        required
                        className="bg-secondary/50 border-border pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot-password'); navigate('forgot-password'); setError(''); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="Enter your password"
                        required
                        className="bg-secondary/50 border-border pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Signing In...</>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              )}

              {/* ─── Register Form ──────────────────────────── */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="reg-name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(''); }}
                      placeholder="Your name (optional)"
                      className="bg-secondary/50 border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        required
                        className="bg-secondary/50 border-border pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="Minimum 8 characters"
                        required
                        className="bg-secondary/50 border-border pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {password && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Progress value={passwordStrength.score} className={`h-1.5 flex-1 ${getProgressColor(passwordStrength.score)}`} />
                          <span className={`text-xs ml-2 font-medium ${passwordStrength.color}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '8+ chars', met: password.length >= 8 },
                            { label: 'Uppercase', met: /[A-Z]/.test(password) },
                            { label: 'Lowercase', met: /[a-z]/.test(password) },
                            { label: 'Number', met: /[0-9]/.test(password) },
                            { label: 'Special', met: /[^A-Za-z0-9]/.test(password) },
                          ].map(req => (
                            <span
                              key={req.label}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                req.met
                                  ? 'bg-green-500/10 text-green-500'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {req.met ? <Check className="h-2.5 w-2.5 inline mr-0.5" /> : <X className="h-2.5 w-2.5 inline mr-0.5" />}
                              {req.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-sm font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-confirm"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                        placeholder="Confirm your password"
                        required
                        className="bg-secondary/50 border-border pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> Passwords do not match
                      </p>
                    )}
                    {confirmPassword && password === confirmPassword && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Creating Account...</>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              )}

              {/* ─── Verify Email Form ──────────────────────── */}
              {mode === 'verify-email' && (
                <div className="space-y-6">
                  {/* Email icon */}
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Enter the 6-digit code sent to<br />
                    <span className="text-foreground font-medium">{verificationEmail}</span>
                  </p>

                  {/* OTP Input */}
                  <OTPInput
                    value={otp}
                    onChange={setOtp}
                    disabled={isLoading}
                    error={!!error && error.includes('Invalid')}
                  />

                  {/* Attempts warning */}
                  {attemptsLeft !== null && attemptsLeft <= 2 && attemptsLeft > 0 && (
                    <p className="text-xs text-amber-500 text-center">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                    </p>
                  )}

                  <Button
                    onClick={handleVerifyEmail}
                    className="w-full h-11 text-base font-semibold"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 mr-2" />
                        Verify Email
                      </>
                    )}
                  </Button>

                  {/* Resend */}
                  <div className="text-center space-y-2">
                    {cooldown > 0 ? (
                      <CooldownTimer
                        seconds={cooldown}
                        onExpire={() => setCanResend(true)}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Didn&apos;t receive the code?</span>
                    )}
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResendCode}
                        disabled={!canResend || isLoading}
                        className="text-primary"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-1" />
                        )}
                        Resend Code
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Forgot Password Form ─────────────────── */}
              {mode === 'forgot-password' && !success && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <KeyRound className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Enter your email address and we&apos;ll send you a code to reset your password.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="you@example.com"
                        required
                        className="bg-secondary/50 border-border pl-10"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending Code...</>
                    ) : (
                      'Send Reset Code'
                    )}
                  </Button>
                </form>
              )}

              {/* ─── Forgot Password - Enter Code Step ──────── */}
              {mode === 'forgot-password' && success && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Enter the 6-digit code sent to<br />
                    <span className="text-foreground font-medium">{verificationEmail}</span>
                  </p>

                  <OTPInput
                    value={otp}
                    onChange={setOtp}
                    disabled={isLoading}
                    error={!!error && error.includes('Invalid')}
                  />

                  <Button
                    onClick={handleVerifyResetCode}
                    className="w-full h-11 text-base font-semibold"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>

                  {/* Resend */}
                  <div className="text-center space-y-2">
                    {cooldown > 0 ? (
                      <CooldownTimer
                        seconds={cooldown}
                        onExpire={() => setCanResend(true)}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Didn&apos;t receive the code?</span>
                    )}
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!canResend) return;
                          setIsLoading(true);
                          try {
                            const res = await fetch('/api/auth/forgot-password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: verificationEmail }),
                            });
                            setCooldown(60);
                            setCanResend(false);
                            setOtp('');
                          } catch {}
                          setIsLoading(false);
                        }}
                        disabled={!canResend || isLoading}
                        className="text-primary"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Resend Code
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Reset Password Form ──────────────────── */}
              {mode === 'reset-password' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10">
                      <Lock className="h-8 w-8 text-primary" />
                    </div>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Create a new password for your account.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                        placeholder="Minimum 8 characters"
                        required
                        className="bg-secondary/50 border-border pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {newPassword && (
                      <div className="flex items-center gap-2">
                        <Progress value={passwordStrength.score} className={`h-1.5 flex-1 ${getProgressColor(passwordStrength.score)}`} />
                        <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="text-sm font-medium">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-new-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => { setConfirmNewPassword(e.target.value); setError(''); }}
                        placeholder="Confirm your new password"
                        required
                        className="bg-secondary/50 border-border pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmNewPassword && newPassword !== confirmNewPassword && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <X className="h-3 w-3" /> Passwords do not match
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Resetting...</>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </form>
              )}

              {/* ─── Bottom Navigation Links ────────────────── */}
              <div className="mt-6 pt-4 border-t border-border/50">
                {mode === 'login' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => { setMode('register'); navigate('register'); setError(''); setSuccess(''); }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Sign Up
                    </button>
                  </p>
                )}
                {mode === 'register' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      onClick={() => { setMode('login'); navigate('login'); setError(''); setSuccess(''); }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Sign In
                    </button>
                  </p>
                )}
                {mode === 'verify-email' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Wrong email?{' '}
                    <button
                      onClick={() => { setMode('register'); navigate('register'); setError(''); setSuccess(''); setOtp(''); }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Create a new account
                    </button>
                  </p>
                )}

                {/* Demo credentials */}
                {(mode === 'login') && (
                  <div className="mt-4 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Demo Accounts:</p>
                    <p>Admin: admin@streamx.com / admin123</p>
                    <p>User: user@streamx.com / user123</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
