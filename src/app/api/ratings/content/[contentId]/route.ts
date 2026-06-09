import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Get all ratings for a specific content item (public endpoint)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;

    const ratings = await db.rating.findMany({
      where: { contentId },
      orderBy: { updatedAt: "desc" },
    });

    let totalScore = 0;
    for (const r of ratings) {
      totalScore += r.score;
    }

    const average = ratings.length > 0
      ? Math.round((totalScore / ratings.length) * 10) / 10
      : 0;

    return NextResponse.json({
      ratings,
      average,
      count: ratings.length,
    });
  } catch (error) {
    console.error("Ratings content GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
