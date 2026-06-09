import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Find the latest unused verification code for this user
    const verificationCode = await db.emailVerificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      // Check if code exists but is expired or too many attempts
      const existingCode = await db.emailVerificationCode.findFirst({
        where: { userId: user.id, code, used: false },
        orderBy: { createdAt: 'desc' },
      });

      if (existingCode && existingCode.attempts >= 5) {
        return NextResponse.json({ error: "Maximum verification attempts reached. Please request a new code." }, { status: 400 });
      }

      if (existingCode && existingCode.expiresAt < new Date()) {
        return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
      }

      // Increment attempts
      if (existingCode) {
        await db.emailVerificationCode.update({
          where: { id: existingCode.id },
          data: { attempts: { increment: 1 } },
        });
      }

      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Mark code as used and verify email
    await db.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    });

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: "active",
      },
    });

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
