import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: "Email and reset code are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset code" }, { status: 400 });
    }

    const resetCode = await db.passwordResetCode.findFirst({
      where: { userId: user.id, code, used: false, expiresAt: { gt: new Date() } },
    });

    if (!resetCode) {
      return NextResponse.json({ error: "Invalid or expired reset code" }, { status: 400 });
    }

    // Mark code as used (one-time use)
    await db.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { used: true },
    });

    // Return a temporary token for the password reset step
    return NextResponse.json({ 
      message: "Code verified",
      resetToken: resetCode.id, // Use the code record ID as the reset token
    });
  } catch (error) {
    console.error("Verify reset code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
