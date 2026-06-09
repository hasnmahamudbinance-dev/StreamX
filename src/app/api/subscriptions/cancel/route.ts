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

    const subscription = await db.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json({ error: "Subscription is already cancelled" }, { status: 400 });
    }

    // Cancel at end of period
    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelledAt: new Date(),
        cancelAtPeriodEnd: true,
        status: 'cancelled',
      },
      include: { plan: true },
    });

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
