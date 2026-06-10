import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateVerificationCode, sendEmail, verificationEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password minimum 8 characters
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Password strength validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const strengthScore = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

    if (strengthScore < 2) {
      return NextResponse.json(
        { error: "Password is too weak. Include uppercase letters, numbers, or special characters." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const displayName = name?.trim() || email.split('@')[0];

    // Create user with pending_verification status
    const user = await db.user.create({
      data: {
        email,
        name: displayName,
        password: hashedPassword,
        role: "user",
        status: "pending_verification",
        emailVerified: false,
      },
    });

    // Generate and store verification code
    const verificationCode = generateVerificationCode();
    await db.emailVerificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Create default profile
    await db.profile.create({
      data: {
        userId: user.id,
        profileName: displayName,
        isDefault: true,
      },
    });

    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'StreamX - Verify Your Email',
        type: 'verification',
        html: verificationEmailHtml(verificationCode),
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration if email fails, just log it
    }

    return NextResponse.json(
      {
        message: "Account created! Please check your email for verification code.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
        },
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
