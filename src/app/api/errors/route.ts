import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VALID_TYPES = ["api", "upload", "playback", "system"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, stack, endpoint, metadata } = body;

    if (!type || !message) {
      return NextResponse.json({ error: "Type and message are required" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }

    await db.errorLog.create({
      data: {
        type,
        message,
        stack,
        endpoint,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
