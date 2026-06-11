import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPushNotification } from '@/lib/firebase-admin';
import { db } from '@/lib/db';

// POST - Send push notification (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'userId, title, and body are required' }, { status: 400 });
    }

    // Get user's FCM tokens
    const devices = await db.userDevice.findMany({
      where: { userId, deviceFingerprint: { not: null } },
      select: { deviceFingerprint: true },
    });

    const tokens = devices.map(d => d.deviceFingerprint).filter(Boolean) as string[];

    if (tokens.length === 0) {
      return NextResponse.json({ message: 'No registered devices found' });
    }

    const results = await Promise.allSettled(
      tokens.map(token => sendPushNotification(token, title, body, data))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return NextResponse.json({ sent, total: tokens.length });
  } catch (error) {
    console.error('Push notification send error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
