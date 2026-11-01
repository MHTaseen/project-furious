import fs from "fs";
import path from "path";

export interface CustomSaleField {
  id: string;
  label: string;
  value: string;
}

export interface SoldProductRecord {
  id: string;
  productId: string;
  productImage: string;
  productName: string;
  productCode: string;
  uidNumber: string;
  modelNumber: string;
  categoryLabel: string;
  description: string;
  customFields: CustomSaleField[];
  price: number;
  priceDisplay: string;
  quantity: number;
  soldDate: string; // ISO date YYYY-MM-DD (used for filtering & formatted as DD/MM/YYYY)
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SALES_FILE = path.join(DATA_DIR, "sales.json");

function ensureSalesFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SALES_FILE)) {
    fs.writeFileSync(SALES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function readSales(): SoldProductRecord[] {
  ensureSalesFile();
  try {
    const raw = fs.readFileSync(SALES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeSales(sales: SoldProductRecord[]): void {
  ensureSalesFile();
  fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2), "utf-8");
}

export function parseNumericPrice(priceStr: string | number): number {
  if (typeof priceStr === "number") return isNaN(priceStr) ? 0 : priceStr;
  if (!priceStr || typeof priceStr !== "string") return 0;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
