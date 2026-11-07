import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  BrandLogoItem,
  ShowcaseImageItem,
  HomepageTrainsData,
  DEFAULT_BRAND_LOGOS,
  DEFAULT_SHOWCASE_IMAGES,
  DEFAULT_TRAINS_DATA,
} from "@/types/homepageTrains";

export * from "@/types/homepageTrains";

const DATA_DIR = path.join(process.cwd(), "data");
const TRAINS_FILE = path.join(DATA_DIR, "homepage-trains.json");
export const TRAINS_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "trains"
);

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TRAINS_UPLOAD_DIR)) {
    fs.mkdirSync(TRAINS_UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(TRAINS_FILE)) {
    fs.writeFileSync(
      TRAINS_FILE,
      JSON.stringify(DEFAULT_TRAINS_DATA, null, 2),
      "utf-8"
    );
  }
}

export function persistTrainImage(
  image: string,
  prefix: "brand" | "showcase"
): string {
  ensureStorage();
  if (!image || typeof image !== "string") return "";
  const trimmed = image.trim();
  if (!trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  const match = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return "";
  const extRaw = match[1].toLowerCase();
  const ext =
    extRaw === "jpeg"
      ? "jpg"
      : extRaw === "svg+xml"
      ? "svg"
      : extRaw.replace(/[^a-z0-9]/g, "") || "png";
  const filename = `${prefix}-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}.${ext}`;
  const filePath = path.join(TRAINS_UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
  return `/uploads/trains/${filename}`;
}

export function readHomepageTrains(): HomepageTrainsData {
  ensureStorage();
  try {
    const raw = fs.readFileSync(TRAINS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const brandLogos = Array.isArray(parsed?.brandLogos)
      ? parsed.brandLogos
      : DEFAULT_BRAND_LOGOS;
    const showcaseImages = Array.isArray(parsed?.showcaseImages)
      ? parsed.showcaseImages
      : DEFAULT_SHOWCASE_IMAGES;

    return {
      brandLogos: brandLogos.length > 0 ? brandLogos : DEFAULT_BRAND_LOGOS,
      showcaseImages:
        showcaseImages.length > 0 ? showcaseImages : DEFAULT_SHOWCASE_IMAGES,
    };
  } catch {
    return DEFAULT_TRAINS_DATA;
  }
}

export function writeHomepageTrains(data: HomepageTrainsData): void {
  ensureStorage();
  fs.writeFileSync(TRAINS_FILE, JSON.stringify(data, null, 2), "utf-8");
}
