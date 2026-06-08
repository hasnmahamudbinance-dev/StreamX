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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (search) {
      where.title = { contains: search };
    }
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      db.uploadedContent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { episodes: true, subtitles: true } },
        },
      }),
      db.uploadedContent.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Content list error:", error);
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
    const {
      title, originalTitle, description, type, releaseDate, genres,
      language, runtime, rating, posterUrl, backdropUrl, trailerUrl,
      cast, director, featured, status,
    } = body;

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    const content = await db.uploadedContent.create({
      data: {
        title,
        originalTitle,
        description,
        type,
        status: status || "draft",
        releaseDate,
        genres,
        language: language || "en",
        runtime: runtime || 0,
        rating: rating || 0,
        posterUrl,
        backdropUrl,
        trailerUrl,
        cast,
        director,
        featured: featured || false,
        uploadedBy: (session.user as Record<string, unknown>).id as string,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        action: "CREATE_CONTENT",
        details: `Created ${type}: ${title}`,
      },
    });

    return NextResponse.json({ item: content }, { status: 201 });
  } catch (error) {
    console.error("Content create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
