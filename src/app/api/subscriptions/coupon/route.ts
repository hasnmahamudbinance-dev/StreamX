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

    const { code } = await req.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const coupon = await db.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    if (!coupon.active) {
      return NextResponse.json({ error: "This coupon is no longer active" }, { status: 400 });
    }

    // Check expiration
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
    }

    // Check if not yet valid
    if (new Date(coupon.validFrom) > new Date()) {
      return NextResponse.json({ error: "This coupon is not yet active" }, { status: 400 });
    }

    // Check usage limit
    if (coupon.maxUses !== -1 && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 });
    }

    return NextResponse.json({
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      description: coupon.description,
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
