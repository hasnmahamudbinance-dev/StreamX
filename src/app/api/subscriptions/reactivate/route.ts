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
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    if (subscription.status !== 'cancelled') {
      return NextResponse.json({ error: "Only cancelled subscriptions can be reactivated" }, { status: 400 });
    }

    // Check if still within the billing period
    if (new Date(subscription.currentPeriodEnd) < new Date()) {
      return NextResponse.json({ error: "Subscription has expired and cannot be reactivated" }, { status: 400 });
    }

    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        cancelledAt: null,
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    console.error("Reactivate subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
