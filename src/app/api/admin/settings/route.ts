import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.platformSetting.findFirst({
      where: { id: 1 },
    });

    if (!settings) {
      return NextResponse.json({ success: false, error: "Settings not initialized" }, { status: 404 });
    }

    // Parse JSON fields
    let cities: string[] = [];
    let categories: string[] = [];
    try {
      cities = JSON.parse(settings.supportedCities);
    } catch {
      cities = ["Chandigarh", "Mohali", "Panchkula"];
    }

    try {
      categories = JSON.parse(settings.eventCategories);
    } catch {
      categories = ["Music", "Food", "Comedy", "Art & Culture", "Workshops", "Nightlife"];
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        supportedCities: cities,
        eventCategories: categories,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      platformName,
      tagline,
      logoUrl,
      supportedCities,
      eventCategories,
      convenienceFeePercentage,
      convenienceFeeFixed,
      taxPercentage,
      bookingExpiryMinutes,
      razorpayKeyId,
      razorpayKeySecret,
      resendApiKey,
      resendFromEmail,
      whatsappToken,
      whatsappPhoneNumberId,
      supportEmail,
      supportPhone,
      instagramUrl,
      whatsappUrl,
      cancellationPolicyDefault,
      termsConditions,
      privacyPolicy,
    } = body;

    const updated = await prisma.platformSetting.upsert({
      where: { id: 1 },
      update: {
        ...(platformName && { platformName }),
        ...(tagline && { tagline }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(supportedCities && {
          supportedCities:
            typeof supportedCities === "string" ? supportedCities : JSON.stringify(supportedCities),
        }),
        ...(eventCategories && {
          eventCategories:
            typeof eventCategories === "string" ? eventCategories : JSON.stringify(eventCategories),
        }),
        ...(convenienceFeePercentage !== undefined && {
          convenienceFeePercentage: parseFloat(convenienceFeePercentage),
        }),
        ...(convenienceFeeFixed !== undefined && {
          convenienceFeeFixed: parseInt(convenienceFeeFixed),
        }),
        ...(taxPercentage !== undefined && {
          taxPercentage: parseFloat(taxPercentage),
        }),
        ...(bookingExpiryMinutes !== undefined && {
          bookingExpiryMinutes: parseInt(bookingExpiryMinutes),
        }),
        ...(razorpayKeyId !== undefined && { razorpayKeyId }),
        ...(razorpayKeySecret !== undefined && { razorpayKeySecret }),
        ...(resendApiKey !== undefined && { resendApiKey }),
        ...(resendFromEmail !== undefined && { resendFromEmail }),
        ...(whatsappToken !== undefined && { whatsappToken }),
        ...(whatsappPhoneNumberId !== undefined && { whatsappPhoneNumberId }),
        ...(supportEmail && { supportEmail }),
        ...(supportPhone && { supportPhone }),
        ...(instagramUrl && { instagramUrl }),
        ...(whatsappUrl && { whatsappUrl }),
        ...(cancellationPolicyDefault && { cancellationPolicyDefault }),
        ...(termsConditions && { termsConditions }),
        ...(privacyPolicy && { privacyPolicy }),
      },
      create: {
        id: 1,
        platformName: platformName || "TRAILRZ",
        tagline: tagline || "Life is happening. Go be part of it.",
      },
    });

    // Record audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "SETTINGS_UPDATED",
        entityType: "PlatformSettings",
        entityId: "1",
        details: JSON.stringify({ updatedBy: admin.name }),
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update platform settings" },
      { status: 500 }
    );
  }
}
