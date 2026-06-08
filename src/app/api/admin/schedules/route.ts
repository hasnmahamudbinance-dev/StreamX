import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const executedParam = searchParams.get("executed");

    const where: { executed?: boolean } = {};
    if (executedParam === "false") {
      where.executed = false;
    } else if (executedParam === "true") {
      where.executed = true;
    }

    const schedules = await db.contentSchedule.findMany({
      where,
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Admin schedules GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { contentId, action, scheduledAt } = body;

    if (!contentId || !action || !scheduledAt) {
      return NextResponse.json(
        { error: "contentId, action, and scheduledAt are required" },
        { status: 400 }
      );
    }

    if (action !== "publish" && action !== "archive") {
      return NextResponse.json(
        { error: "Action must be 'publish' or 'archive'" },
        { status: 400 }
      );
    }

    // Verify content exists
    const content = await db.uploadedContent.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    const schedule = await db.contentSchedule.create({
      data: {
        contentId,
        action,
        scheduledAt: new Date(scheduledAt),
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
          },
        },
      },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        userId,
        action: "create_schedule",
        details: `Scheduled ${action} for "${content.title}" at ${scheduledAt}`,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error("Admin schedules POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "Schedule id is required" },
        { status: 400 }
      );
    }

    const schedule = await db.contentSchedule.findUnique({
      where: { id },
      include: {
        content: {
          select: { title: true },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    await db.contentSchedule.delete({
      where: { id },
    });

    // Create audit log
    const userId = (session.user as Record<string, unknown>).id as string;
    await db.auditLog.create({
      data: {
        userId,
        action: "delete_schedule",
        details: `Deleted ${schedule.action} schedule for "${schedule.content.title}"`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin schedules DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
