import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    // Find the campaign by ID
    const campaign = await db.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status === "sent") {
      return NextResponse.json(
        { success: false, error: "Campaign has already been sent" },
        { status: 400 }
      );
    }

    // Update status to "sent", set sentAt to now
    // For demo purposes, set recipientCount to a random number between 50-500
    const recipientCount = Math.floor(Math.random() * (500 - 50 + 1)) + 50;

    const updatedCampaign = await db.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: "sent",
        sentAt: new Date(),
        recipientCount,
      },
    });

    // Log the action in AuditLog
    await db.auditLog.create({
      data: {
        userId: (session.user as Record<string, unknown>).id as string,
        action: "CAMPAIGN_SENT",
        details: JSON.stringify({
          campaignId,
          campaignName: campaign.name,
          campaignType: campaign.type,
          recipientCount,
          targetAudience: campaign.targetAudience,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCampaign.id,
        name: updatedCampaign.name,
        status: updatedCampaign.status,
        sentAt: updatedCampaign.sentAt,
        recipientCount: updatedCampaign.recipientCount,
      },
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
