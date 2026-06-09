import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(
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
    const body = await req.json();

    const {
      maxRating,
      allowedGenres,
      restrictedGenres,
      searchRestricted,
      playbackRestricted,
      profileLocked,
    } = body;

    // Verify profile belongs to user
    const profile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Build update data - only include fields that are provided
    const updateData: any = {};

    if (maxRating !== undefined) {
      updateData.maxRating = maxRating;
    }
    if (allowedGenres !== undefined) {
      // Convert array to comma-separated string
      updateData.allowedGenres = Array.isArray(allowedGenres)
        ? allowedGenres.join(',')
        : allowedGenres;
    }
    if (restrictedGenres !== undefined) {
      updateData.restrictedGenres = Array.isArray(restrictedGenres)
        ? restrictedGenres.join(',')
        : restrictedGenres;
    }
    if (searchRestricted !== undefined) {
      updateData.searchRestricted = searchRestricted;
    }
    if (playbackRestricted !== undefined) {
      updateData.playbackRestricted = playbackRestricted;
    }
    if (profileLocked !== undefined) {
      updateData.profileLocked = profileLocked;
    }

    const updated = await db.profile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error('Update profile restrictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
