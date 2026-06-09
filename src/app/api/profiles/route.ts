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
    const profiles = await db.profile.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Get profiles error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { profileName, isKids } = await req.json();

    if (!profileName?.trim()) {
      return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
    }

    // Check profile limit (max 5)
    const profileCount = await db.profile.count({
      where: { userId },
    });

    if (profileCount >= 5) {
      return NextResponse.json({ error: "Maximum of 5 profiles allowed" }, { status: 400 });
    }

    const profile = await db.profile.create({
      data: {
        userId,
        profileName: profileName.trim(),
        isKids: isKids || false,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error("Create profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
