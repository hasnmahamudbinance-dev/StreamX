import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");
const IMAGES_DIR = path.join(UPLOADS_DIR, "images");
const HLS_DIR = path.join(UPLOADS_DIR, "hls");
const SUBTITLES_DIR = path.join(UPLOADS_DIR, "subtitles");
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, "thumbnails");

// Ensure directories exist
[UPLOADS_DIR, VIDEOS_DIR, IMAGES_DIR, HLS_DIR, SUBTITLES_DIR, THUMBNAILS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SUBTITLE_SIZE = 1 * 1024 * 1024; // 1MB

const VIDEO_FORMATS = ["mp4", "mov", "mkv", "webm"];
const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"];
const SUBTITLE_FORMATS = ["vtt", "srt"];

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Get video metadata using ffprobe
 */
function getVideoMetadata(filePath: string): { duration: number; width: number; height: number; format: string } {
  try {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
    const output = execSync(cmd, { timeout: 30000 }).toString();
    const data = JSON.parse(output);

    const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "video");
    const duration = parseFloat(data.format?.duration || "0");
    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;
    const format = data.format?.format_name?.split(",").pop()?.trim() || "unknown";

    return { duration: Math.floor(duration), width, height, format };
  } catch {
    return { duration: 0, width: 0, height: 0, format: "unknown" };
  }
}

/**
 * Generate HLS streams from a video file using FFmpeg
 * Creates 480p, 720p, 1080p renditions + master.m3u8
 */
function generateHLS(inputPath: string, outputDir: string): { masterUrl: string; renditions: string[] } {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const renditions = [
    { name: "480p", width: 854, height: 480, bitrate: "1000k", audioBitrate: "128k" },
    { name: "720p", width: 1280, height: 720, bitrate: "2500k", audioBitrate: "128k" },
    { name: "1080p", width: 1920, height: 1080, bitrate: "5000k", audioBitrate: "192k" },
  ];

  const segmentDir = path.join(outputDir, "segments");
  if (!fs.existsSync(segmentDir)) fs.mkdirSync(segmentDir, { recursive: true });

  const createdRenditions: string[] = [];

  for (const r of renditions) {
    const playlistFile = `${r.name}.m3u8`;
    const segmentPattern = path.join(segmentDir, `${r.name}_%03d.ts`);

    try {
      const cmd = [
        "ffmpeg -y",
        `-i "${inputPath}"`,
        `-vf "scale=${r.width}:${r.height}:force_original_aspect_ratio=decrease,pad=${r.width}:${r.height}:(ow-iw)/2:(oh-ih)/2"`,
        `-c:v libx264 -preset fast -crf 23`,
        `-b:v ${r.bitrate} -maxrate ${r.bitrate} -bufsize ${parseInt(r.bitrate) * 2}k`,
        `-c:a aac -b:a ${r.audioBitrate}`,
        `-f hls`,
        `-hls_time 6`,
        `-hls_list_size 0`,
        `-hls_segment_filename "${segmentPattern}"`,
        `"${path.join(outputDir, playlistFile)}"`,
      ].join(" ");

      execSync(cmd, { timeout: 600000, stdio: "pipe" }); // 10 min timeout
      createdRenditions.push(r.name);
    } catch (err) {
      console.error(`Failed to generate ${r.name} rendition:`, err);
      // If 1080p fails (e.g. source is lower res), try with source resolution
      if (r.name !== "480p") {
        try {
          const fallbackCmd = [
            "ffmpeg -y",
            `-i "${inputPath}"`,
            `-vf "scale=${r.width}:${r.height}:force_original_aspect_ratio=decrease"`,
            `-c:v libx264 -preset fast -crf 23`,
            `-b:v ${r.bitrate} -maxrate ${r.bitrate} -bufsize ${parseInt(r.bitrate) * 2}k`,
            `-c:a aac -b:a ${r.audioBitrate}`,
            `-f hls`,
            `-hls_time 6`,
            `-hls_list_size 0`,
            `-hls_segment_filename "${segmentPattern}"`,
            `"${path.join(outputDir, playlistFile)}"`,
          ].join(" ");
          execSync(fallbackCmd, { timeout: 600000, stdio: "pipe" });
          createdRenditions.push(r.name);
        } catch {
          // Skip this rendition
        }
      }
    }
  }

  // Generate master.m3u8
  const masterContent = [
    "#EXTM3U",
    ...createdRenditions.map(name => {
      const r = renditions.find(rn => rn.name === name)!;
      return [
        `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(r.bitrate) * 1000},RESOLUTION=${r.width}x${r.height}`,
        `${name}.m3u8`,
      ].join("\n");
    }),
  ].join("\n");

  const masterPath = path.join(outputDir, "master.m3u8");
  fs.writeFileSync(masterPath, masterContent);

  return {
    masterUrl: `/api/serve-upload/hls/${path.basename(outputDir)}/master.m3u8`,
    renditions: createdRenditions,
  };
}

