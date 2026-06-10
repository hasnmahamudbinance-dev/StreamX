import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail, emailChangeVerificationHtml, generateVerificationCode } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { newEmail, password } = await req.json();

    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'New email and current password are required' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    // Check new email isn't the same as current
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'New email must be different from current email' },
        { status: 400 },
      );
    }

    // Check new email isn't already used
    const existingUser = await db.user.findUnique({
      where: { email: newEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 409 },
      );
    }

    // Delete any previous email change codes for this user
    await db.emailChangeCode.deleteMany({ where: { userId } });

    // Generate 2 codes: one for old email, one for new email
    const oldEmailCode = generateVerificationCode();
    const newEmailCode = generateVerificationCode();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store codes
    await db.emailChangeCode.createMany({
      data: [
        {
          userId,
          newEmail,
          code: oldEmailCode,
          expiresAt,
        },
        {
          userId,
          newEmail,
          code: newEmailCode,
          expiresAt,
        },
      ],
    });

    // Send verification to old email
    await sendEmail({
      to: user.email,
      subject: 'StreamX - Email Change Verification',
      type: 'email_change',
      html: emailChangeVerificationHtml(oldEmailCode, newEmail, 'old'),
    });

    // Send verification to new email
    await sendEmail({
      to: newEmail,
      subject: 'StreamX - Verify New Email Address',
      type: 'email_change',
      html: emailChangeVerificationHtml(newEmailCode, newEmail, 'new'),
    });

    return NextResponse.json({
      success: true,
      message: 'Verification codes sent to both email addresses',
    });
  } catch (error) {
    console.error('Change email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
