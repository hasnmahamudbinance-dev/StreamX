import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Delete all sessions
    await db.userSession.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ message: "Logged out of all devices" });
  } catch (error) {
    console.error("Logout all error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
