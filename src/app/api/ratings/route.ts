import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Get ratings for content or by user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get("contentId");
    const contentType = searchParams.get("contentType");
    const userId = searchParams.get("userId");

    // Get ratings by user
    if (userId && !contentId) {
      const ratings = await db.rating.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ ratings });
    }

    // Get ratings for specific content
    if (contentId && contentType) {
      const ratings = await db.rating.findMany({
        where: { contentId, contentType },
      });

      // Calculate distribution [1-count, 2-count, ..., 10-count]
      const distribution = Array(10).fill(0);
      let totalScore = 0;
      for (const r of ratings) {
        if (r.score >= 1 && r.score <= 10) {
          distribution[r.score - 1]++;
        }
        totalScore += r.score;
      }

      const average = ratings.length > 0 ? totalScore / ratings.length : 0;

      // Check user's rating if authenticated
      let userRating: number | null = null;
      let userReview: string | null = null;
      let userRatingId: string | null = null;
      const session = await getServerSession(authOptions);
      if (session?.user) {
        const sessionUserId = (session.user as Record<string, unknown>).id as string;
        const existingRating = await db.rating.findUnique({
          where: {
            userId_contentId_contentType: {
              userId: sessionUserId,
              contentId,
              contentType,
            },
          },
        });
        if (existingRating) {
          userRating = existingRating.score;
          userReview = existingRating.review;
          userRatingId = existingRating.id;
        }
      }

      return NextResponse.json({
        ratings: {
          average: Math.round(average * 10) / 10,
          count: ratings.length,
          distribution,
          userRating,
          userReview,
          userRatingId,
        },
      });
    }

    return NextResponse.json(
      { error: "contentId+contentType or userId query parameter is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Ratings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create or update a rating (1-10 scale with optional review)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { contentId, contentType, score, review } = body;

    if (!contentId || !contentType || score === undefined) {
      return NextResponse.json(
        { error: "contentId, contentType, and score are required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return NextResponse.json(
        { error: "Score must be an integer between 1 and 10" },
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
      update: {
        score,
        ...(review !== undefined ? { review: review || null } : {}),
      },
      create: {
        userId,
        contentId: String(contentId),
        contentType,
        score,
        review: review || null,
      },
    });

    return NextResponse.json({ success: true, rating }, { status: 201 });
  } catch (error) {
    console.error("Ratings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a rating
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
