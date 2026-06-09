import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { id } = await params;

    // Find the download and verify ownership
    const download = await db.download.findUnique({
      where: { id },
    });

    if (!download) {
      return NextResponse.json(
        { success: false, error: "Download not found" },
        { status: 404 }
      );
    }

    if (download.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to delete this download" },
        { status: 403 }
      );
    }

    await db.download.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("Delete download error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
