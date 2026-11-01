import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface OwnerProfile {
  id: string;
  image: string;
  name: string;
  designation: string;
  email: string;
}

export interface AboutUsData {
  tagline: string;
  description: string;
  mission: string;
  vision: string;
  whyChooseUs: string;
  establishedYear: string;
  owners: OwnerProfile[]; // 4 owners
}

export interface ContactUsData {
  shopName: string;
  address: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  businessHours: string;
  facebookUrl: string;
  instagramUrl: string;
  mapLocation: string;
  additionalNote: string;
}

export interface SiteInfoData {
  about: AboutUsData;
  contact: ContactUsData;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SITE_INFO_FILE = path.join(DATA_DIR, "site-info.json");
const OWNERS_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "owners"
);

const DEFAULT_SITE_INFO: SiteInfoData = {
  about: {
    tagline: "Get Set Go — Premium Moto Gear, Lubricants & Performance Parts",
    description:
      "FURIOUS MOTO SHOP is your trusted destination for 100% genuine motorcycle helmets, synthetic engine oils, oil additives, LED fog & head lights, riding safety guards, stock parts, aerodynamic body kits, security systems, and custom modification accessories.",
    mission:
      "To empower every rider with authentic, high-performance motorcycle parts and safety gear backed by reliable service and fair pricing.",
    vision:
      "To be the most trusted and comprehensive motorcycle performance & accessories hub for riders nationwide.",
    whyChooseUs:
      "100% Authentic Global Brands • Certified Riding Safety Gear • Expert Modification Advice • Dedicated Customer Support",
    establishedYear: "2024",
    owners: [
      {
        id: "owner-1",
        image: "",
        name: "Mridul",
        designation: "Co-Founder & Managing Owner",
        email: "mridul@gmail.com",
      },
      {
        id: "owner-2",
        image: "",
        name: "Owner 2",
        designation: "Co-Founder & Operations Head",
        email: "owner2@furiousmotoshop.com",
      },
      {
        id: "owner-3",
        image: "",
        name: "Owner 3",
        designation: "Co-Founder & Finance Director",
        email: "owner3@furiousmotoshop.com",
      },
      {
        id: "owner-4",
        image: "",
        name: "Owner 4",
        designation: "Co-Founder & Technical Director",
        email: "owner4@furiousmotoshop.com",
      },
    ],
  },
  contact: {
    shopName: "FURIOUS MOTO SHOP",
    address: "Race Course",
    primaryPhone: "01836585258",
    secondaryPhone: "",
    whatsapp: "01836585258",
    email: "mridul@gmail.com",
    supportEmail: "support@furiousmotoshop.com",
    businessHours: "Saturday – Thursday: 10:00 AM – 10:00 PM (Friday: 3:00 PM – 10:00 PM)",
    facebookUrl: "https://facebook.com/furiousmotoshop",
    instagramUrl: "https://instagram.com/furiousmotoshop",
    mapLocation: "Race Course",
    additionalNote:
      "Feel free to call, WhatsApp, or visit our showroom for genuine parts, helmets, engine oils, and bike modification consultations.",
  },
};

function ensureSiteInfoFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(OWNERS_UPLOAD_DIR)) {
    fs.mkdirSync(OWNERS_UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(SITE_INFO_FILE)) {
    fs.writeFileSync(
      SITE_INFO_FILE,
      JSON.stringify(DEFAULT_SITE_INFO, null, 2),
      "utf-8"
    );
  }
}

export function persistOwnerImage(image: string): string {
  ensureSiteInfoFile();
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
  const filename = `owner-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}.${ext}`;
  const filePath = path.join(OWNERS_UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
  return `/uploads/owners/${filename}`;
}

export function readSiteInfo(): SiteInfoData {
  ensureSiteInfoFile();
  try {
    const raw = fs.readFileSync(SITE_INFO_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    const owners: OwnerProfile[] =
      Array.isArray(parsed?.about?.owners) && parsed.about.owners.length === 4
        ? parsed.about.owners
        : DEFAULT_SITE_INFO.about.owners;

    return {
      about: {
        ...DEFAULT_SITE_INFO.about,
        ...(parsed?.about || {}),
        owners,
      },
      contact: {
        ...DEFAULT_SITE_INFO.contact,
        ...(parsed?.contact || {}),
      },
    };
  } catch {
    return DEFAULT_SITE_INFO;
  }
}

export function writeSiteInfo(data: SiteInfoData): void {
  ensureSiteInfoFile();
  fs.writeFileSync(SITE_INFO_FILE, JSON.stringify(data, null, 2), "utf-8");
}

