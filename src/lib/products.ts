import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface CustomProductField {
  id: string;
  label: string;
  value: string;
  visibleToCustomer?: boolean;
}

export interface ProductFieldSettings {
  nameLabel: string;
  nameVisible: boolean;
  nameDeleted?: boolean;
  priceLabel: string;
  priceVisible: boolean;
  priceDeleted?: boolean;
  stockQuantityLabel?: string;
  stockQuantityVisible?: boolean;
  stockQuantityDeleted?: boolean;
  productCodeLabel: string;
  productCodeVisible: boolean;
  productCodeDeleted?: boolean;
  uidNumberLabel: string;
  uidNumberVisible: boolean;
  uidNumberDeleted?: boolean;
  modelNumberLabel: string;
  modelNumberVisible: boolean;
  modelNumberDeleted?: boolean;
  descriptionLabel: string;
  descriptionVisible: boolean;
  descriptionDeleted?: boolean;
}

export const DEFAULT_FIELD_SETTINGS: ProductFieldSettings = {
  nameLabel: "Product Name",
  nameVisible: true,
  nameDeleted: false,
  priceLabel: "Price",
  priceVisible: true,
  priceDeleted: false,
  stockQuantityLabel: "Stock Quantity",
  stockQuantityVisible: true,
  stockQuantityDeleted: false,
  productCodeLabel: "Product Code",
  productCodeVisible: true,
  productCodeDeleted: false,
  uidNumberLabel: "UID Number",
  uidNumberVisible: true,
  uidNumberDeleted: false,
  modelNumberLabel: "Model Number",
  modelNumberVisible: true,
  modelNumberDeleted: false,
  descriptionLabel: "Description",
  descriptionVisible: true,
  descriptionDeleted: false,
};

export interface ProductRecord {
  id: string;
  categorySlug: string;
  categoryLabel: string;
  brand?: string;
  images: string[];
  name: string;
  productCode: string;
  uidNumber: string;
  modelNumber: string;
  description: string;
  price: string;
  stockQuantity?: number;
  fieldSettings?: ProductFieldSettings;
  customFields: CustomProductField[];
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "products");

function ensureProductsFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function readProducts(): ProductRecord[] {
  ensureProductsFile();
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeProducts(products: ProductRecord[]): void {
  ensureProductsFile();
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
}

/**
 * Saves base64 data URL images to public/uploads/products/ and returns public URL paths.
 * Existing public URL paths (e.g. "/uploads/products/...") are preserved as-is.
 */
export function persistProductImages(images: unknown[]): string[] {
  ensureProductsFile();
  const savedPaths: string[] = [];

  for (const item of images) {
    if (typeof item !== "string" || !item.trim()) continue;
    const trimmed = item.trim();

    if (trimmed.startsWith("data:image/")) {
      const match = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const extRaw = match[1].toLowerCase();
        const ext =
          extRaw === "jpeg"
            ? "jpg"
            : extRaw === "svg+xml"
            ? "svg"
            : extRaw.replace(/[^a-z0-9]/g, "") || "png";
        const base64Data = match[2];
        const filename = `prod-${Date.now()}-${crypto
          .randomBytes(4)
          .toString("hex")}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
        savedPaths.push(`/uploads/products/${filename}`);
      }
    } else {
      savedPaths.push(trimmed);
    }
  }

  return savedPaths;
}
