"use server";

import fs from "fs/promises";
import path from "path";

export async function uploadImage(formData: FormData): Promise<{ url: string; error?: string }> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { url: "", error: "No file selected" };
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return { url: "", error: "Only JPG, PNG, and WEBP images are allowed" };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create public/uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name) || ".png";
    const filename = `menu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/uploads/${filename}`;

    return { url: publicUrl };
  } catch (err: any) {
    console.error("File upload error:", err);
    return { url: "", error: err?.message || "Failed to upload file" };
  }
}
