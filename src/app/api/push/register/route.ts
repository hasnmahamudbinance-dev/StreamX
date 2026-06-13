import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Register FCM token for push notifications
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { token, device } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    // Update or create the user device with FCM token
    await db.userDevice.upsert({
      where: { id: `${userId}_${device || 'web'}` },
      update: { 
        deviceFingerprint: token,
        lastActive: new Date(),
      },
      create: {
        id: `${userId}_${device || 'web'}`,
        userId,
        deviceFingerprint: token,
        device: device || 'web',
        lastActive: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('FCM token registration error:', error);
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
  }
}
