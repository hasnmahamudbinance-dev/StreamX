import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Current password is required' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 },
      );
    }

    // Disable 2FA
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
      },
    });

    // Delete all recovery codes
    await db.recoveryCode.deleteMany({ where: { userId } });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: '2fa_disabled',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
