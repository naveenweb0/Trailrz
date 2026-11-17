import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "trailrz/events";
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "fzwn0nve";
    const apiKey = process.env.CLOUDINARY_API_KEY || "536887658672588";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "yQZFXUJtIniUvn9YjkRqSkk17OY";

    const signature = cloudinary.utils.api_sign_request(
      {
        folder,
        timestamp,
      },
      apiSecret
    );

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      folder,
      cloudName,
      apiKey,
    });
  } catch (error: any) {
    console.error("Cloudinary sign error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate Cloudinary signature" },
      { status: 500 }
    );
  }
}
