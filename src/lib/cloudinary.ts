import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryApiKey, getCloudinaryApiSecret, getCloudinaryCloudName } from "./env";

cloudinary.config({
  cloud_name: getCloudinaryCloudName(),
  api_key: getCloudinaryApiKey(),
  api_secret: getCloudinaryApiSecret(),
  secure: true,
});

export function cloudinaryReady(): boolean {
  return Boolean(getCloudinaryCloudName() && getCloudinaryApiKey() && getCloudinaryApiSecret());
}

export function generateMediaSignature() {
  if (!cloudinaryReady()) {
    return null;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "trailrz/events";
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    getCloudinaryApiSecret()
  );

  return {
    signature,
    timestamp,
    folder,
    cloud_name: getCloudinaryCloudName(),
    api_key: getCloudinaryApiKey(),
  };
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  folder = "trailrz/events"
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          console.error("Cloudinary upload stream error:", error);
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export default cloudinary;

