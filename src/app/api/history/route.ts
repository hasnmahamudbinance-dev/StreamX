import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: List watch history for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.watchHistory.findMany({
        where: { userId },
        orderBy: { watchedAt: "desc" },
        skip,
        take: limit,
      }),
      db.watchHistory.count({ where: { userId } }),
    ]);

    return NextResponse.json({ items, total, page });
  } catch (error) {
    console.error("History GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add/update watch history entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { contentId, contentType, title, posterPath, overview, rating, releaseDate, progress, duration } = body;

    if (!contentId || !contentType || !title) {
      return NextResponse.json(
        { error: "contentId, contentType, and title are required" },
        { status: 400 }
      );
    }

    const history = await db.watchHistory.upsert({
      where: {
        userId_contentId_contentType: {
          userId,
          contentId: String(contentId),
          contentType,
        },
      },
      update: {
        title,
        posterPath: posterPath || null,
        overview: overview || null,
        rating: rating || null,
        releaseDate: releaseDate || null,
        progress: progress !== undefined ? progress : undefined,
        duration: duration !== undefined ? duration : undefined,
        watchedAt: new Date(),
      },
      create: {
        userId,
        contentId: String(contentId),
        contentType,
        title,
        posterPath: posterPath || null,
        overview: overview || null,
        rating: rating || null,
        releaseDate: releaseDate || null,
        progress: progress || 0,
        duration: duration || 0,
      },
    });

    return NextResponse.json({ success: true, item: history });
  } catch (error) {
    console.error("History POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove history item(s)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();

    if (body.contentId && body.contentType) {
      // Delete specific item
      await db.watchHistory.deleteMany({
        where: {
          userId,
          contentId: String(body.contentId),
          contentType: body.contentType,
        },
      });
      return NextResponse.json({ success: true });
    } else {
      // Clear all history
      await db.watchHistory.deleteMany({
        where: { userId },
      });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("History DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
