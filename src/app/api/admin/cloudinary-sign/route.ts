import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { EVENT_STAFF } from "@/lib/constants";
import { cloudinaryReady, generateMediaSignature } from "@/lib/cloudinary";
import { jsonOk, handleApiError, ApiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSign(request);
}

export async function POST(request: NextRequest) {
  return handleSign(request);
}

async function handleSign(request: NextRequest) {
  try {
    await requireRole(request, ...EVENT_STAFF);

    if (!cloudinaryReady()) {
      throw new ApiError(
        503,
        "Cloudinary credentials are not configured in environment variables."
      );
    }

    const sigData = generateMediaSignature()!;

    return jsonOk({
      success: true,
      signature: sigData.signature,
      timestamp: sigData.timestamp,
      folder: sigData.folder,
      cloudName: sigData.cloud_name,
      cloud_name: sigData.cloud_name,
      apiKey: sigData.api_key,
      api_key: sigData.api_key,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
