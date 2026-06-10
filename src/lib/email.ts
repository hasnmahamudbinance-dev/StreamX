// Email utility - Multi-provider support (Resend + Demo/Fallback)
// Provider auto-detected from EMAIL_PROVIDER env var
import { db } from './db';

// ---------------------------------------------------------------------------
// Startup diagnostics — log email config once at module load
// ---------------------------------------------------------------------------

console.log('[email] Module loaded — diagnosing email configuration:');
console.log('[email]   EMAIL_PROVIDER  =', process.env.EMAIL_PROVIDER || '(not set)');
console.log('[email]   RESEND_API_KEY  =', process.env.RESEND_API_KEY ? `set (${process.env.RESEND_API_KEY.slice(0, 6)}…${process.env.RESEND_API_KEY.slice(-4)})` : '(not set)');
console.log('[email]   EMAIL_FROM      =', process.env.EMAIL_FROM || '(not set — will use fallback)');
if (process.env.EMAIL_FROM?.includes('onboarding@resend.dev')) {
  console.warn('[email] ⚠️  EMAIL_FROM uses Resend sandbox domain (onboarding@resend.dev).');
  console.warn('[email]    Resend sandbox can ONLY send to the account owner\'s email address.');
  console.warn('[email]    All other recipients will be rejected by the Resend API (422/403).');
  console.warn('[email]    To fix: verify a custom domain in Resend and update EMAIL_FROM.');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailType =
  | 'verification'
  | 'password_reset'
  | 'welcome'
  | 'security_alert'
  | 'email_change'
  | 'notification'
  | 'new_login'
  | 'two_factor_code';

interface EmailParams {
  to: string;
  subject: string;
  type: EmailType;
  html: string;
}

type EmailProvider = 'resend' | 'demo';

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  const hasApiKey = !!process.env.RESEND_API_KEY;
  console.log(`[email] getEmailProvider() → provider env="${provider}", RESEND_API_KEY present=${hasApiKey}`);
  if (provider === 'resend' && hasApiKey) {
    console.log('[email] → Selected provider: resend');
    return 'resend';
  }
  console.log('[email] → Selected provider: demo (resend not configured or EMAIL_PROVIDER not set to "resend")');
  return 'demo';
}

// ---------------------------------------------------------------------------
// Resend provider (REST API)
// ---------------------------------------------------------------------------

