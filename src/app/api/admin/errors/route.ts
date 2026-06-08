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
    const type = searchParams.get("type") || "";
    const resolved = searchParams.get("resolved");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    if (resolved !== null && resolved !== "") {
      where.resolved = resolved === "true";
    }

    const [errors, total] = await Promise.all([
      db.errorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.errorLog.count({ where }),
    ]);

    return NextResponse.json({
      errors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error logs list error:", error);
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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Error log id is required" }, { status: 400 });
    }

    const errorLog = await db.errorLog.update({
      where: { id },
      data: { resolved: true },
    });

    return NextResponse.json({ error: errorLog });
  } catch (error) {
    console.error("Error log resolve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await db.errorLog.deleteMany({
      where: { resolved: true },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error logs clear error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
