import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Profile API - GET returns user profile, PATCH updates profile fields
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        language: true,
        autoplay: true,
        emailNotify: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !body.email.includes("@")) {
        return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
      }
      // Check if email is already taken by another user
      const existingUser = await db.user.findUnique({
        where: { email: body.email.trim() },
      });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
      }
      updateData.email = body.email.trim();
      // Reset email verification when email changes
      updateData.emailVerified = false;
    }

    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar;
    }

    if (body.language !== undefined) {
      const validLanguages = ["en", "es", "fr", "de", "ja", "ko"];
      if (!validLanguages.includes(body.language)) {
        return NextResponse.json({ error: "Invalid language" }, { status: 400 });
      }
      updateData.language = body.language;
    }

    if (body.autoplay !== undefined) {
      updateData.autoplay = Boolean(body.autoplay);
    }

    if (body.emailNotify !== undefined) {
      updateData.emailNotify = Boolean(body.emailNotify);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        language: true,
        autoplay: true,
        emailNotify: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
