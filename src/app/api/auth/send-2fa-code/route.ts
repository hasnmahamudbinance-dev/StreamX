import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail, twoFactorCodeHtml, generateVerificationCode } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    // Require authenticated session — no unauthenticated userId branch
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate 6-digit code
    const code = generateVerificationCode();

    // Store in TwoFactorCode with 10-min expiry
    await db.twoFactorCode.create({
      data: {
        userId,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Send email
    await sendEmail({
      to: user.email,
      subject: 'StreamX - Your Verification Code',
      type: 'two_factor_code',
      html: twoFactorCodeHtml(code),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send 2FA code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
