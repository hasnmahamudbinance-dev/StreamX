import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    console.log(`[verify-email] Request — email="${email}", code="${code}"`);

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`[verify-email] ❌ No user found for email="${email}"`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      console.log(`[verify-email] Email already verified for userId=${user.id}`);
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
        console.log(`[verify-email] ❌ Max attempts reached for userId=${user.id}`);
        return NextResponse.json({ error: "Maximum verification attempts reached. Please request a new code." }, { status: 400 });
      }

      if (existingCode && existingCode.expiresAt < new Date()) {
        console.log(`[verify-email] ❌ Code expired for userId=${user.id}`);
        return NextResponse.json({ error: "Verification code has expired. Please request a new code." }, { status: 400 });
      }

      // Increment attempts
      if (existingCode) {
        await db.emailVerificationCode.update({
          where: { id: existingCode.id },
          data: { attempts: { increment: 1 } },
        });
        console.log(`[verify-email] ❌ Invalid code — attempts incremented to ${existingCode.attempts + 1} for userId=${user.id}`);
      } else {
        console.log(`[verify-email] ❌ No matching code found for userId=${user.id}, code="${code}"`);
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

    console.log(`[verify-email] ✅ Email verified successfully for userId=${user.id}, email=${email}`);
    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("[verify-email] ❌ Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
