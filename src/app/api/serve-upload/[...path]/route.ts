import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    const filePath = path.join(process.cwd(), "uploads", ...pathParts);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".mkv": "video/x-matroska",
      ".webm": "video/webm",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".vtt": "text/vtt",
      ".srt": "text/srt",
      ".m3u8": "application/vnd.apple.mpegurl",
      ".ts": "video/mp2t",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    };

    // Support range requests for video
    const range = req.headers.get("range");
    if (range && (contentType.startsWith("video/") || ext === ".m3u8")) {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`;
      headers["Accept-Ranges"] = "bytes";
      headers["Content-Length"] = chunkSize.toString();

      const chunk = buffer.subarray(start, end + 1);
      return new NextResponse(chunk, { status: 206, headers });
    }

    headers["Content-Length"] = buffer.length.toString();
    if (ext === ".m3u8") {
      headers["Access-Control-Allow-Origin"] = "*";
    }

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
