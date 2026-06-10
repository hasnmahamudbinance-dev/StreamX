import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Get ticket details with messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';

    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Non-admin users can only view their own tickets
    if (!isAdmin && ticket.userId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({ ticket });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return Response.json(
      { error: 'Failed to fetch support ticket' },
      { status: 500 }
    );
  }
}

// PATCH - Update ticket status
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
    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';

    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Non-admin users can only update their own tickets and only to close
    if (!isAdmin && ticket.userId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = isAdmin
      ? ['open', 'in_progress', 'resolved', 'closed']
      : ['closed'];

    if (!status || !validStatuses.includes(status)) {
      if (isAdmin) {
        return Response.json(
          { error: 'status must be one of: open, in_progress, resolved, closed' },
          { status: 400 }
        );
      } else {
        return Response.json(
          { error: 'You can only close your ticket' },
          { status: 400 }
        );
      }
    }

    const updatedTicket = await db.supportTicket.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return Response.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return Response.json(
      { error: 'Failed to update support ticket' },
      { status: 500 }
    );
  }
}
