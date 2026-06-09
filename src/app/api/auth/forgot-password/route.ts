import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVerificationCode, sendEmail, passwordResetEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist
      return NextResponse.json({ message: "If an account exists, a reset code has been sent" });
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      return NextResponse.json({ message: "If an account exists, a reset code has been sent" });
    }

    // Invalidate old reset codes
    await db.passwordResetCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const code = generateVerificationCode();
    await db.passwordResetCode.create({
      data: {
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: 'StreamX - Reset Your Password',
      type: 'password_reset',
      html: passwordResetEmailHtml(code),
    });

    return NextResponse.json({ message: "Reset code sent", resetCode: code });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
