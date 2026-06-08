import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const backups = await db.backup.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("Backup list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Export all tables as JSON
    const data = {
      users: await db.user.findMany({
        select: { id: true, email: true, name: true, role: true, language: true, autoplay: true, emailNotify: true, createdAt: true },
      }),
      watchlistItems: await db.watchlistItem.findMany(),
      playbackProgress: await db.playbackProgress.findMany(),
      watchHistory: await db.watchHistory.findMany(),
      ratings: await db.rating.findMany(),
      reviews: await db.review.findMany(),
      collections: await db.collection.findMany(),
      collectionItems: await db.collectionItem.findMany(),
      notifications: await db.notification.findMany(),
      auditLogs: await db.auditLog.findMany(),
      platformSettings: await db.platformSettings.findMany(),
      uploadedContent: await db.uploadedContent.findMany(),
      episodes: await db.episode.findMany(),
      subtitles: await db.subtitle.findMany(),
      contentAnalytics: await db.contentAnalytics.findMany(),
      contentSchedules: await db.contentSchedule.findMany(),
      homepageSections: await db.homepageSection.findMany(),
      homepageSectionItems: await db.homepageSectionItem.findMany(),
      errorLogs: await db.errorLog.findMany(),
      backups: await db.backup.findMany(),
      emailLogs: await db.emailLog.findMany(),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-${timestamp}.json`;
    const backupDir = join(process.cwd(), "backups");

    // Ensure backup directory exists
    await mkdir(backupDir, { recursive: true });

    const filePath = join(backupDir, filename);
    const jsonContent = JSON.stringify(data, null, 2);
    await writeFile(filePath, jsonContent, "utf-8");

    const fileSize = Buffer.byteLength(jsonContent, "utf-8");

    const backup = await db.backup.create({
      data: {
        filename,
        size: fileSize,
        type: "full",
        status: "completed",
      },
    });

    return NextResponse.json({ backup }, { status: 201 });
  } catch (error) {
    console.error("Backup create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Backup id is required" }, { status: 400 });
    }

    const backup = await db.backup.findUnique({ where: { id } });
    if (!backup) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    // Delete the file
    const filePath = join(process.cwd(), "backups", backup.filename);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted, continue
    }

    // Delete the record
    await db.backup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Backup delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
