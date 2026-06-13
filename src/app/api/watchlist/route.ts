import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const watchlist = await db.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json({ items: watchlist });
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { contentId, contentType, title, posterPath, overview, rating, releaseDate } = body;

    if (!contentId || !contentType || !title) {
      return NextResponse.json(
        { error: "contentId, contentType, and title are required" },
        { status: 400 }
      );
    }

    const existing = await db.watchlistItem.findUnique({
      where: {
        userId_contentId_contentType: {
          userId,
          contentId: String(contentId),
          contentType,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
    }

    const item = await db.watchlistItem.create({
      data: {
        userId,
        contentId: String(contentId),
        contentType,
        title,
        posterPath,
        overview,
        rating,
        releaseDate,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    const contentType = searchParams.get("contentType");

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: "contentId and contentType are required" },
        { status: 400 }
      );
    }

    await db.watchlistItem.deleteMany({
      where: {
        userId,
        contentId,
        contentType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
