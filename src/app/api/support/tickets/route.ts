import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Create a support ticket
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { subject, description, category, priority } = body;

    if (!subject || !description) {
      return Response.json(
        { error: 'subject and description are required' },
        { status: 400 }
      );
    }

    const validCategories = ['technical', 'billing', 'content', 'account', 'other'];
    const validPriorities = ['low', 'medium', 'high'];

    if (category && !validCategories.includes(category)) {
      return Response.json(
        { error: 'category must be one of: technical, billing, content, account, other' },
        { status: 400 }
      );
    }

    if (priority && !validPriorities.includes(priority)) {
      return Response.json(
        { error: 'priority must be one of: low, medium, high' },
        { status: 400 }
      );
    }

    const ticket = await db.supportTicket.create({
      data: {
        userId,
        subject,
        description,
        category: category || 'other',
        priority: priority || 'medium',
      },
    });

    // Create the initial message from the user
    await db.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId,
        message: description,
        isAdmin: false,
      },
    });

    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return Response.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

// GET - List support tickets (admin sees all, user sees own)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    // Non-admin users only see their own tickets
    if (!isAdmin) {
      where.userId = userId;
    }
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          messages: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.supportTicket.count({ where }),
    ]);

    // Add message count to each ticket
    const ticketsWithCount = tickets.map((ticket) => ({
      ...ticket,
      messageCount: ticket.messages.length,
      messages: undefined,
    }));

    return Response.json({
      tickets: ticketsWithCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return Response.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
