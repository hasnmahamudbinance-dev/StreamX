import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fingerprint, userAgent, browser, os, device } = body;

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    // Get IP from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Upsert device: find by userId + fingerprint, update if exists
    const existingDevice = await db.userDevice.findFirst({
      where: {
        userId,
        deviceFingerprint: fingerprint,
      },
    });

    let savedDevice;

    if (existingDevice) {
      // Update existing device
      savedDevice = await db.userDevice.update({
        where: { id: existingDevice.id },
        data: {
          userAgent: userAgent || existingDevice.userAgent,
          browser: browser || existingDevice.browser,
          os: os || existingDevice.os,
          device: device || existingDevice.device,
          ipAddress,
          lastActive: new Date(),
        },
      });
    } else {
      // Create new device
      savedDevice = await db.userDevice.create({
        data: {
          userId,
          deviceFingerprint: fingerprint,
          userAgent: userAgent || null,
          browser: browser || null,
          os: os || null,
          device: device || null,
          ipAddress,
          lastActive: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      device: {
        id: savedDevice.id,
        deviceFingerprint: savedDevice.deviceFingerprint,
        browser: savedDevice.browser,
        os: savedDevice.os,
        device: savedDevice.device,
        ipAddress: savedDevice.ipAddress,
        lastActive: savedDevice.lastActive,
      },
    });
  } catch (error) {
    console.error('Device registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
