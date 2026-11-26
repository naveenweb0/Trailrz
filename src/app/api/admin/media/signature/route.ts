import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF } from "@/lib/constants";
import { cloudinaryReady, generateMediaSignature } from "@/lib/cloudinary";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ...EVENT_STAFF);

    if (!cloudinaryReady()) {
      throw new ApiError(
        503,
        "Image uploads are not configured yet. Paste an image URL instead."
      );
    }

    const sigData = generateMediaSignature();

    return jsonOk(sigData);
  } catch (err) {
    return handleApiError(err);
  }
}

