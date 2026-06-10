import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { generateVerificationCode, sendEmail, verificationEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password } = body;

    console.log(`[register] Signup attempt — email="${email}", name="${name || '(not provided)'}"`);

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
      console.log(`[register] ❌ Duplicate email — user already exists: ${email}`);
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
    console.log(`[register] ✅ User created — id=${user.id}, email=${user.email}, status=${user.status}`);

    // Generate and store verification code
    const verificationCode = generateVerificationCode();
    await db.emailVerificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });
    console.log(`[register] ✅ Verification code stored — code=${verificationCode}, userId=${user.id}`);

    // Create default profile
    await db.profile.create({
      data: {
        userId: user.id,
        profileName: displayName,
        isDefault: true,
      },
    });
    console.log(`[register] ✅ Default profile created for userId=${user.id}`);

    // Send verification email — CHECK the return value instead of relying on try/catch
    // (sendEmail never throws — it catches all errors internally and returns false)
    console.log(`[register] → Sending verification email to: ${email}`);
    const emailSent = await sendEmail({
      to: email,
      subject: 'StreamX - Verify Your Email',
      type: 'verification',
      html: verificationEmailHtml(verificationCode),
    });

    if (!emailSent) {
      console.error(`[register] ❌ Verification email FAILED to send for userId=${user.id}, email=${email}`);
      console.error('[register]    The user was created but will NOT receive a verification email.');
      console.error('[register]    Possible causes:');
      console.error('[register]      1. RESEND_API_KEY is missing or invalid');
      console.error('[register]      2. EMAIL_FROM uses Resend sandbox domain (onboarding@resend.dev) — can only send to account owner');
      console.error('[register]      3. Resend API returned an error (422/403)');
      console.error('[register]      4. Network error connecting to Resend API');
    } else {
      console.log(`[register] ✅ Verification email sent successfully to: ${email}`);
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
        emailSent,  // Include email delivery status in response for debugging
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[register] ❌ Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
