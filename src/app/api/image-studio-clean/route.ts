import { NextRequest, NextResponse } from "next/server";
import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

export const maxDuration = 60; // Allow sufficient time for AI segmentation

interface CleanOptions {
  backgroundMode?: "auto" | "white" | "dark" | "transparent";
}

/**
 * Checks whether an isolated product has high transparency
 * (e.g., clear visor, translucent glass, clear fluid bottle)
 */
async function detectTransparency(pngBuffer: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(pngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let semiTransparentPixelCount = 0;
    let solidPixelCount = 0;

    // Check alpha values of pixels
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      if (a > 25 && a < 225) {
        // Semi-transparent pixel
        semiTransparentPixelCount++;
      } else if (a >= 225) {
        solidPixelCount++;
      }
    }

    const totalProductPixels = semiTransparentPixelCount + solidPixelCount;
    if (totalProductPixels === 0) return false;

    // If more than 12% of the product has semi-transparent pixels, treat as transparent
    return semiTransparentPixelCount / totalProductPixels > 0.12;
  } catch {
    return false;
  }
}

/**
 * Creates a clean, spotless background:
 * - "white": Pure, bright studio white (#FFFFFF)
 * - "dark": Deep, clean obsidian black (#0A0A0C)
 */
function createStudioBackgroundSvg(
  width: number,
  height: number,
  mode: "dark" | "white"
): Buffer {
  if (mode === "dark") {
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#0A0A0C" />
      </svg>
    `;
    return Buffer.from(svg);
  } else {
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#FFFFFF" />
      </svg>
    `;
    return Buffer.from(svg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, backgroundMode = "auto" }: { image: string; backgroundMode?: "auto" | "white" | "dark" | "transparent" } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    // Extract base64 payload
    let inputBuffer: Buffer;
    if (image.startsWith("data:")) {
      const base64Data = image.split(",")[1];
      inputBuffer = Buffer.from(base64Data, "base64");
    } else {
      inputBuffer = Buffer.from(image, "base64");
    }

    // Step 1: Pre-process with Sharp (standardize color, trim transparent borders, slight denoise)
    const normalizedInput = await sharp(inputBuffer)
      .rotate() // auto-orient based on EXIF
      .toBuffer();

    // Convert Buffer to Blob for @imgly/background-removal-node
    const blob = new Blob([new Uint8Array(normalizedInput)], { type: "image/png" });

    // Step 2: Deep AI Background & Perimeter Text/Watermark Removal
    // Use medium model for higher resolution boundary fidelity
    const isolatedBlob = await removeBackground(blob, {
      model: "medium",
      output: {
        format: "image/png",
        quality: 1.0,
      },
    });

    const isolatedBuffer = Buffer.from(await isolatedBlob.arrayBuffer());

    // Step 2.5: Deep cleanup - suppress semi-transparent shadow halos and edge artifacts
    const { data: rawData, info: rawInfo } = await sharp(isolatedBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cleanData = Buffer.from(rawData);
    for (let i = 0; i < cleanData.length; i += 4) {
      const a = cleanData[i + 3];
      // Strongly eliminate low-alpha background ghosting / residual smoke / background elements
      if (a < 90) {
        cleanData[i + 3] = 0;
      } else {
        // Boost product opacity towards crisp 100%
        cleanData[i + 3] = Math.min(255, Math.round(((a - 90) / 165) * 255));
      }
    }

    const filteredBuffer = await sharp(cleanData, {
      raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 },
    })
      .png()
      .toBuffer();

    // Step 3: Trim any extra empty transparent borders so product is centered
    let trimmedProductBuffer: Buffer;
    let prodWidth = 800;
    let prodHeight = 800;

    try {
      const trimmed = sharp(filteredBuffer).trim({ threshold: 10 });
      const meta = await trimmed.metadata();
      if ((meta.width || 0) >= 10 && (meta.height || 0) >= 10) {
        trimmedProductBuffer = await trimmed.toBuffer();
        prodWidth = meta.width || 800;
        prodHeight = meta.height || 800;
      } else {
        trimmedProductBuffer = filteredBuffer;
        const rawMeta = await sharp(filteredBuffer).metadata();
        prodWidth = rawMeta.width || 800;
        prodHeight = rawMeta.height || 800;
      }
    } catch {
      trimmedProductBuffer = filteredBuffer;
      const rawMeta = await sharp(filteredBuffer).metadata();
      prodWidth = rawMeta.width || 800;
      prodHeight = rawMeta.height || 800;
    }

    // Step 4: Determine if product is transparent or solid
    const isTranslucent = await detectTransparency(trimmedProductBuffer);

    let finalBgType: "dark" | "white";
    if (backgroundMode === "dark") {
      finalBgType = "dark";
    } else if (backgroundMode === "white") {
      finalBgType = "white";
    } else {
      // "auto" mode:
      // If transparent (visors, clear plastic, glass bottle) -> shiny dark background
      // If solid (oils, body kits, brakes, parts) -> shiny white background
      finalBgType = isTranslucent ? "dark" : "white";
    }

    // If caller specifically requested raw transparent cutout
    if (backgroundMode === "transparent") {
      const finalCutout = await sharp(trimmedProductBuffer)
        .png({ quality: 95 })
        .toBuffer();
      return NextResponse.json({
        success: true,
        cleanedImage: `data:image/png;base64,${finalCutout.toString("base64")}`,
        isTranslucent,
        backgroundUsed: "transparent",
      });
    }

    // Step 5: Studio Framing & Scaling
    // Create standard square canvas (e.g. 1000x1000) with proper studio margins
    const canvasSize = 1000;
    const maxProdDimension = Math.round(canvasSize * 0.82); // 82% scale so there's elegant studio padding

    const scale = Math.min(
      maxProdDimension / prodWidth,
      maxProdDimension / prodHeight,
      1.5 // prevent excessive upscaling blur
    );

    const scaledWidth = Math.max(10, Math.round(prodWidth * scale));
    const scaledHeight = Math.max(10, Math.round(prodHeight * scale));

    const resizedProductBuffer = await sharp(trimmedProductBuffer)
      .resize(scaledWidth, scaledHeight, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Studio Background
    const bgSvg = createStudioBackgroundSvg(canvasSize, canvasSize, finalBgType);
    const bgBuffer = await sharp(bgSvg).png().toBuffer();

    // Composite product onto polished studio background centered with elegant ground baseline
    const leftOffset = Math.round((canvasSize - scaledWidth) / 2);
    // Align slightly towards center-ground
    const topOffset = Math.round((canvasSize - scaledHeight) / 2) - 10;

    const finalPolishedBuffer = await sharp(bgBuffer)
      .composite([
        {
          input: resizedProductBuffer,
          top: Math.max(0, topOffset),
          left: Math.max(0, leftOffset),
        },
      ])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    const polishedBase64 = `data:image/jpeg;base64,${finalPolishedBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      cleanedImage: polishedBase64,
      isTranslucent,
      backgroundUsed: finalBgType,
    });
  } catch (err: unknown) {
    console.error("AI studio image clean error:", err);
    return NextResponse.json(
      {
        error: "Failed to process image studio cleanup: " + (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}

