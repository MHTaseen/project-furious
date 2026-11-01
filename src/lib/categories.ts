import fs from "fs";
import path from "path";

export interface CategoryItem {
  id: string;
  label: string;
  slug: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat-1", label: "Helmets", slug: "helmets" },
  { id: "cat-2", label: "Engine Oil", slug: "engine-oil" },
  { id: "cat-3", label: "Fog Lights", slug: "fog-lights" },
  { id: "cat-4", label: "Head Lights", slug: "head-lights" },
  { id: "cat-5", label: "Wind Breakers", slug: "wind-breakers" },
  { id: "cat-6", label: "Gloves", slug: "gloves" },
  { id: "cat-7", label: "Safety Guards", slug: "safety-guards" },
  { id: "cat-8", label: "Oil Additives", slug: "oil-additives" },
  { id: "cat-9", label: "Stock Parts", slug: "stock-parts" },
  { id: "cat-10", label: "Body Kits", slug: "body-kits" },
  { id: "cat-11", label: "Security System", slug: "security-system" },
  { id: "cat-12", label: "Modification Items", slug: "modification-items" },
];

export function slugifyCategory(label: string): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `category-${Date.now()}`
  );
}

function ensureCategoriesFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CATEGORIES_FILE)) {
    fs.writeFileSync(
      CATEGORIES_FILE,
      JSON.stringify(DEFAULT_CATEGORIES, null, 2),
      "utf-8"
    );
  }
}

export function readCategories(): CategoryItem[] {
  ensureCategoriesFile();
  try {
    const raw = fs.readFileSync(CATEGORIES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function writeCategories(categories: CategoryItem[]): void {
  ensureCategoriesFile();
  fs.writeFileSync(
    CATEGORIES_FILE,
    JSON.stringify(categories, null, 2),
    "utf-8"
  );
}

