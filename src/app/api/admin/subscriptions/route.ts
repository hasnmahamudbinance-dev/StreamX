import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          plan: true,
        },
      }),
      db.subscription.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Admin get subscriptions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      displayName,
      description,
      price,
      currency,
      interval,
      trialDays,
      maxResolution,
      maxDevices,
      maxProfiles,
      allowDownloads,
      allowOffline,
      features,
      stripePriceId,
      active,
      order,
      planId, // If provided, update existing plan
    } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { success: false, error: "Name and display name are required" },
        { status: 400 }
      );
    }

    let plan;

    if (planId) {
      // Update existing plan
      plan = await db.subscriptionPlan.update({
        where: { id: planId },
        data: {
          name,
          displayName,
          description: description || null,
          price: price ?? 0,
          currency: currency || "USD",
          interval: interval || "month",
          trialDays: trialDays ?? 0,
          maxResolution: maxResolution || "720p",
          maxDevices: maxDevices ?? 1,
          maxProfiles: maxProfiles ?? 1,
          allowDownloads: allowDownloads ?? false,
          allowOffline: allowOffline ?? false,
          features: features || null,
          stripePriceId: stripePriceId || null,
          active: active ?? true,
          order: order ?? 0,
        },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: (session.user as Record<string, unknown>).id as string,
          action: "UPDATE_SUBSCRIPTION_PLAN",
          details: `Updated subscription plan: ${displayName}`,
        },
      });
    } else {
      // Create new plan
      plan = await db.subscriptionPlan.create({
        data: {
          name,
          displayName,
          description: description || null,
          price: price ?? 0,
          currency: currency || "USD",
          interval: interval || "month",
          trialDays: trialDays ?? 0,
          maxResolution: maxResolution || "720p",
          maxDevices: maxDevices ?? 1,
          maxProfiles: maxProfiles ?? 1,
          allowDownloads: allowDownloads ?? false,
          allowOffline: allowOffline ?? false,
          features: features || null,
          stripePriceId: stripePriceId || null,
          active: active ?? true,
          order: order ?? 0,
        },
      });

      // Audit log
      await db.auditLog.create({
        data: {
          userId: (session.user as Record<string, unknown>).id as string,
          action: "CREATE_SUBSCRIPTION_PLAN",
          details: `Created subscription plan: ${displayName}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Admin create/update subscription plan error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
