import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;

    // Sanitize each path segment — reject any that contains directory traversal
    const safeParts = pathParts.filter((part) => {
      // Block empty segments, dots, and double-dots
      if (!part || part === '.' || part === '..') return false;
      // Block any segment containing a path separator or URL-encoded traversal
      if (part.includes('/') || part.includes('\\') || part.includes('%2f') || part.includes('%2F') || part.includes('%5c') || part.includes('%5C')) return false;
      return true;
    });

    if (safeParts.length !== pathParts.length) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const filePath = path.resolve(UPLOADS_DIR, ...safeParts);

    // Verify the resolved path is still inside the uploads directory
    if (!filePath.startsWith(UPLOADS_DIR + path.sep) && filePath !== UPLOADS_DIR) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Don't serve directories
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
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
