import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readUsers } from "@/lib/auth";
import { readProducts } from "@/lib/products";
import { readCategories } from "@/lib/categories";

const DATA_DIR = path.join(process.cwd(), "data");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

interface StatsData {
  reviews: number[]; // list of star ratings (1-5)
}

function readStats(): StatsData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATS_FILE)) {
    const initial: StatsData = { reviews: [] };
    fs.writeFileSync(STATS_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(STATS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch {
    return { reviews: [] };
  }
}

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const users = readUsers();
  // Count only non-admin customer accounts
  const customersCount = users.filter((u) => u.role !== "admin").length;

  const stats = readStats();
  const reviewsCount = stats.reviews.length;
  const averageRating =
    reviewsCount > 0
      ? stats.reviews.reduce((sum, r) => sum + Number(r || 0), 0) / reviewsCount
      : 0;

  // 1. Automatically calculate total products quantity in stock across all products
  const products = readProducts();
  const inStockCount = products.reduce((sum, p) => {
    // If a product has an explicit stockQuantity > 0, sum that; otherwise count 1 per added product
    const qty =
      typeof p.stockQuantity === "number" && p.stockQuantity > 0
        ? p.stockQuantity
        : 1;
    return sum + qty;
  }, 0);

  // 2. Automatically calculate total number of product categories
  const categories = readCategories();
  const categoriesCount = categories.length;

  return NextResponse.json(
    {
      customersCount,
      inStockCount,
      categoriesCount,
      averageRating: Math.min(5, Math.max(0, averageRating)),
      reviewsCount,
    },
    { status: 200, headers: noCacheHeaders }
  );
}
