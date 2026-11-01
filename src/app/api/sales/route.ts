import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySessionToken } from "@/lib/auth";
import { persistProductImages, readProducts } from "@/lib/products";
import {
  CustomSaleField,
  parseNumericPrice,
  readSales,
  SoldProductRecord,
  writeSales,
} from "@/lib/sales";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  const user = verifySessionToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

function sanitizeCustomSaleFields(raw: unknown): CustomSaleField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): CustomSaleField | null => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const label = typeof obj.label === "string" ? obj.label.trim() : "";
      const value = typeof obj.value === "string" ? obj.value.trim() : "";
      const id =
        typeof obj.id === "string" && obj.id.trim()
          ? obj.id.trim()
          : `scf-${crypto.randomUUID()}`;
      if (!label && !value) return null;
      return { id, label, value };
    })
    .filter((f): f is CustomSaleField => f !== null);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sales = readSales();
  // Sort newest sale first by date & createdAt
  const sorted = [...sales].sort((a, b) => {
    if (a.soldDate !== b.soldDate) {
      return b.soldDate.localeCompare(a.soldDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return NextResponse.json({ sales: sorted }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      productId,
      productImage,
      productName,
      productCode,
      uidNumber,
      modelNumber,
      categoryLabel,
      description,
      customFields,
      price,
      quantity,
      soldDate,
    } = body;

    let finalName = typeof productName === "string" ? productName.trim() : "";
    let finalImage =
      typeof productImage === "string" ? productImage.trim() : "";
    let finalCode = typeof productCode === "string" ? productCode.trim() : "";
    let finalUid = typeof uidNumber === "string" ? uidNumber.trim() : "";
    let finalModel = typeof modelNumber === "string" ? modelNumber.trim() : "";
    let finalCategory =
      typeof categoryLabel === "string" ? categoryLabel.trim() : "";
    let finalDesc = typeof description === "string" ? description.trim() : "";
    let finalCustomFields = sanitizeCustomSaleFields(customFields);
    let finalPriceDisplay =
      typeof price === "string" || typeof price === "number"
        ? String(price).trim()
        : "0";

    if (productId) {
      const products = readProducts();
      const matched = products.find((p) => p.id === productId);
      if (matched) {
        if (!finalName) finalName = matched.name;
        if (!finalImage) finalImage = matched.images?.[0] || "";
        if (!finalCode) finalCode = matched.productCode || "";
        if (!finalUid) finalUid = matched.uidNumber || "";
        if (!finalModel) finalModel = matched.modelNumber || "";
        if (!finalCategory) finalCategory = matched.categoryLabel || "";
        if (!finalDesc) finalDesc = matched.description || "";
        if (finalCustomFields.length === 0 && Array.isArray(matched.customFields)) {
          finalCustomFields = matched.customFields.map((cf) => ({
            id: cf.id,
            label: cf.label,
            value: cf.value,
          }));
        }
        if (!price) finalPriceDisplay = matched.price || "0";
      }
    }

    if (finalImage && finalImage.startsWith("data:image/")) {
      const persisted = persistProductImages([finalImage]);
      if (persisted[0]) finalImage = persisted[0];
    }

    const qty = Math.max(1, parseInt(String(quantity || "1"), 10) || 1);
    const numericPrice = parseNumericPrice(finalPriceDisplay);
    const todayStr = new Date().toISOString().slice(0, 10);
    const normalizedDate =
      typeof soldDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(soldDate.trim())
        ? soldDate.trim()
        : todayStr;

    const newSale: SoldProductRecord = {
      id: `sale-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      productId: productId || "",
      productImage: finalImage,
      productName: finalName || "Sold Product",
      productCode: finalCode,
      uidNumber: finalUid,
      modelNumber: finalModel,
      categoryLabel: finalCategory,
      description: finalDesc,
      customFields: finalCustomFields,
      price: numericPrice,
      priceDisplay: finalPriceDisplay,
      quantity: qty,
      soldDate: normalizedDate,
      createdAt: new Date().toISOString(),
    };

    const sales = readSales();
    sales.unshift(newSale);
    writeSales(sales);

    return NextResponse.json({ sale: newSale, sales }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      id,
      productId,
      productImage,
      productName,
      productCode,
      uidNumber,
      modelNumber,
      categoryLabel,
      description,
      customFields,
      price,
      quantity,
      soldDate,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Sale ID is required." },
        { status: 400 }
      );
    }

    const sales = readSales();
    const idx = sales.findIndex((s) => s.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Sale record not found." },
        { status: 404 }
      );
    }

    let finalImage =
      typeof productImage === "string"
        ? productImage.trim()
        : sales[idx].productImage;
    if (finalImage && finalImage.startsWith("data:image/")) {
      const persisted = persistProductImages([finalImage]);
      if (persisted[0]) finalImage = persisted[0];
    }

    const finalPriceDisplay =
      typeof price === "string" || typeof price === "number"
        ? String(price).trim()
        : sales[idx].priceDisplay;

    const qty =
      quantity !== undefined
        ? Math.max(1, parseInt(String(quantity || "1"), 10) || 1)
        : sales[idx].quantity;

    const normalizedDate =
      typeof soldDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(soldDate.trim())
        ? soldDate.trim()
        : sales[idx].soldDate;

    sales[idx] = {
      ...sales[idx],
      productId:
        typeof productId === "string" ? productId : sales[idx].productId,
      productImage: finalImage,
      productName:
        typeof productName === "string"
          ? productName.trim() || "Sold Product"
          : sales[idx].productName,
      productCode:
        typeof productCode === "string"
          ? productCode.trim()
          : sales[idx].productCode || "",
      uidNumber:
        typeof uidNumber === "string"
          ? uidNumber.trim()
          : sales[idx].uidNumber || "",
      modelNumber:
        typeof modelNumber === "string"
          ? modelNumber.trim()
          : sales[idx].modelNumber || "",
      categoryLabel:
        typeof categoryLabel === "string"
          ? categoryLabel.trim()
          : sales[idx].categoryLabel || "",
      description:
        typeof description === "string"
          ? description.trim()
          : sales[idx].description || "",
      customFields: Array.isArray(customFields)
        ? sanitizeCustomSaleFields(customFields)
        : sales[idx].customFields || [],
      price: parseNumericPrice(finalPriceDisplay),
      priceDisplay: finalPriceDisplay,
      quantity: qty,
      soldDate: normalizedDate,
    };

    writeSales(sales);
    return NextResponse.json({ sale: sales[idx], sales }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json(
        { error: "Sale ID is required." },
        { status: 400 }
      );
    }

    const sales = readSales();
    const filtered = sales.filter((s) => s.id !== id);
    writeSales(filtered);

    return NextResponse.json({ sales: filtered }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
