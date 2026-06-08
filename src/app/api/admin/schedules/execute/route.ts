import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Find all due schedules that haven't been executed
    const dueSchedules = await db.contentSchedule.findMany({
      where: {
        executed: false,
        scheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (dueSchedules.length === 0) {
      return NextResponse.json({ executed: 0 });
    }

    // Process each schedule
    for (const schedule of dueSchedules) {
      if (schedule.action === "publish") {
        await db.uploadedContent.update({
          where: { id: schedule.contentId },
          data: { status: "published" },
        });
      } else if (schedule.action === "archive") {
        await db.uploadedContent.update({
          where: { id: schedule.contentId },
          data: { status: "archived" },
        });
      }

      // Mark schedule as executed
      await db.contentSchedule.update({
        where: { id: schedule.id },
        data: {
          executed: true,
          executedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ executed: dueSchedules.length });
  } catch (error) {
    console.error("Schedule execute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
