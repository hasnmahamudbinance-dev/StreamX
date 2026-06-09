import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const escapeCSV = (value: unknown): string => {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "users";
    const format = searchParams.get("format") || "json";

    if (!["users", "content", "revenue"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type. Must be: users, content, or revenue" },
        { status: 400 }
      );
    }

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json(
        { success: false, error: "Invalid format. Must be: csv or json" },
        { status: 400 }
      );
    }

    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];
    let filename = "";

    if (type === "users") {
      headers = ["id", "email", "name", "role", "status", "createdAt"];
      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
      data = users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }));
      filename = "users_export";
    } else if (type === "content") {
      headers = ["id", "title", "type", "views", "watchTime", "status", "createdAt"];
      const content = await db.uploadedContent.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          views: true,
          watchTime: true,
          status: true,
          createdAt: true,
        },
      });
      data = content.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }));
      filename = "content_export";
    } else if (type === "revenue") {
      headers = ["id", "userId", "amount", "currency", "status", "provider", "createdAt"];
      const payments = await db.payment.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          amount: true,
          currency: true,
          status: true,
          provider: true,
          createdAt: true,
        },
      });
      data = payments.map((p) => ({
        ...p,
        amount: String(p.amount),
        createdAt: p.createdAt.toISOString(),
      }));
      filename = "revenue_export";
    }

    if (format === "csv") {
      const csvContent = toCSV(headers, data);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      data,
      type,
      count: data.length,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin export error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
