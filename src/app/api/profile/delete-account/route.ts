import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Use a transaction to delete all user data and the user itself
    await db.$transaction(async (tx) => {
      // Create audit log entry before deletion
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_DELETION',
          details: `User account deleted. Email: ${user.email}, Name: ${user.name}`,
        },
      });

      // Delete in order: ratings, reviews, watchlist items, playback progress,
      // watch history, notifications, support messages, support tickets,
      // content reports (as submitter), then the user
      await tx.rating.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.watchlistItem.deleteMany({ where: { userId } });
      await tx.playbackProgress.deleteMany({ where: { userId } });
      await tx.watchHistory.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.supportMessage.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      await tx.contentReport.deleteMany({ where: { userId } });

      // Clear reviewedBy references (set to null) for reports this user reviewed as admin
      await tx.contentReport.updateMany({
        where: { reviewedBy: userId },
        data: { reviewedBy: null },
      });

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    return Response.json({
      message: 'Account and all associated data have been permanently deleted',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return Response.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
