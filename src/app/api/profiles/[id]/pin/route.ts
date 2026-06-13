import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 },
      );
    }

    // Validate PIN is a 4-digit string
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be a 4-digit number' },
        { status: 400 },
      );
    }

    // Verify profile belongs to user
    const profile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Hash the PIN with bcrypt
    const hashedPin = await bcrypt.hash(pin, 10);

    // Determine action for activity log
    const action = profile.pin ? 'pin_changed' : 'pin_set';

    // Store in profile
    await db.profile.update({
      where: { id },
      data: { pin: hashedPin },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action,
        details: JSON.stringify({ profileId: id, profileName: profile.profileName }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set profile PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json(
        { error: 'Current PIN is required' },
        { status: 400 },
      );
    }

    // Verify profile belongs to user
    const profile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.pin) {
      return NextResponse.json(
        { error: 'No PIN is set for this profile' },
        { status: 400 },
      );
    }

    // Verify current PIN
    const isPinValid = await bcrypt.compare(pin, profile.pin);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'Current PIN is incorrect' },
        { status: 400 },
      );
    }

    // Remove PIN
    await db.profile.update({
      where: { id },
      data: { pin: null },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: 'pin_removed',
        details: JSON.stringify({ profileId: id, profileName: profile.profileName }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove profile PIN error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
