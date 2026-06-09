import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const [downloads, total] = await Promise.all([
      db.download.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.download.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        downloads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get downloads error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await req.json();
    const { contentId, contentType, title, posterPath, seasonNumber, episodeNumber, quality } = body;

    if (!contentId || !contentType || !title) {
      return NextResponse.json(
        { success: false, error: "contentId, contentType, and title are required" },
        { status: 400 }
      );
    }

    // Check if user's subscription allows downloads
    const subscription = await db.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan.allowDownloads) {
      return NextResponse.json(
        { success: false, error: "Your subscription plan does not allow downloads. Please upgrade to a plan that supports downloads." },
        { status: 403 }
      );
    }

    // Check subscription status
    if (subscription.status !== "active" && subscription.status !== "trial") {
      return NextResponse.json(
        { success: false, error: "Your subscription is not active" },
        { status: 403 }
      );
    }

    // Check for duplicate download
    const existingDownload = await db.download.findUnique({
      where: {
        userId_contentId_contentType_seasonNumber_episodeNumber: {
          userId,
          contentId,
          contentType,
          seasonNumber: seasonNumber ?? null,
          episodeNumber: episodeNumber ?? null,
        },
      },
    });

    if (existingDownload) {
      return NextResponse.json(
        { success: false, error: "This content has already been downloaded" },
        { status: 409 }
      );
    }

    // Create download record
    const downloadQuality = quality || "high";
    const fileSize = downloadQuality === "low" ? 500000000 : downloadQuality === "medium" ? 1500000000 : 3000000000;

    const download = await db.download.create({
      data: {
        userId,
        contentId,
        contentType,
        title,
        posterPath: posterPath || null,
        seasonNumber: seasonNumber || null,
        episodeNumber: episodeNumber || null,
        quality: downloadQuality,
        fileSize,
        status: "completed",
        // Set expiry to 30 days from now (offline download expiry)
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      data: download,
    });
  } catch (error) {
    console.error("Create download error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
