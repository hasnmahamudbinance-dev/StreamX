import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const content = await db.uploadedContent.findUnique({
      where: { id },
      include: {
        episodes: { orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }] },
        subtitles: true,
      },
    });

    if (!content || (content.status !== "published" && content.status !== "processing")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Increment view count
    await db.uploadedContent.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({ item: content });
  } catch (error) {
    console.error("Content detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
