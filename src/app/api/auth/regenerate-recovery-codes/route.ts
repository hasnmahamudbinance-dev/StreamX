import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateRecoveryCodes } from '@/lib/two-factor';

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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 },
      );
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA must be enabled to manage recovery codes' },
        { status: 400 },
      );
    }

    // Delete old recovery codes
    await db.recoveryCode.deleteMany({ where: { userId } });

    // Generate new recovery codes
    const codes = generateRecoveryCodes(10);

    // Store new recovery codes (hashed)
    const hashedCodes = await Promise.all(
      codes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(code, 10),
      }))
    );
    await db.recoveryCode.createMany({
      data: hashedCodes,
    });

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Regenerate recovery codes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
