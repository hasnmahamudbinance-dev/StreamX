import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_VIDEO_FORMATS = ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm"];
const ALLOWED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getMimeType(buffer: Buffer): string {
  // Simple magic number detection
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) return "video/x-matroska";
  if (buffer.length > 7 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return "video/mp4";
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00) return "video/mp4";
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  return "application/octet-stream";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "video", "poster", "backdrop", "subtitle", "thumbnail"
    const contentId = formData.get("contentId") as string;
    const episodeId = formData.get("episodeId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    ensureDir(uploadsDir);
    ensureDir(path.join(uploadsDir, "videos"));
    ensureDir(path.join(uploadsDir, "images"));
    ensureDir(path.join(uploadsDir, "subtitles"));
    ensureDir(path.join(uploadsDir, "hls"));

    // Read file
    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedMime = getMimeType(buffer);

    // Validate based on type
    if (type === "video") {
      if (!ALLOWED_VIDEO_FORMATS.includes(file.type) && !detectedMime.startsWith("video/")) {
        return NextResponse.json({ error: "Invalid video format. Supported: MP4, MOV, MKV, WEBM" }, { status: 400 });
      }
    } else if (type === "poster" || type === "backdrop" || type === "thumbnail") {
      if (!ALLOWED_IMAGE_FORMATS.includes(file.type) && !detectedMime.startsWith("image/")) {
        return NextResponse.json({ error: "Invalid image format. Supported: JPEG, PNG, WebP" }, { status: 400 });
      }
    } else if (type === "subtitle") {
      // Allow subtitle files
    }

    // Generate filename
    const ext = path.extname(file.name) || (type === "video" ? ".mp4" : type === "subtitle" ? ".vtt" : ".jpg");
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    let relativePath: string;
    let url: string;

    if (type === "video") {
      relativePath = `videos/${safeName}`;
      const filePath = path.join(uploadsDir, relativePath);
      fs.writeFileSync(filePath, buffer);

      url = `/uploads/${relativePath}`;

      // Update content record
      if (contentId) {
        const videoFormat = ext.replace(".", "");
        await db.uploadedContent.update({
          where: { id: contentId },
          data: {
            hlsMasterUrl: url,
            videoFileSize: file.size,
            videoFormat,
            status: "processing",
          },
        });

        // Simulate HLS processing - create a simple master.m3u8
        const hlsDir = path.join(uploadsDir, "hls", contentId);
        ensureDir(hlsDir);
        const masterContent = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
../${relativePath}
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
../${relativePath}
#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480
../${relativePath}
`;
        fs.writeFileSync(path.join(hlsDir, "master.m3u8"), masterContent);

        // Update with HLS URL and mark as published
        await db.uploadedContent.update({
          where: { id: contentId },
          data: {
            hlsMasterUrl: `/uploads/hls/${contentId}/master.m3u8`,
            status: "published",
          },
        });

        await db.auditLog.create({
          data: {
            userId: (session.user as Record<string, unknown>).id as string,
            action: "UPLOAD_VIDEO",
            details: `Uploaded video for content: ${contentId}`,
          },
        });
      }

      // Also handle episode video upload
      if (episodeId) {
        await db.episode.update({
          where: { id: episodeId },
          data: {
            hlsMasterUrl: url,
            videoFileSize: file.size,
            videoFormat: ext.replace(".", ""),
            status: "published",
          },
        });
      }

    } else if (type === "poster" || type === "backdrop" || type === "thumbnail") {
      relativePath = `images/${safeName}`;
      const filePath = path.join(uploadsDir, relativePath);
      fs.writeFileSync(filePath, buffer);
      url = `/uploads/${relativePath}`;

      if (contentId && type !== "thumbnail") {
        await db.uploadedContent.update({
          where: { id: contentId },
          data: { [type === "poster" ? "posterUrl" : "backdropUrl"]: url },
        });
      } else if (episodeId && type === "thumbnail") {
        await db.episode.update({
          where: { id: episodeId },
          data: { thumbnailUrl: url },
        });
      }

    } else if (type === "subtitle") {
      relativePath = `subtitles/${safeName}`;
      const filePath = path.join(uploadsDir, relativePath);
      fs.writeFileSync(filePath, buffer);
      url = `/uploads/${relativePath}`;

      const language = formData.get("language") as string || "en";
      const label = formData.get("label") as string || "English";

      if (contentId) {
        await db.subtitle.create({
          data: {
            contentId,
            episodeId: episodeId || null,
            language,
            label,
            url,
            format: ext.replace(".", "") || "vtt",
          },
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }

    return NextResponse.json({
      url: url || `/uploads/${relativePath}`,
      size: file.size,
      type,
      name: file.name,
    }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
