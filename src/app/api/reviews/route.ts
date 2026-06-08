import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    const contentType = searchParams.get("contentType");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: "contentId and contentType are required" },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: { contentId, contentType },
        include: {
          user: {
            select: { name: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.review.count({
        where: { contentId, contentType },
      }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      page,
    });
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { contentId, contentType, title, content } = body;

    if (!contentId || !contentType || !title || !content) {
      return NextResponse.json(
        { error: "contentId, contentType, title, and content are required" },
        { status: 400 }
      );
    }

    // Check if user already reviewed this content
    const existing = await db.review.findFirst({
      where: { userId, contentId: String(contentId), contentType },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this content. Edit your existing review instead." },
        { status: 409 }
      );
    }

    const review = await db.review.create({
      data: {
        userId,
        contentId: String(contentId),
        contentType,
        title: title.trim(),
        content: content.trim(),
      },
      include: {
        user: {
          select: { name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Reviews POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Review id is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.review.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "You can only edit your own reviews" }, { status: 403 });
    }

    const updateData: { title?: string; content?: string } = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();

    const review = await db.review.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Reviews PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Review id is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.review.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "You can only delete your own reviews" }, { status: 403 });
    }

    await db.review.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reviews DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
