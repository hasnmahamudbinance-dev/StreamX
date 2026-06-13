import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST - Submit a content report
export async function POST(request: Request) {
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

    const body = await request.json();
    const { contentId, contentType, reason, description } = body;

    if (!contentId || !contentType || !reason) {
      return Response.json(
        { error: 'contentId, contentType, and reason are required' },
        { status: 400 }
      );
    }

    const validContentTypes = ['movie', 'tv'];
    if (!validContentTypes.includes(contentType)) {
      return Response.json(
        { error: 'contentType must be "movie" or "tv"' },
        { status: 400 }
      );
    }

    const validReasons = ['copyright', 'inappropriate', 'broken', 'other'];
    if (!validReasons.includes(reason)) {
      return Response.json(
        { error: 'reason must be one of: copyright, inappropriate, broken, other' },
        { status: 400 }
      );
    }

    const report = await db.contentReport.create({
      data: {
        userId,
        contentId,
        contentType,
        reason,
        description: description || null,
      },
    });

    return Response.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Error creating content report:', error);
    return Response.json(
      { error: 'Failed to create content report' },
      { status: 500 }
    );
  }
}

// GET - List reports (admin only)
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const status = searchParams.get('status') || undefined;
    const reason = searchParams.get('reason') || undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (status) where.status = status;
    if (reason) where.reason = reason;

    const [reports, total] = await Promise.all([
      db.contentReport.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.contentReport.count({ where }),
    ]);

    return Response.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching content reports:', error);
    return Response.json(
      { error: 'Failed to fetch content reports' },
      { status: 500 }
    );
  }
}
