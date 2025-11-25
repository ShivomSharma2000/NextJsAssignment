import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const uploadToCloudinary = async (filePath: string, folder: string) => {
  try {
    const upload = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto", // allows image + pdf
    });

    fs.unlinkSync(filePath); // delete temp file
    return upload.secure_url;

  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};
