import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { CHAT_UPLOADS_DIR } from "@/lib/chat";

export const maxDuration = 60;

// Maximum allowed file size per media file: 100MB
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const blob = file as File;
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum size of 100MB." },
        { status: 400 }
      );
    }

    if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
      fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const rawExt = path.extname(blob.name || "");
    const safeExt = rawExt && rawExt.length <= 8 ? rawExt : ".bin";
    const filename = `chat-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeExt}`;
    const targetPath = path.join(CHAT_UPLOADS_DIR, filename);

    fs.writeFileSync(targetPath, buffer);

    let type: "image" | "video" | "audio" | "file" = "file";
    const mime = blob.type || "";
    if (mime.startsWith("image/")) type = "image";
    else if (mime.startsWith("video/")) type = "video";
    else if (mime.startsWith("audio/")) type = "audio";

    const publicUrl = `/uploads/chat/${filename}`;

    return NextResponse.json({
      success: true,
      attachment: {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        url: publicUrl,
        filename: blob.name || filename,
        sizeBytes: blob.size,
        mimeType: mime,
      },
    });
  } catch (err) {
    console.error("Chat media upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload chat media." },
      { status: 500 }
    );
  }
}

