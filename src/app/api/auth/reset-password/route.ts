import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendEmail, securityAlertHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { resetToken, newPassword } = await req.json();
    
    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: "Reset token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find the used reset code
    const resetCode = await db.passwordResetCode.findUnique({
      where: { id: resetToken },
    });

    if (!resetCode || !resetCode.used) {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: resetCode.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all sessions (force re-login on all devices)
    await db.userSession.deleteMany({
      where: { userId: user.id },
    });

    // Delete all remaining reset codes
    await db.passwordResetCode.deleteMany({
      where: { userId: user.id },
    });

    // Send security alert
    await sendEmail({
      to: user.email,
      subject: 'StreamX - Password Changed',
      type: 'security_alert',
      html: securityAlertHtml('Your password has been changed. If this wasn\'t you, please contact support immediately.'),
    });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
