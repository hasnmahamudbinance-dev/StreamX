import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const content = await db.uploadedContent.findUnique({
      where: { id },
      include: {
        episodes: { orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }] },
        subtitles: true,
      },
    });

    if (!content) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ item: content });
  } catch (error) {
    console.error("Content detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const content = await db.uploadedContent.update({
      where: { id },
      data: body,
    });

    await db.auditLog.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        action: "UPDATE_CONTENT",
        details: `Updated content: ${content.title}`,
      },
    });

    return NextResponse.json({ item: content });
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const content = await db.uploadedContent.findUnique({ where: { id } });

    if (!content) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Try to clean up files
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (content.hlsMasterUrl) {
        const hlsDir = path.join(uploadsDir, "hls", id);
        if (fs.existsSync(hlsDir)) fs.rmSync(hlsDir, { recursive: true });
      }
      if (content.posterUrl?.startsWith("/uploads/")) {
        const posterPath = path.join(uploadsDir, content.posterUrl.replace("/uploads/", ""));
        if (fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
      }
      if (content.backdropUrl?.startsWith("/uploads/")) {
        const backdropPath = path.join(uploadsDir, content.backdropUrl.replace("/uploads/", ""));
        if (fs.existsSync(backdropPath)) fs.unlinkSync(backdropPath);
      }
    } catch {
      // File cleanup failures are non-critical
    }

    await db.uploadedContent.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        action: "DELETE_CONTENT",
        details: `Deleted content: ${content.title}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
