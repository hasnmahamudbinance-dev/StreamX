import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { readdir, stat } from "fs/promises";
import { join } from "path";

async function getDirectorySize(dirPath: string): Promise<{ size: number; fileCount: number }> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    let totalSize = 0;
    let count = 0;
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        const stats = await stat(fullPath);
        totalSize += stats.size;
        count++;
      } else if (entry.isDirectory()) {
        const sub = await getDirectorySize(fullPath);
        totalSize += sub.size;
        count += sub.fileCount;
      }
    }
    return { size: totalSize, fileCount: count };
  } catch {
    return { size: 0, fileCount: 0 };
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get video storage from database
    const videoStorageResult = await db.uploadedContent.aggregate({
      _sum: { videoFileSize: true },
    });
    const videoStorage = videoStorageResult._sum.videoFileSize ?? 0;

    // Get file sizes from uploads directory
    const uploadsBase = join(process.cwd(), "public", "uploads");
    const videosDir = join(uploadsBase, "videos");
    const imagesDir = join(uploadsBase, "images");
    const avatarsDir = join(uploadsBase, "avatars");
    const hlsDir = join(uploadsBase, "hls");

    const [videos, images, avatars, hls] = await Promise.all([
      getDirectorySize(videosDir),
      getDirectorySize(imagesDir),
      getDirectorySize(avatarsDir),
      getDirectorySize(hlsDir),
    ]);

    const other = await getDirectorySize(uploadsBase);

    const imageStorage = images.size + avatars.size;
    const totalStorage = videos.size + images.size + avatars.size + hls.size;
    const fileCount = videos.fileCount + images.fileCount + avatars.fileCount + hls.fileCount;

    return NextResponse.json({
      totalStorage,
      videoStorage,
      imageStorage,
      fileCount,
      breakdown: {
        videos: { size: videos.size, fileCount: videos.fileCount },
        images: { size: images.size, fileCount: images.fileCount },
        avatars: { size: avatars.size, fileCount: avatars.fileCount },
        other: { size: hls.size, fileCount: hls.fileCount },
      },
    });
  } catch (error) {
    console.error("Storage stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
