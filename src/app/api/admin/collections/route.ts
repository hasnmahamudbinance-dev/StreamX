import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const collections = await db.collection.findMany({
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ collections });
  } catch (error) {
    console.error("Admin collections GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, type, featured, items } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const collection = await db.collection.create({
      data: {
        title,
        description,
        type: type || "custom",
        featured: featured || false,
        items: items
          ? {
              create: items.map((item: any, index: number) => ({
                contentId: String(item.contentId),
                contentType: item.contentType,
                order: index,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error("Admin collections POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
