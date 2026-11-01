import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { readUsers } from "@/lib/auth";
import { readSales } from "@/lib/sales";

const DATA_DIR = path.join(process.cwd(), "data");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

interface StatsData {
  soldProducts: number;
  reviews: number[]; // list of star ratings (1-5)
}

function readStats(): StatsData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATS_FILE)) {
    const initial: StatsData = { soldProducts: 0, reviews: [] };
    fs.writeFileSync(STATS_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(STATS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      soldProducts:
        typeof parsed.soldProducts === "number" ? parsed.soldProducts : 0,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch {
    return { soldProducts: 0, reviews: [] };
  }
}

export async function GET() {
  const users = readUsers();
  // Count only non-admin customer accounts
  const customersCount = users.filter((u) => u.role !== "admin").length;

  const stats = readStats();
  const sales = readSales();
  const totalFromSalesRecords = sales.reduce(
    (sum, s) => sum + (Number(s.quantity) || 1),
    0
  );
  const soldProductsCount =
    sales.length > 0 ? totalFromSalesRecords : stats.soldProducts;

  const reviewsCount = stats.reviews.length;
  const averageRating =
    reviewsCount > 0
      ? stats.reviews.reduce((sum, r) => sum + Number(r || 0), 0) / reviewsCount
      : 0;

  return NextResponse.json(
    {
      customersCount,
      soldProducts: soldProductsCount,
      averageRating: Math.min(5, Math.max(0, averageRating)),
      reviewsCount,
    },
    { status: 200 }
  );
}

