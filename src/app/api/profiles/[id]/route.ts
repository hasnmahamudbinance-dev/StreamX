import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;
    const { profileName, avatar, isKids } = await req.json();

    // Verify profile belongs to user
    const profile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const updated = await db.profile.update({
      where: { id },
      data: {
        ...(profileName !== undefined ? { profileName: profileName.trim() } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        ...(isKids !== undefined ? { isKids } : {}),
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    // Verify profile belongs to user
    const profile = await db.profile.findFirst({
      where: { id, userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.isDefault) {
      return NextResponse.json({ error: "Cannot delete default profile" }, { status: 400 });
    }

    await db.profile.delete({ where: { id } });

    return NextResponse.json({ message: "Profile deleted" });
  } catch (error) {
    console.error("Delete profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
