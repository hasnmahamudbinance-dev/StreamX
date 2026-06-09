import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const recoveryCodes = await db.recoveryCode.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // Mask codes: show first 4 chars + ****
    const codes = recoveryCodes.map((rc) => ({
      id: rc.id,
      code: rc.code.slice(0, 4) + '-****',
      used: rc.used,
      usedAt: rc.usedAt,
    }));

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Get recovery codes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
