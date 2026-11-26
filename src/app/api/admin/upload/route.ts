import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF } from "@/lib/constants";
import { cloudinaryReady, uploadImageBuffer } from "@/lib/cloudinary";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ...EVENT_STAFF);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new ApiError(400, "No image file provided.");
    }

    const safeExt = ALLOWED_IMAGE_TYPES[file.type];
    if (!safeExt) {
      throw new ApiError(400, "Only PNG, JPEG, WebP, or AVIF image files are allowed.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new ApiError(400, "File exceeds maximum size limit of 10MB.");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (cloudinaryReady()) {
      try {
        const uploadResult = await uploadImageBuffer(buffer, "trailrz/events");
        return jsonOk({
          success: true,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
        });
      } catch (cloudErr) {
        console.warn("Cloudinary direct stream error:", cloudErr);
        if (process.env.NODE_ENV === "production") {
          throw new ApiError(502, "Image upload service failed. Please try again.");
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      throw new ApiError(503, "Image upload storage (Cloudinary) is not configured.");
    }

    // Non-production local fallback when Cloudinary is unavailable
    try {
      const fileName = `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${safeExt}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      return jsonOk({
        success: true,
        url: `/uploads/${fileName}`,
        publicId: fileName,
        note: "Stored locally in public/uploads",
      });
    } catch {
      throw new ApiError(503, "Image upload storage is not writable.");
    }
  } catch (err) {
    return handleApiError(err);
  }
}
