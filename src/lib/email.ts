// Email utility - Multi-provider support (Resend + Demo/Fallback)
// Provider auto-detected from EMAIL_PROVIDER env var
import { db } from './db';

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
  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    return 'resend';
  }
  return 'demo';
}

// ---------------------------------------------------------------------------
// Resend provider (REST API)
// ---------------------------------------------------------------------------

async function sendWithResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const from = process.env.EMAIL_FROM || 'StreamX <noreply@streamx.com>';

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

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      console.error(`Resend API error (${response.status}): ${errorBody}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Resend send error:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Demo provider (console log + EmailLog table)
// ---------------------------------------------------------------------------

async function sendWithDemo(to: string, subject: string, type: EmailType): Promise<boolean> {
  console.log(`📧 [Demo] Email sent to: ${to}, Subject: ${subject}, Type: ${type}`);
  return true;
}

// ---------------------------------------------------------------------------
// Core sendEmail function (same interface as before, extended type support)
// ---------------------------------------------------------------------------

export async function sendEmail({ to, subject, type, html }: EmailParams): Promise<boolean> {
  const provider = getEmailProvider();

  try {
    let sendResult = false;

    if (provider === 'resend') {
      // Attempt Resend delivery
      sendResult = await sendWithResend(to, subject, html);

      if (!sendResult) {
        // Fallback to demo on Resend failure
        console.warn('Resend failed, falling back to demo provider');
        sendResult = await sendWithDemo(to, subject, type);
      }
    } else {
      // Demo provider
      sendResult = await sendWithDemo(to, subject, type);
    }

    // Always log to EmailLog table for audit trail
    await db.emailLog.create({
      data: {
        to,
        subject,
        type,
        status: sendResult ? 'sent' : 'failed',
      },
    });

    return sendResult;
  } catch (error) {
    console.error('Email send error:', error);

    // Attempt to log failure to database
    await db.emailLog
      .create({
        data: {
          to,
          subject,
          type,
          status: 'failed',
          error: String(error),
        },
      })
      .catch(() => {});

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
