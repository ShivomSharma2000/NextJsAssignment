export const runtime = "nodejs";
export const config = {
  api: {
    bodyParser: false,
  },
};

import { NextResponse } from "next/server";
import path from "path";
import { writeFile } from "fs/promises";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    console.log("hree")
    await connectDB();

    const formData = await req.formData();

    const dataValue = formData.get("data");
    console.log("dataValue: ",dataValue);

    if (!dataValue || typeof dataValue !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid data" },
        { status: 400 }
      );
    }

    const jsonData = JSON.parse(dataValue);
    console.log("jsonData: ",jsonData);


    const files = formData.getAll("files") as File[];
    console.log("files: ",files);

    const uploadedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}-${file.name}`;

      const uploadPath = path.join(
        process.cwd(),
        "public",
        "uploads",
        fileName
      );

      await writeFile(uploadPath, buffer);

      uploadedDocs.push({
        fileName: jsonData.documents[i].fileName,
        fileType: jsonData.documents[i].fileType,
        fileUrl: `/uploads/${fileName}`,
      });
    }

    const newUser = await User.create({
      ...jsonData,
      documents: uploadedDocs,
    });

    return NextResponse.json(
      { success: true, message: "User registered", data: newUser },
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
