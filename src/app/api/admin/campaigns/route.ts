import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const [campaigns, total] = await Promise.all([
      db.emailCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.emailCampaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin get campaigns error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      subject,
      body: campaignBody,
      type,
      targetAudience,
      status,
      scheduledAt,
    } = body;

    if (!name || !subject || !campaignBody) {
      return NextResponse.json(
        { success: false, error: "Name, subject, and body are required" },
        { status: 400 }
      );
    }

    const validTypes = ["weekly_recommendations", "watchlist_reminder", "new_releases", "continue_watching", "custom"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid campaign type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const validAudiences = ["all", "free", "premium", "inactive"];
    if (targetAudience && !validAudiences.includes(targetAudience)) {
      return NextResponse.json(
        { success: false, error: `Invalid target audience. Must be one of: ${validAudiences.join(", ")}` },
        { status: 400 }
      );
    }

    // If scheduled, validate the date is in the future
    if (scheduledAt && new Date(scheduledAt) <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Scheduled date must be in the future" },
        { status: 400 }
      );
    }

    const campaign = await db.emailCampaign.create({
      data: {
        name,
        subject,
        body: campaignBody,
        type: type || "custom",
        targetAudience: targetAudience || "all",
        status: status || "draft",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        action: "CREATE_EMAIL_CAMPAIGN",
        details: `Created email campaign: ${name} (${type || "custom"})`,
      },
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error("Admin create campaign error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
