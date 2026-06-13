import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as Record<string, unknown>).id as string : null;

    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    const body = await req.json();
    const { contentId, episodeId, action, position, duration, quality, device } = body;

    if (!contentId || !action) {
      return NextResponse.json({ error: "contentId and action are required" }, { status: 400 });
    }

    await db.contentAnalytics.create({
      data: {
        contentId,
        episodeId,
        userId,
        action,
        position: position || 0,
        duration: duration || 0,
        quality,
        device,
      },
    });

    // Update content watch time
    if (action === "complete" || action === "pause") {
      await db.uploadedContent.update({
        where: { id: contentId },
        data: { watchTime: { increment: position || 0 } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
