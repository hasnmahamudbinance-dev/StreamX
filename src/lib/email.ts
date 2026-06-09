// Email utility - logs emails for demo, stores in EmailLog table
import { db } from './db';

interface EmailParams {
  to: string;
  subject: string;
  type: 'verification' | 'password_reset' | 'welcome' | 'security_alert' | 'email_change' | 'notification';
  html: string;
}

export async function sendEmail({ to, subject, type, html }: EmailParams): Promise<boolean> {
  try {
    // In production, this would use Resend/SendGrid/SES
    // For demo, we log and store in EmailLog
    console.log(`📧 Email sent to: ${to}, Subject: ${subject}, Type: ${type}`);
    
    await db.emailLog.create({
      data: { to, subject, type, status: 'sent' }
    });
    
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    await db.emailLog.create({
      data: { to, subject, type, status: 'failed', error: String(error) }
    }).catch(() => {});
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function verificationEmailHtml(code: string, appName: string = 'StreamX'): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #E50914; margin: 0;">${appName}</h1>
      </div>
      <h2 style="text-align: center;">Verify Your Email</h2>
      <p style="text-align: center; color: #aaa;">Please enter the following code to verify your email address:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E50914; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
      </div>
      <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="text-align: center; color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
    </div>
  `;
}

export function passwordResetEmailHtml(code: string, appName: string = 'StreamX'): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #E50914; margin: 0;">${appName}</h1>
      </div>
      <h2 style="text-align: center;">Reset Your Password</h2>
      <p style="text-align: center; color: #aaa;">Use the following code to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #E50914; background: rgba(229,9,20,0.1); padding: 15px 30px; border-radius: 8px;">${code}</span>
      </div>
      <p style="text-align: center; color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
      <p style="text-align: center; color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
    </div>
  `;
}

export function securityAlertHtml(action: string, appName: string = 'StreamX'): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #E50914; margin: 0;">${appName}</h1>
      </div>
      <h2 style="text-align: center;">Security Alert</h2>
      <p style="text-align: center; color: #aaa;">${action}</p>
      <p style="text-align: center; color: #888; font-size: 14px;">If this wasn't you, please change your password immediately.</p>
    </div>
  `;
}
