import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = { status: "published" };
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      db.uploadedContent.findMany({
        where,
        orderBy: [
          { featured: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { episodes: true } },
        },
      }),
      db.uploadedContent.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Published content error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
