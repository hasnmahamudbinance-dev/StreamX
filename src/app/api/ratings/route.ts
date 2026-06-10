import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    const contentType = searchParams.get("contentType");

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: "contentId and contentType are required" },
        { status: 400 }
      );
    }

    // Get all ratings for this content
    const ratings = await db.rating.findMany({
      where: { contentId, contentType },
    });

    // Calculate distribution [1-star count, 2-star count, 3-star count, 4-star count, 5-star count]
    const distribution = [0, 0, 0, 0, 0];
    let totalScore = 0;
    for (const r of ratings) {
      distribution[r.score - 1]++;
      totalScore += r.score;
    }

    const average = ratings.length > 0 ? totalScore / ratings.length : 0;

    // Check user's rating if authenticated
    let userRating: number | null = null;
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const userId = (session.user as Record<string, unknown>).id as string;
      const existingRating = await db.rating.findUnique({
        where: {
          userId_contentId_contentType: {
            userId,
            contentId,
            contentType,
          },
        },
      });
      if (existingRating) {
        userRating = existingRating.score;
      }
    }

    return NextResponse.json({
      ratings: {
        average: Math.round(average * 10) / 10,
        count: ratings.length,
        distribution,
        userRating,
      },
    });
  } catch (error) {
    console.error("Ratings GET error:", error);
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
    const { contentId, contentType, score } = body;

    if (!contentId || !contentType || !score) {
      return NextResponse.json(
        { error: "contentId, contentType, and score are required" },
        { status: 400 }
      );
    }

    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return NextResponse.json(
        { error: "Score must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Upsert rating (one per user per content)
    const rating = await db.rating.upsert({
      where: {
        userId_contentId_contentType: {
          userId,
          contentId: String(contentId),
          contentType,
        },
      },
      update: { score },
      create: {
        userId,
        contentId: String(contentId),
        contentType,
        score,
      },
    });

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error("Ratings POST error:", error);
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
    const { contentId, contentType } = body;

    if (!contentId || !contentType) {
      return NextResponse.json(
        { error: "contentId and contentType are required" },
        { status: 400 }
      );
    }

    await db.rating.deleteMany({
      where: {
        userId,
        contentId: String(contentId),
        contentType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ratings DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
