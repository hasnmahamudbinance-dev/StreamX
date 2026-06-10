import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where = userId ? { userId } : {};

    const devices = await db.userDevice.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { lastActive: 'desc' },
    });

    return NextResponse.json({
      devices: devices.map((d) => ({
        id: d.id,
        userId: d.userId,
        userName: d.user.name,
        userEmail: d.user.email,
        deviceFingerprint: d.deviceFingerprint,
        userAgent: d.userAgent,
        browser: d.browser,
        os: d.os,
        device: d.device,
        ipAddress: d.ipAddress,
        lastActive: d.lastActive,
        createdAt: d.createdAt,
      })),
      total: devices.length,
    });
  } catch (error) {
    console.error('Admin devices list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId is required' },
        { status: 400 }
      );
    }

    const device = await db.userDevice.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    await db.userDevice.delete({
      where: { id: deviceId },
    });

    // Create audit log for device revocation
    await db.auditLog.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        action: 'device_revoked',
        details: `Revoked device ${device.deviceFingerprint || device.id} for user ${device.userId}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Device session revoked successfully',
    });
  } catch (error) {
    console.error('Admin device revoke error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
