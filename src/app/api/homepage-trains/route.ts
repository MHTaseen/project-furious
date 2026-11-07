import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import {
  BrandLogoItem,
  ShowcaseImageItem,
  persistTrainImage,
  readHomepageTrains,
  writeHomepageTrains,
} from "@/lib/homepageTrains";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  const user = verifySessionToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const data = readHomepageTrains();
  return NextResponse.json(data, { status: 200, headers: noCacheHeaders });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Forbidden: Admin privileges required." },
      { status: 403, headers: noCacheHeaders }
    );
  }

  try {
    const body = await request.json();
    const current = readHomepageTrains();

    let nextBrandLogos = current.brandLogos;
    if (Array.isArray(body.brandLogos)) {
      nextBrandLogos = body.brandLogos.map((item: Partial<BrandLogoItem>, idx: number) => {
        const id = item.id || `brand-${Date.now()}-${idx}`;
        const name = typeof item.name === "string" ? item.name.trim() : `Brand ${idx + 1}`;
        const rawSrc = typeof item.src === "string" ? item.src.trim() : "";
        const finalSrc = persistTrainImage(rawSrc, "brand");
        return {
          id,
          name: name || "Brand",
          src: finalSrc || "/images/furious-logo.jpg",
        };
      });
    }

    let nextShowcaseImages = current.showcaseImages;
    if (Array.isArray(body.showcaseImages)) {
      nextShowcaseImages = body.showcaseImages.map(
        (item: Partial<ShowcaseImageItem>, idx: number) => {
          const id = item.id || `showcase-${Date.now()}-${idx}`;
          const alt = typeof item.alt === "string" ? item.alt.trim() : `Showcase ${idx + 1}`;
          const rawSrc = typeof item.src === "string" ? item.src.trim() : "";
          const finalSrc = persistTrainImage(rawSrc, "showcase");
          return {
            id,
            alt: alt || "Showcase Item",
            src: finalSrc || "/images/furious-logo.jpg",
          };
        }
      );
    }

    const updatedData = {
      brandLogos: nextBrandLogos,
      showcaseImages: nextShowcaseImages,
    };

    writeHomepageTrains(updatedData);

    return NextResponse.json(
      { success: true, ...updatedData, message: "Homepage trains updated successfully!" },
      { status: 200, headers: noCacheHeaders }
    );
  } catch (err) {
    console.error("Homepage trains PUT error:", err);
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400, headers: noCacheHeaders }
    );
  }
}

