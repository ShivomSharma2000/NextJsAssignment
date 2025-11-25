import { writeFile } from "fs/promises";
import path from "path";

export async function saveFileLocally(file: File, folderPath: string) {
  // Convert File → Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create a unique filename
  const fileName = `${Date.now()}-${file.name}`;

  // Resolve full path
  const filePath = path.join(process.cwd(), "public", folderPath, fileName);

  // Save the file
  await writeFile(filePath, buffer);

  // Return the browser-accessible URL
  return `/${folderPath}/${fileName}`;
}
