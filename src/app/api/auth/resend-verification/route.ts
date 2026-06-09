import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVerificationCode, sendEmail, verificationEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json({ message: "If an account exists, a new code has been sent" });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Check if there's a recent code (rate limit: 60 seconds)
    const recentCode = await db.emailVerificationCode.findFirst({
      where: { userId: user.id, used: false, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentCode) {
      const waitSeconds = Math.ceil((new Date(recentCode.createdAt).getTime() + 60000 - Date.now()) / 1000);
      return NextResponse.json({ 
        error: `Please wait ${waitSeconds} seconds before requesting a new code`,
        cooldownRemaining: waitSeconds,
      }, { status: 429 });
    }

    // Invalidate old codes
    await db.emailVerificationCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const code = generateVerificationCode();
    await db.emailVerificationCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: 'StreamX - Verify Your Email',
      type: 'verification',
      html: verificationEmailHtml(code),
    });

    return NextResponse.json({ message: "Verification code sent", verificationCode: code });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
