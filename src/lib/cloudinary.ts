import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "fzwn0nve",
  api_key: process.env.CLOUDINARY_API_KEY || "536887658672588",
  api_secret: process.env.CLOUDINARY_API_SECRET || "yQZFXUJtIniUvn9YjkRqSkk17OY",
  secure: true,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
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
