import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_TYPES = ["trending", "popular", "top_rated", "now_playing", "on_the_air", "upcoming", "custom"];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sections = await db.homepageSection.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            uploaded: true,
          },
        },
      },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Homepage sections list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, type, order, visible } = body;

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }

    const section = await db.homepageSection.create({
      data: {
        title,
        type,
        order: order ?? 0,
        visible: visible ?? true,
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Homepage section create error:", error);
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
    const { id, title, order, visible } = body;

    if (!id) {
      return NextResponse.json({ error: "Section id is required" }, { status: 400 });
    }

    const existing = await db.homepageSection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const section = await db.homepageSection.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(order !== undefined && { order }),
        ...(visible !== undefined && { visible }),
      },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Homepage section update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ error: "Section id is required" }, { status: 400 });
    }

    await db.homepageSection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Homepage section delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
