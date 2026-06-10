import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get user's favorites list (paginated)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.favorite.findMany({
        where: { userId },
        orderBy: { addedAt: "desc" },
        skip,
        take: limit,
      }),
      db.favorite.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Favorites GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add content to favorites
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { contentId, contentType } = body;

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: "contentId and contentType are required" },
        { status: 400 }
      );
    }

    if (!["movie", "tv"].includes(contentType)) {
      return NextResponse.json(
        { error: "contentType must be 'movie' or 'tv'" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db.favorite.findUnique({
      where: {
        userId_contentId_contentType: {
          userId,
          contentId: String(contentId),
          contentType,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already in favorites" },
        { status: 409 }
      );
    }

    const item = await db.favorite.create({
      data: {
        userId,
        contentId: String(contentId),
        contentType,
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error("Favorites POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
