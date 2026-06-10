import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVerificationCode, sendEmail, verificationEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    console.log(`[resend-verification] Request — email="${email}"`);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist
      console.log(`[resend-verification] No user found for email="${email}" — returning generic message`);
      return NextResponse.json({ message: "If an account exists, a new code has been sent" });
    }

    if (user.emailVerified) {
      console.log(`[resend-verification] Email already verified for userId=${user.id}`);
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Check if there's a recent code (rate limit: 60 seconds)
    const recentCode = await db.emailVerificationCode.findFirst({
      where: { userId: user.id, used: false, createdAt: { gt: new Date(Date.now() - 60 * 1000) } },
    });
    if (recentCode) {
      const waitSeconds = Math.ceil((new Date(recentCode.createdAt).getTime() + 60000 - Date.now()) / 1000);
      console.log(`[resend-verification] Rate limited — ${waitSeconds}s remaining for userId=${user.id}`);
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
    console.log(`[resend-verification] ✅ New verification code stored — code=${code}, userId=${user.id}`);

    // Send verification email — CHECK the return value
    console.log(`[resend-verification] → Sending verification email to: ${email}`);
    const emailSent = await sendEmail({
      to: email,
      subject: 'StreamX - Verify Your Email',
      type: 'verification',
      html: verificationEmailHtml(code),
    });

    if (!emailSent) {
      console.error(`[resend-verification] ❌ Verification email FAILED to send for userId=${user.id}, email=${email}`);
      // Return error so the frontend knows the email wasn't sent
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later or contact support." },
        { status: 500 }
      );
    }

    console.log(`[resend-verification] ✅ Verification email sent successfully to: ${email}`);
    return NextResponse.json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error("[resend-verification] ❌ Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
