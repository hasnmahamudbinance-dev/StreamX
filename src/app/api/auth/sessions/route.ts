import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const sessions = await db.userSession.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (sessionId) {
      // Delete specific session
      await db.userSession.deleteMany({
        where: { id: sessionId, userId },
      });
    } else {
      // Delete all sessions (logout all devices)
      await db.userSession.deleteMany({
        where: { userId },
      });
    }

    return NextResponse.json({ message: "Sessions removed" });
  } catch (error) {
    console.error("Delete sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
