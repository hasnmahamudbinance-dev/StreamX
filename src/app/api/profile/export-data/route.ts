import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Fetch all user data in parallel
    const [
      user,
      watchlistItems,
      watchHistory,
      progressItems,
      ratings,
      reviews,
      notifications,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          language: true,
          autoplay: true,
          emailNotify: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.watchlistItem.findMany({ where: { userId } }),
      db.watchHistory.findMany({ where: { userId } }),
      db.playbackProgress.findMany({ where: { userId } }),
      db.rating.findMany({ where: { userId } }),
      db.review.findMany({ where: { userId } }),
      db.notification.findMany({ where: { userId } }),
    ]);

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      platform: 'StreamX',
      user,
      watchlist: watchlistItems,
      watchHistory,
      playbackProgress: progressItems,
      ratings,
      reviews,
      notifications,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `streamx-data-export-${userId}-${dateStr}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return Response.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}
