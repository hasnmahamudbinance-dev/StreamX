import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail, securityAlertHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { oldEmailCode, newEmailCode } = await req.json();

    if (!oldEmailCode || !newEmailCode) {
      return NextResponse.json(
        { error: 'Both verification codes are required' },
        { status: 400 },
      );
    }

    // Find the old email code
    const oldCode = await db.emailChangeCode.findFirst({
      where: {
        userId,
        code: oldEmailCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!oldCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code for current email' },
        { status: 400 },
      );
    }

    // Find the new email code
    const newCode = await db.emailChangeCode.findFirst({
      where: {
        userId,
        code: newEmailCode,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!newCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code for new email' },
        { status: 400 },
      );
    }

    // Both codes must reference the same new email
    if (oldCode.newEmail !== newCode.newEmail) {
      return NextResponse.json(
        { error: 'Verification codes do not match' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const oldEmail = user.email;

    // Check new email hasn't been taken in the meantime
    const existingUser = await db.user.findUnique({
      where: { email: oldCode.newEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 409 },
      );
    }

    // Update user email
    await db.user.update({
      where: { id: userId },
      data: {
        email: oldCode.newEmail,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Mark codes as used
    await db.emailChangeCode.update({
      where: { id: oldCode.id },
      data: { used: true },
    });
    await db.emailChangeCode.update({
      where: { id: newCode.id },
      data: { used: true },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: 'email_change',
        details: JSON.stringify({ oldEmail, newEmail: oldCode.newEmail }),
      },
    });

    // Send security alert to old email
    await sendEmail({
      to: oldEmail,
      subject: 'StreamX - Email Changed',
      type: 'security_alert',
      html: securityAlertHtml(
        `Your email address has been changed from ${oldEmail} to ${oldCode.newEmail}. If this wasn't you, please contact support immediately.`,
      ),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify email change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
