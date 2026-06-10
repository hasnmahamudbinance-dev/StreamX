import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyTOTP } from '@/lib/two-factor';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Code and userId are required' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 },
      );
    }

    // Check recovery code first (codes are hashed, so compare by hashing)
    const unusedRecoveryCodes = await db.recoveryCode.findMany({
      where: {
        userId,
        used: false,
      },
    });

    let matchedRecoveryCode = null;
    for (const rc of unusedRecoveryCodes) {
      const isMatch = await bcrypt.compare(code, rc.codeHash);
      if (isMatch) {
        matchedRecoveryCode = rc;
        break;
      }
    }

    if (matchedRecoveryCode) {
      // Mark recovery code as used
      await db.recoveryCode.update({
        where: { id: matchedRecoveryCode.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, usedRecoveryCode: true });
    }

    // Verify based on method
    if (user.twoFactorMethod === 'email') {
      // Check TwoFactorCode table for matching code
      const twoFactorCode = await db.twoFactorCode.findFirst({
        where: {
          userId,
          code,
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (!twoFactorCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired code' },
          { status: 400 },
        );
      }

      // Mark code as used
      await db.twoFactorCode.update({
        where: { id: twoFactorCode.id },
        data: { used: true },
      });

      return NextResponse.json({ success: true });
    }

    if (user.twoFactorMethod === 'app') {
      if (!user.twoFactorSecret) {
        return NextResponse.json(
          { success: false, error: 'TOTP secret not configured' },
          { status: 400 },
        );
      }

      const isValid = verifyTOTP(user.twoFactorSecret, code);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid code' },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown 2FA method' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Verify 2FA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
