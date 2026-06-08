import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { contentId, seasonNumber, episodeNumber, title, description, runtime, status } = body;

    if (!contentId || !episodeNumber || !title) {
      return NextResponse.json({ error: "contentId, episodeNumber, and title are required" }, { status: 400 });
    }

    const episode = await db.episode.create({
      data: {
        contentId,
        seasonNumber: seasonNumber || 1,
        episodeNumber,
        title,
        description,
        runtime: runtime || 0,
        status: status || "draft",
      },
    });

    return NextResponse.json({ item: episode }, { status: 201 });
  } catch (error) {
    console.error("Episode create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
