import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, status, failedLoginAttempts, lockedUntil } = body;

    if (role && !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (status && !["active", "suspended", "pending_verification", "deleted"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Build update data dynamically
    const updateData: Record<string, unknown> = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (failedLoginAttempts !== undefined) updateData.failedLoginAttempts = failedLoginAttempts;
    if (lockedUntil !== undefined) updateData.lockedUntil = lockedUntil;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        createdAt: true,
      },
    });

    // Create audit log
    const auditAction = status === "active" && failedLoginAttempts === 0 && lockedUntil === null
      ? "UNLOCK_USER_ACCOUNT"
      : "UPDATE_USER_ROLE";
    const auditDetails = status === "active" && failedLoginAttempts === 0 && lockedUntil === null
      ? `Unlocked user account ${user.email}`
      : `Changed user ${user.email} role to ${role || user.role}`;

    await db.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: auditAction,
        details: auditDetails,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await db.user.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "DELETE_USER",
        details: `Deleted user ${id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
