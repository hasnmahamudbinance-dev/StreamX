import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    // Verify the session belongs to the current user
    const userSession = await db.userSession.findFirst({
      where: { id, userId },
    });

    if (!userSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 },
      );
    }

    // Delete the session
    await db.userSession.delete({
      where: { id },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: 'session_removed',
        ipAddress: userSession.ipAddress || undefined,
        userAgent: userSession.browser || undefined,
        details: JSON.stringify({
          sessionId: id,
          deviceName: userSession.deviceName,
          platform: userSession.platform,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
