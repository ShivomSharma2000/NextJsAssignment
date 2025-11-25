export const runtime = "nodejs";
export const config = {
  api: {
    bodyParser: false,
  },
};

import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import fs from "fs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";

export async function POST(req: Request) {
  try {
    console.log("API Hit");
    await connectDB();

    const formData = await req.formData();

    const dataValue = formData.get("data");
    if (!dataValue || typeof dataValue !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid data received" },
        { status: 400 }
      );
    }

    const jsonData = JSON.parse(dataValue);

    // ✅ EMAIL VALIDATION BEFORE UPLOADING FILES
    const existingUser = await User.findOne({ email: jsonData.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already exists!" },
        { status: 409 }
      );
    }

    const files = formData.getAll("files") as File[];
    const uploadedDocs: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      // Convert to buffer for temp upload
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}-${file.name}`;

      // TEMP LOCAL UPLOAD
      const tempPath = path.join(process.cwd(), "public", "uploads", fileName);
      await writeFile(tempPath, buffer);

      // Upload to Cloudinary
      const cloudUrl = await uploadToCloudinary(tempPath, "user_uploads");

      uploadedDocs.push({
        fileName: jsonData.documents[i].fileName,
        fileType: jsonData.documents[i].fileType,
        fileUrl: cloudUrl,
      });

      // Delete local file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }

    // Save final user
    const newUser = await User.create({
      ...jsonData,
      documents: uploadedDocs,
    });

    return NextResponse.json(
      { success: true, message: "User registered successfully", data: newUser },
      { status: 200 }
    );
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: String(err) },
      { status: 500 }
    );
  }
}
