import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, userId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        title,
        message,
        type: type || "info",
        userId: userId || null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "SEND_NOTIFICATION",
        details: `Sent notification: ${title}`,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("Admin notification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
