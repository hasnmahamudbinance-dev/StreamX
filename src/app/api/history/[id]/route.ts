import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE: Remove a specific history entry by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const { id } = await params;

    const historyItem = await db.watchHistory.findUnique({
      where: { id },
    });

    if (!historyItem) {
      return NextResponse.json({ error: "History item not found" }, { status: 404 });
    }

    // Verify ownership
    if (historyItem.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.watchHistory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("History DELETE [id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
