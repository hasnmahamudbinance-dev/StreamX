import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ user: null });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { profiles: true },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        language: user.language,
        autoplay: user.autoplay,
        emailNotify: user.emailNotify,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        status: user.status,
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        createdAt: user.createdAt,
      },
      profiles: user.profiles,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json({ user: null });
  }
}
