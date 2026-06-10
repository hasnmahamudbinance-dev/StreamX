import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateVerificationCode, sendEmail, passwordResetEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    console.log(`[forgot-password] Request — email="${email}"`);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal that user doesn't exist
      console.log(`[forgot-password] No user found for email="${email}" — returning generic message`);
      return NextResponse.json({ message: "If an account exists, a reset code has been sent" });
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      console.log(`[forgot-password] User account is ${user.status} for email="${email}" — returning generic message`);
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
    console.log(`[forgot-password] ✅ Reset code stored — code=${code}, userId=${user.id}`);

    // Send password reset email — CHECK the return value
    console.log(`[forgot-password] → Sending password reset email to: ${email}`);
    const emailSent = await sendEmail({
      to: email,
      subject: 'StreamX - Reset Your Password',
      type: 'password_reset',
      html: passwordResetEmailHtml(code),
    });

    if (!emailSent) {
      console.error(`[forgot-password] ❌ Password reset email FAILED to send for userId=${user.id}, email=${email}`);
    } else {
      console.log(`[forgot-password] ✅ Password reset email sent successfully to: ${email}`);
    }

    return NextResponse.json({ message: "Reset code sent to your email" });
  } catch (error) {
    console.error("[forgot-password] ❌ Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
