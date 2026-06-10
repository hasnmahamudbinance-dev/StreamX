import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH - Update a content report status (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check if user is admin
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const report = await db.contentReport.findUnique({ where: { id } });
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, adminNote } = body;

    const validStatuses = ['reviewed', 'resolved', 'dismissed'];
    if (!status || !validStatuses.includes(status)) {
      return Response.json(
        { error: 'status must be one of: reviewed, resolved, dismissed' },
        { status: 400 }
      );
    }

    const updatedReport = await db.contentReport.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote || undefined,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return Response.json({ report: updatedReport });
  } catch (error) {
    console.error('Error updating content report:', error);
    return Response.json(
      { error: 'Failed to update content report' },
      { status: 500 }
    );
  }
}
