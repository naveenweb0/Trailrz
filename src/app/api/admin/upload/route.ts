import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { uploadImageBuffer } from "@/lib/cloudinary";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No image file provided." }, { status: 400 });
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Only image files (PNG, JPEG, WebP, AVIF) are allowed." },
        { status: 400 }
      );
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File exceeds maximum size limit of 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Try Cloudinary first
    try {
      const uploadResult = await uploadImageBuffer(buffer, "trailrz/events");
      return NextResponse.json({
        success: true,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
      });
    } catch (cloudErr: any) {
      console.warn("Cloudinary backend unreachable, saving to local public/uploads:", cloudErr?.message);

      const ext = path.extname(file.name) || ".jpg";
      const fileName = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        url: `/uploads/${fileName}`,
        note: "Stored locally in public/uploads",
      });
    }
  } catch (error: any) {
    console.error("Upload handler error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process image upload" },
      { status: 500 }
    );
  }
}