async function sendWithResend(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[email] sendWithResend() called — to="${to}", subject="${subject}"`);

  // Validate env vars before attempting API call
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] ❌ RESEND_API_KEY is not set — cannot send via Resend');
    return false;
  }

  const from = process.env.EMAIL_FROM || 'StreamX <noreply@streamx.com>';
  console.log(`[email]   from="${from}"`);

  // Warn about sandbox domain limitation
  if (from.includes('onboarding@resend.dev')) {
    console.warn('[email] ⚠️  Using Resend sandbox domain (onboarding@resend.dev) — emails can ONLY be sent to the Resend account owner\'s email.');
    console.warn(`[email]    Attempting to send to: ${to} — if this is NOT the Resend account owner\'s email, the API will reject it.`);
  }

  try {
    console.log('[email] → Sending POST to https://api.resend.com/emails …');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    console.log(`[email] ← Resend API responded: status=${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read response body');
      console.error(`[email] ❌ Resend API error (${response.status}): ${errorBody}`);

      // Provide actionable guidance for common errors
      if (response.status === 403 || response.status === 422) {
        if (from.includes('onboarding@resend.dev')) {
          console.error('[email] 💡 HINT: You are using the Resend sandbox domain (onboarding@resend.dev). It can ONLY send to the Resend account owner\'s email.');
          console.error('[email]    To send to any address: verify a custom domain in Resend dashboard → update EMAIL_FROM env var.');
        } else {
          console.error('[email] 💡 HINT: 422/403 may mean the recipient domain is not verified in Resend, or the from address is not authorized.');
        }
      }

      return false;
    }

    const responseBody = await response.text().catch(() => '');
    console.log(`[email] ✅ Resend API success — response: ${responseBody.slice(0, 200)}`);
    return true;
  } catch (error) {
    console.error('[email] ❌ Resend send exception:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Demo provider (console log + EmailLog table)
// ---------------------------------------------------------------------------

async function sendWithDemo(to: string, subject: string, type: EmailType): Promise<boolean> {
  console.log(`[email] 📧 [Demo provider] Simulated email — to: ${to}, subject: ${subject}, type: ${type}`);
  console.log('[email] ⚠️  No real email was delivered — demo provider only logs to console.');
  return true;
}

// ---------------------------------------------------------------------------
// Core sendEmail function (same interface as before, extended type support)
// ---------------------------------------------------------------------------

export async function sendEmail({ to, subject, type, html }: EmailParams): Promise<boolean> {
  console.log(`[email] sendEmail() called — to="${to}", subject="${subject}", type="${type}"`);

  // Validate required params
  if (!to) {
    console.error('[email] ❌ sendEmail() aborted — "to" is empty/undefined');
    return false;
  }
  if (!subject) {
    console.error('[email] ❌ sendEmail() aborted — "subject" is empty/undefined');
    return false;
  }
  if (!html) {
    console.error('[email] ❌ sendEmail() aborted — "html" is empty/undefined');
    return false;
  }

  const provider = getEmailProvider();

  try {
    let sendResult = false;
    let usedProvider = provider;

    if (provider === 'resend') {
      // Attempt Resend delivery
      sendResult = await sendWithResend(to, subject, html);

      if (!sendResult) {
        // CRITICAL: Do NOT silently fall back to demo and return true.
        // Previous code fell back to demo which returned true, making the
        // caller think the email was sent when it was NOT.
        // Now: log the failure for audit and return false so the caller
        // knows the email was NOT actually delivered.
        console.error('[email] ❌ Resend delivery failed — email was NOT delivered to the recipient.');
        console.error('[email]    The demo fallback has been removed to prevent silent email loss.');
        console.error('[email]    If you want demo mode, set EMAIL_PROVIDER=demo in your .env');
        usedProvider = 'resend-failed';
      }
    } else {
      // Demo provider (only used when explicitly configured)
      sendResult = await sendWithDemo(to, subject, type);
    }

    console.log(`[email] sendEmail() result — success=${sendResult}, provider=${usedProvider}, to=${to}`);

    // Always log to EmailLog table for audit trail
    try {
      await db.emailLog.create({
        data: {
          to,
          subject,
          type,
          status: sendResult ? 'sent' : 'failed',
          error: sendResult ? null : `Provider: ${usedProvider} — email was not delivered`,
        },
      });
      console.log('[email] EmailLog entry created successfully');
    } catch (dbError) {
      console.error('[email] ❌ Failed to write EmailLog entry:', dbError);
    }

    return sendResult;
  } catch (error) {
    console.error('[email] ❌ sendEmail() unexpected error:', error);

    // Attempt to log failure to database
    try {
      await db.emailLog.create({
        data: {
          to,
          subject,
          type,
          status: 'failed',
          error: String(error),
        },
      });
    } catch (dbError) {
      console.error('[email] ❌ Failed to write failure EmailLog entry:', dbError);
    }

    return false;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------------------------------------------------------------------------
// Shared email wrapper styles
// ---------------------------------------------------------------------------

const APP_NAME = 'StreamX';
const BRAND_COLOR = '#E50914';

function emailWrapper(content: string, appName: string = APP_NAME): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${BRAND_COLOR}; margin: 0;">${appName}</h1>
      </div>
      ${content}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Existing templates (signatures preserved for backward compatibility)
// ---------------------------------------------------------------------------

export function verificationEmailHtml(code: string, appName: string = APP_NAME): string {
  return emailWrapper(`
    <h2 style="text-align: center;">Verify Your Email</h2>
    <p style="text-align: center; color: #aaa;">Please enter the following code to verify your email address:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
    </div>
    <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
    <p style="text-align: center; color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
  `, appName);
}

export function passwordResetEmailHtml(code: string, appName: string = APP_NAME): string {
  return emailWrapper(`
    <h2 style="text-align: center;">Reset Your Password</h2>
    <p style="text-align: center; color: #aaa;">Use the following code to reset your password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
    </div>
    <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
    <p style="text-align: center; color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
  `, appName);
}

export function securityAlertHtml(action: string, appName: string = APP_NAME): string {
  return emailWrapper(`
    <h2 style="text-align: center;">Security Alert</h2>
    <p style="text-align: center; color: #aaa;">${action}</p>
    <p style="text-align: center; color: #888; font-size: 14px;">If this wasn't you, please change your password immediately.</p>
  `, appName);
}

// ---------------------------------------------------------------------------
// NEW email templates
// ---------------------------------------------------------------------------

/**
 * New device login alert email.
 * @param deviceName - Name of the device used to log in
 * @param browser   - Browser name & version
 * @param os        - Operating system
 * @param ip        - IP address of the login
 * @param timestamp - ISO timestamp of the login event
 */
export function newLoginAlertHtml(
  deviceName: string,
  browser: string,
  os: string,
  ip: string,
  timestamp: string,
): string {
  const formattedTime = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return emailWrapper(`
    <h2 style="text-align: center;">New Login Detected</h2>
    <p style="text-align: center; color: #aaa;">A new device just signed in to your ${APP_NAME} account.</p>
    <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 20px; margin: 24px 0; max-width: 380px; margin-left: auto; margin-right: auto;">
      <table style="width: 100%; color: #ddd; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #888; width: 120px;">Device</td>
          <td style="padding: 6px 0;">${deviceName || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Browser</td>
          <td style="padding: 6px 0;">${browser || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">OS</td>
          <td style="padding: 6px 0;">${os || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">IP Address</td>
          <td style="padding: 6px 0;">${ip || 'Unknown'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #888;">Time</td>
          <td style="padding: 6px 0;">${formattedTime}</td>
        </tr>
      </table>
    </div>
    <p style="text-align: center; color: #888; font-size: 14px;">If this was you, no further action is needed.</p>
    <p style="text-align: center; color: #666; font-size: 12px;">If you don't recognize this activity, please change your password immediately and review your active sessions.</p>
  `);
}

/**
 * Email change verification email.
 * @param code     - 6-digit verification code
 * @param newEmail - The new email address being set
 * @param type     - "old" (notify old address) or "new" (verify new address)
 */
export function emailChangeVerificationHtml(
  code: string,
  newEmail: string,
  type: 'old' | 'new',
): string {
  if (type === 'old') {
    return emailWrapper(`
      <h2 style="text-align: center;">Email Change Notification</h2>
      <p style="text-align: center; color: #aaa;">The email address associated with your ${APP_NAME} account is being changed to:</p>
      <p style="text-align: center; font-size: 18px; color: ${BRAND_COLOR}; margin: 20px 0;">${newEmail}</p>
      <p style="text-align: center; color: #888; font-size: 14px;">If you made this change, use the code below to confirm:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
      </div>
      <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="text-align: center; color: #666; font-size: 12px;">If you did not request this change, please secure your account immediately by changing your password.</p>
    `);
  }

  return emailWrapper(`
    <h2 style="text-align: center;">Verify New Email Address</h2>
    <p style="text-align: center; color: #aaa;">You are updating your ${APP_NAME} account email to this address. Please verify by entering the code below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
    </div>
    <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
    <p style="text-align: center; color: #666; font-size: 12px;">If you did not request this change, please ignore this email.</p>
  `);
}

/**
 * Two-factor authentication OTP code email.
 * @param code - 6-digit OTP code
 */
export function twoFactorCodeHtml(code: string): string {
  return emailWrapper(`
    <h2 style="text-align: center;">Your Verification Code</h2>
    <p style="text-align: center; color: #aaa;">Use the following code to complete sign-in:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
    </div>
    <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
    <p style="text-align: center; color: #666; font-size: 12px;">If you didn't try to sign in, please secure your account immediately.</p>
  `);
}
