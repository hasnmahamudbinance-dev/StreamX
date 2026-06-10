import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role,
        image: session.user.image,
        emailVerified: (session.user as any).emailVerified ?? false,
        status: (session.user as any).status ?? 'active',
      },
    });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ user: null });
  }
}
