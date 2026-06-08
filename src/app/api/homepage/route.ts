import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const sections = await db.homepageSection.findMany({
      where: { visible: true },
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            uploaded: {
              select: {
                id: true,
                title: true,
                type: true,
                posterUrl: true,
                backdropUrl: true,
                rating: true,
                genres: true,
                description: true,
                releaseDate: true,
                runtime: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Homepage public error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