/**
 * Generate thumbnail from video
 */
function generateThumbnail(videoPath: string, outputDir: string, contentId: string): string | null {
  const thumbnailPath = path.join(outputDir, `${contentId}_thumb.jpg`);
  try {
    const cmd = `ffmpeg -y -i "${videoPath}" -ss 00:00:05 -vframes 1 -q:v 2 "${thumbnailPath}"`;
    execSync(cmd, { timeout: 30000, stdio: "pipe" });
    return `/api/serve-upload/thumbnails/${contentId}_thumb.jpg`;
  } catch {
    // Try at 0 seconds if 5s fails
    try {
      const cmd = `ffmpeg -y -i "${videoPath}" -ss 00:00:00 -vframes 1 -q:v 2 "${thumbnailPath}"`;
      execSync(cmd, { timeout: 30000, stdio: "pipe" });
      return `/api/serve-upload/thumbnails/${contentId}_thumb.jpg`;
    } catch {
      return null;
    }
  }
}

/**
 * Convert SRT to VTT format
 */
function srtToVtt(srtContent: string): string {
  let vtt = "WEBVTT\n\n";
  const blocks = srtContent.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    // Convert timestamp format: 00:00:00,000 -> 00:00:00.000
    const timeLine = lines[1].replace(/,/g, ".");
    vtt += lines.slice(2).join("\n") + "\n";
    vtt = vtt.replace(lines.slice(2).join("\n"), `${timeLine}\n${lines.slice(2).join("\n")}`);
  }

  // Simpler approach: just replace commas in timestamps
  vtt = "WEBVTT\n\n" + srtContent
    .replace(/\r\n/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  return vtt;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "video", "poster", "backdrop", "subtitle"
    const contentId = formData.get("contentId") as string;
    const episodeId = formData.get("episodeId") as string;
    const language = formData.get("language") as string;
    const label = formData.get("label") as string;

    if (!file || !type || !contentId) {
      return NextResponse.json({ error: "File, type, and contentId are required" }, { status: 400 });
    }

    const ext = getFileExtension(file.name);
    const fileSize = file.size;

    // ─── Validate file ───────────────────────────────────────
    if (type === "video") {
      if (!VIDEO_FORMATS.includes(ext)) {
        return NextResponse.json({ error: `Unsupported video format: ${ext}. Supported: ${VIDEO_FORMATS.join(", ")}` }, { status: 400 });
      }
      if (fileSize > MAX_VIDEO_SIZE) {
        return NextResponse.json({ error: `Video file too large (${formatBytes(fileSize)}). Maximum: ${formatBytes(MAX_VIDEO_SIZE)}` }, { status: 400 });
      }
    } else if (type === "poster" || type === "backdrop") {
      if (!IMAGE_FORMATS.includes(ext)) {
        return NextResponse.json({ error: `Unsupported image format: ${ext}. Supported: ${IMAGE_FORMATS.join(", ")}` }, { status: 400 });
      }
      if (fileSize > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: `Image file too large (${formatBytes(fileSize)}). Maximum: ${formatBytes(MAX_IMAGE_SIZE)}` }, { status: 400 });
      }
    } else if (type === "subtitle") {
      if (!SUBTITLE_FORMATS.includes(ext)) {
        return NextResponse.json({ error: `Unsupported subtitle format: ${ext}. Supported: ${SUBTITLE_FORMATS.join(", ")}` }, { status: 400 });
      }
      if (fileSize > MAX_SUBTITLE_SIZE) {
        return NextResponse.json({ error: `Subtitle file too large` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: `Invalid upload type: ${type}` }, { status: 400 });
    }

    // ─── Process based on type ───────────────────────────────

    if (type === "video") {
      // Set content status to processing
      await db.uploadedContent.update({
        where: { id: contentId },
        data: { status: "processing" },
      });

      // Save original video file
      const videoFileName = `${contentId}${episodeId ? `_ep${episodeId}` : ""}_${uuidv4().slice(0, 8)}.${ext}`;
      const videoFilePath = path.join(VIDEOS_DIR, videoFileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(videoFilePath, buffer);

      // Get video metadata
      const metadata = getVideoMetadata(videoFilePath);

      // Generate thumbnail
      const thumbnailUrl = generateThumbnail(videoFilePath, THUMBNAILS_DIR, contentId);

      // Generate HLS streams
      const hlsOutputDir = path.join(HLS_DIR, `${contentId}${episodeId ? `_ep${episodeId}` : ""}`);
      const hlsResult = generateHLS(videoFilePath, hlsOutputDir);

      // Remove original video after HLS generation to save space
      try {
        fs.unlinkSync(videoFilePath);
      } catch {
        // Non-critical
      }

      // Update database
      if (episodeId) {
        await db.episode.update({
          where: { id: episodeId },
          data: {
            hlsMasterUrl: hlsResult.masterUrl,
            videoFileSize: fileSize,
            videoFormat: ext,
            videoDuration: metadata.duration,
            thumbnailUrl: thumbnailUrl,
            status: "published",
          },
        });
      } else {
        await db.uploadedContent.update({
          where: { id: contentId },
          data: {
            hlsMasterUrl: hlsResult.masterUrl,
            videoFileSize: fileSize,
            videoFormat: ext,
            videoDuration: metadata.duration,
            thumbnailUrl: thumbnailUrl,
            status: "published",
            runtime: metadata.duration > 0 ? Math.ceil(metadata.duration / 60) : 0,
          },
        });
      }

      // Audit log
      await db.auditLog.create({
        data: {
          userId: (session.user as Record<string, unknown>).id as string,
          action: "UPLOAD_VIDEO",
          details: `Uploaded video for content ${contentId}${episodeId ? ` episode ${episodeId}` : ""} - ${formatBytes(fileSize)}, ${metadata.duration}s, ${hlsResult.renditions.join("/")}`,
        },
      });

      return NextResponse.json({
        success: true,
        hlsMasterUrl: hlsResult.masterUrl,
        renditions: hlsResult.renditions,
        duration: metadata.duration,
        format: ext,
        thumbnailUrl,
      });

    } else if (type === "poster" || type === "backdrop") {
      // Save image file
      const imageFileName = `${contentId}_${type}_${uuidv4().slice(0, 8)}.${ext}`;
      const imageFilePath = path.join(IMAGES_DIR, imageFileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(imageFilePath, buffer);

      const imageUrl = `/api/serve-upload/images/${imageFileName}`;

      // Update database
      await db.uploadedContent.update({
        where: { id: contentId },
        data: type === "poster" ? { posterUrl: imageUrl } : { backdropUrl: imageUrl },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: (session.user as Record<string, unknown>).id as string,
          action: `UPLOAD_${type.toUpperCase()}`,
          details: `Uploaded ${type} for content ${contentId}`,
        },
      });

      return NextResponse.json({ success: true, url: imageUrl });

    } else if (type === "subtitle") {
      // Save subtitle file
      let subtitleContent = await file.text();
      const subtitleFormat = ext === "srt" ? "vtt" : ext; // Always store as VTT

      if (ext === "srt") {
        subtitleContent = srtToVtt(subtitleContent);
      }

      const subtitleFileName = `${contentId}${episodeId ? `_ep${episodeId}` : ""}_${language || "en"}_${uuidv4().slice(0, 8)}.vtt`;
      const subtitleFilePath = path.join(SUBTITLES_DIR, subtitleFileName);
      fs.writeFileSync(subtitleFilePath, subtitleContent);

      const subtitleUrl = `/api/serve-upload/subtitles/${subtitleFileName}`;

      // Create subtitle record
      await db.subtitle.create({
        data: {
          contentId,
          episodeId: episodeId || null,
          language: language || "en",
          label: label || "English",
          url: subtitleUrl,
          format: subtitleFormat,
        },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: (session.user as Record<string, unknown>).id as string,
          action: "UPLOAD_SUBTITLE",
          details: `Uploaded ${language || "en"} subtitle for content ${contentId}`,
        },
      });

      return NextResponse.json({ success: true, url: subtitleUrl });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Upload error:", error);

    // Try to set content back to draft if it was set to processing
    try {
      const formData = await req.formData().catch(() => null);
      const contentId = formData?.get("contentId") as string;
      if (contentId) {
        await db.uploadedContent.update({
          where: { id: contentId },
          data: { status: "draft" },
        }).catch(() => {});
      }
    } catch {
      // Ignore
    }

    return NextResponse.json({
      error: "Upload failed",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
