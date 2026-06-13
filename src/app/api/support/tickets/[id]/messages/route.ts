import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Add message to a support ticket
export async function POST(
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
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const isAdmin = user.role === 'admin';

    const { id } = await params;

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return Response.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Must be ticket owner or admin to add messages
    if (!isAdmin && ticket.userId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || message.trim().length === 0) {
      return Response.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const supportMessage = await db.supportMessage.create({
      data: {
        ticketId: id,
        userId,
        message: message.trim(),
        isAdmin: isAdmin || false,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // If admin replies, update ticket status to in_progress
    if (isAdmin && ticket.status === 'open') {
      await db.supportTicket.update({
        where: { id },
        data: { status: 'in_progress' },
      });
    }

    return Response.json({ message: supportMessage }, { status: 201 });
  } catch (error) {
    console.error('Error adding support message:', error);
    return Response.json(
      { error: 'Failed to add support message' },
      { status: 500 }
    );
  }
}
