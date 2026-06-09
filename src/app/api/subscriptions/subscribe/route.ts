import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { planId, couponCode } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    // Verify plan exists and is active
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
    }

    // Check existing subscription
    const existingSub = await db.subscription.findUnique({
      where: { userId },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const trialEnd = plan.trialDays > 0
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;

    let subscription;

    if (existingSub) {
      // Update existing subscription (upgrade/downgrade)
      subscription = await db.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId,
          status: trialEnd ? 'trial' : 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEnd,
          cancelledAt: null,
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      });

      // Create payment record if plan has a price
      if (plan.price > 0) {
        let finalAmount = plan.price;
        let description = `${plan.displayName || plan.name} - ${existingSub.planId !== planId ? 'Plan Change' : 'Renewal'}`;

        // Apply coupon if provided
        if (couponCode) {
          const coupon = await db.coupon.findUnique({
            where: { code: couponCode.toUpperCase() },
          });
          if (coupon && coupon.active && (coupon.maxUses === -1 || coupon.usedCount < coupon.maxUses)) {
            if (coupon.discountType === 'percentage') {
              finalAmount = plan.price * (1 - coupon.discountValue / 100);
            } else {
              finalAmount = Math.max(0, plan.price - coupon.discountValue);
            }
            description += ` (Coupon: ${couponCode})`;

            // Increment coupon usage
            await db.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }

        await db.payment.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            amount: finalAmount,
            currency: plan.currency,
            status: 'completed',
            provider: 'stripe',
            description,
          },
        });
      }
    } else {
      // Create new subscription
      subscription = await db.subscription.create({
        data: {
          userId,
          planId,
          status: trialEnd ? 'trial' : (plan.price === 0 ? 'active' : 'active'),
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEnd,
        },
        include: { plan: true },
      });

      // Create payment record if plan has a price
      if (plan.price > 0) {
        let finalAmount = plan.price;
        let description = `${plan.displayName || plan.name} - New Subscription`;

        // Apply coupon if provided
        if (couponCode) {
          const coupon = await db.coupon.findUnique({
            where: { code: couponCode.toUpperCase() },
          });
          if (coupon && coupon.active && (coupon.maxUses === -1 || coupon.usedCount < coupon.maxUses)) {
            if (coupon.discountType === 'percentage') {
              finalAmount = plan.price * (1 - coupon.discountValue / 100);
            } else {
              finalAmount = Math.max(0, plan.price - coupon.discountValue);
            }
            description += ` (Coupon: ${couponCode})`;

            await db.coupon.update({
              where: { id: coupon.id },
              data: { usedCount: { increment: 1 } },
            });
          }
        }

        await db.payment.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            amount: finalAmount,
            currency: plan.currency,
            status: 'completed',
            provider: 'stripe',
            description,
          },
        });
      }
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
