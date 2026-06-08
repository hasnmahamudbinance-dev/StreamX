import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_EMAIL_TYPES = ["welcome", "password_reset", "verification", "notification"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { to, subject, type, content } = body;

    if (!to || !subject || !type) {
      return NextResponse.json({ error: "To, subject, and type are required" }, { status: 400 });
    }

    if (!VALID_EMAIL_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_EMAIL_TYPES.join(", ")}` }, { status: 400 });
    }

    // Simulated email sending — just log instead of actually sending
    console.log(`[Email] To: ${to}, Subject: ${subject}, Type: ${type}, Content: ${content || "(none)"}`);

    const emailLog = await db.emailLog.create({
      data: {
        to,
        subject,
        type,
        status: "sent",
      },
    });

    return NextResponse.json({ success: true, emailLog }, { status: 201 });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [emails, total] = await Promise.all([
      db.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.emailLog.count(),
    ]);

    return NextResponse.json({
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Email logs list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
