import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await db.platformSettings.findMany({
      orderBy: { key: "asc" },
    });

    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error("Settings get error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body as { settings: { key: string; value: string; description?: string }[] };

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: "Settings array is required" }, { status: 400 });
    }

    const updatedSettings = await db.$transaction(
      settings.map((setting) =>
        db.platformSettings.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            ...(setting.description !== undefined && { description: setting.description }),
          },
          create: {
            key: setting.key,
            value: setting.value,
            description: setting.description,
          },
        })
      )
    );

    const result: Record<string, string> = {};
    for (const setting of updatedSettings) {
      result[setting.key] = setting.value;
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
