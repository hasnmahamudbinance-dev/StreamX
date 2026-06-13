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
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let profiles = await db.profile.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });

    // Auto-create default profile if user has none (for existing users migrated to new schema)
    if (profiles.length === 0) {
      const userName = session.user.name || session.user.email?.split('@')[0] || 'User';
      const defaultProfile = await db.profile.create({
        data: {
          userId,
          profileName: userName,
          isDefault: true,
        },
      });
      profiles = [defaultProfile];
    }

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
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
