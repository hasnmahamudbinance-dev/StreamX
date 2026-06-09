import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateSecret, buildOtpauthUri, generateRecoveryCodes } from '@/lib/two-factor';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { method } = await req.json();

    if (!method || !['email', 'app'].includes(method)) {
      return NextResponse.json(
        { error: 'Method must be "email" or "app"' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 },
      );
    }

    let secret: string | undefined;
    let otpauthUri: string | undefined;

    if (method === 'app') {
      // Generate TOTP secret
      secret = generateSecret();
      otpauthUri = buildOtpauthUri(secret, user.email);

      await db.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: 'app',
          twoFactorSecret: secret,
        },
      });
    } else {
      // Email-based 2FA
      await db.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorMethod: 'email',
        },
      });
    }

    // Generate recovery codes
    const recoveryCodes = generateRecoveryCodes(10);

    // Delete any existing recovery codes first
    await db.recoveryCode.deleteMany({ where: { userId } });

    // Store recovery codes
    await db.recoveryCode.createMany({
      data: recoveryCodes.map((code) => ({
        userId,
        code,
      })),
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: '2fa_enabled',
        details: JSON.stringify({ method }),
      },
    });

    return NextResponse.json({
      success: true,
      method,
      ...(secret ? { secret } : {}),
      ...(otpauthUri ? { otpauthUri } : {}),
      recoveryCodes,
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
