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
    const progress = await db.playbackProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ items: progress });
  } catch (error) {
    console.error("Progress GET error:", error);
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
    const body = await req.json();
    const { contentId, contentType, title, posterPath, seasonNumber, episodeNumber, position, duration } = body;

    if (!contentId || !contentType || !title || position === undefined || duration === undefined) {
      return NextResponse.json(
        { error: "contentId, contentType, title, position, and duration are required" },
        { status: 400 }
      );
    }

    const progress = await db.playbackProgress.upsert({
      where: {
        userId_contentId_contentType_seasonNumber_episodeNumber: {
          userId,
          contentId: String(contentId),
          contentType,
          seasonNumber: seasonNumber || null,
          episodeNumber: episodeNumber || null,
        },
      },
      update: {
        title,
        posterPath,
        position,
        duration,
      },
      create: {
        userId,
        contentId: String(contentId),
        contentType,
        title,
        posterPath,
        seasonNumber,
        episodeNumber,
        position,
        duration,
      },
    });

    return NextResponse.json({ item: progress });
  } catch (error) {
    console.error("Progress POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
