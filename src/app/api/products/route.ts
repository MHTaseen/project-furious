import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySessionToken } from "@/lib/auth";
import { readCategories } from "@/lib/categories";
import {
  CustomProductField,
  DEFAULT_FIELD_SETTINGS,
  persistProductImages,
  ProductFieldSettings,
  ProductRecord,
  readProducts,
  writeProducts,
} from "@/lib/products";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  const user = verifySessionToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

function sanitizeFieldSettings(
  raw: unknown,
  fallback: ProductFieldSettings = DEFAULT_FIELD_SETTINGS
): ProductFieldSettings {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const obj = raw as Record<string, unknown>;
  return {
    nameLabel:
      typeof obj.nameLabel === "string" && obj.nameLabel.trim()
        ? obj.nameLabel.trim()
        : fallback.nameLabel,
    nameVisible:
      typeof obj.nameVisible === "boolean"
        ? obj.nameVisible
        : fallback.nameVisible,
    priceLabel:
      typeof obj.priceLabel === "string" && obj.priceLabel.trim()
        ? obj.priceLabel.trim()
        : fallback.priceLabel,
    priceVisible:
      typeof obj.priceVisible === "boolean"
        ? obj.priceVisible
        : fallback.priceVisible,
    stockQuantityLabel:
      typeof obj.stockQuantityLabel === "string" &&
      obj.stockQuantityLabel.trim()
        ? obj.stockQuantityLabel.trim()
        : fallback.stockQuantityLabel || "Stock Quantity",
    stockQuantityVisible:
      typeof obj.stockQuantityVisible === "boolean"
        ? obj.stockQuantityVisible
        : fallback.stockQuantityVisible ?? true,
    productCodeLabel:
      typeof obj.productCodeLabel === "string" && obj.productCodeLabel.trim()
        ? obj.productCodeLabel.trim()
        : fallback.productCodeLabel,
    productCodeVisible:
      typeof obj.productCodeVisible === "boolean"
        ? obj.productCodeVisible
        : fallback.productCodeVisible,
    uidNumberLabel:
      typeof obj.uidNumberLabel === "string" && obj.uidNumberLabel.trim()
        ? obj.uidNumberLabel.trim()
        : fallback.uidNumberLabel,
    uidNumberVisible:
      typeof obj.uidNumberVisible === "boolean"
        ? obj.uidNumberVisible
        : fallback.uidNumberVisible,
    modelNumberLabel:
      typeof obj.modelNumberLabel === "string" && obj.modelNumberLabel.trim()
        ? obj.modelNumberLabel.trim()
        : fallback.modelNumberLabel,
    modelNumberVisible:
      typeof obj.modelNumberVisible === "boolean"
        ? obj.modelNumberVisible
        : fallback.modelNumberVisible,
    descriptionLabel:
      typeof obj.descriptionLabel === "string" && obj.descriptionLabel.trim()
        ? obj.descriptionLabel.trim()
        : fallback.descriptionLabel,
    descriptionVisible:
      typeof obj.descriptionVisible === "boolean"
        ? obj.descriptionVisible
        : fallback.descriptionVisible,
  };
}

function sanitizeCustomFields(raw: unknown): CustomProductField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): CustomProductField | null => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const label = typeof obj.label === "string" ? obj.label.trim() : "";
      const value = typeof obj.value === "string" ? obj.value.trim() : "";
      const id =
        typeof obj.id === "string" && obj.id.trim()
          ? obj.id.trim()
          : `cf-${crypto.randomUUID()}`;
      const visibleToCustomer =
        typeof obj.visibleToCustomer === "boolean"
          ? obj.visibleToCustomer
          : true;
      if (!label && !value) return null;
      return { id, label, value, visibleToCustomer };
    })
    .filter((f): f is CustomProductField => f !== null);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("categorySlug")?.trim().toLowerCase();

  const products = readProducts();
  const filtered = categorySlug
    ? products.filter((p) => p.categorySlug.toLowerCase() === categorySlug)
    : products;

  return NextResponse.json({ products: filtered }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const categories = readCategories();
    const products = readProducts();
    const now = new Date().toISOString();

    // Support Bulk / Multi-Product Creation in a single submission (`body.products` array)
    if (Array.isArray(body.products)) {
      if (body.products.length === 0) {
        return NextResponse.json(
          { error: "Please add at least one product to publish." },
          { status: 400 }
        );
      }

      const createdBatch: ProductRecord[] = [];
      for (const rawItem of body.products) {
        if (!rawItem || typeof rawItem !== "object") continue;
        const item = rawItem as Record<string, unknown>;
        const catSlug =
          typeof item.categorySlug === "string"
            ? item.categorySlug.trim()
            : typeof body.categorySlug === "string"
            ? body.categorySlug.trim()
            : "";
        if (!catSlug) continue;

        const matchedCat = categories.find(
          (c) => c.slug.toLowerCase() === catSlug.toLowerCase()
        );
        const catLabel =
          matchedCat?.label ||
          (typeof item.categoryLabel === "string" &&
            item.categoryLabel.trim()) ||
          catSlug;

        const rawImages = Array.isArray(item.images) ? item.images : [];
        const savedImages = persistProductImages(rawImages);
        const fieldSettings = sanitizeFieldSettings(item.fieldSettings);
        const customFields = sanitizeCustomFields(item.customFields);

        const parsedStock =
          item.stockQuantity !== undefined && item.stockQuantity !== ""
            ? Math.max(0, parseInt(String(item.stockQuantity), 10) || 0)
            : 0;

        const newProd: ProductRecord = {
          id: `prod-${crypto.randomUUID()}`,
          categorySlug: matchedCat ? matchedCat.slug : catSlug,
          categoryLabel: catLabel,
          images: savedImages,
          name: typeof item.name === "string" ? item.name.trim() : "",
          productCode:
            typeof item.productCode === "string" ? item.productCode.trim() : "",
          uidNumber:
            typeof item.uidNumber === "string" ? item.uidNumber.trim() : "",
          modelNumber:
            typeof item.modelNumber === "string" ? item.modelNumber.trim() : "",
          description:
            typeof item.description === "string" ? item.description.trim() : "",
          price:
            typeof item.price === "string" || typeof item.price === "number"
              ? String(item.price).trim()
              : "",
          stockQuantity: parsedStock,
          fieldSettings,
          customFields,
          createdAt: now,
          updatedAt: now,
        };

        createdBatch.push(newProd);
      }

      if (createdBatch.length === 0) {
        return NextResponse.json(
          { error: "Category is required for each product." },
          { status: 400 }
        );
      }

      products.unshift(...createdBatch);
      writeProducts(products);

      return NextResponse.json(
        {
          createdProducts: createdBatch,
          product: createdBatch[0],
          products,
        },
        { status: 201 }
      );
    }

    // Single Product Creation fallback
    const categorySlug =
      typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const productCode =
      typeof body.productCode === "string" ? body.productCode.trim() : "";
    const uidNumber =
      typeof body.uidNumber === "string" ? body.uidNumber.trim() : "";
    const modelNumber =
      typeof body.modelNumber === "string" ? body.modelNumber.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const price =
      typeof body.price === "string" || typeof body.price === "number"
        ? String(body.price).trim()
        : "";

    if (!categorySlug) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 }
      );
    }

    const matchedCat = categories.find(
      (c) => c.slug.toLowerCase() === categorySlug.toLowerCase()
    );
    const categoryLabel =
      matchedCat?.label ||
      (typeof body.categoryLabel === "string" && body.categoryLabel.trim()) ||
      categorySlug;

    const rawImages = Array.isArray(body.images) ? body.images : [];
    const savedImages = persistProductImages(rawImages);
    const fieldSettings = sanitizeFieldSettings(body.fieldSettings);
    const customFields = sanitizeCustomFields(body.customFields);

    const singleStock =
      body.stockQuantity !== undefined && body.stockQuantity !== ""
        ? Math.max(0, parseInt(String(body.stockQuantity), 10) || 0)
        : 0;

    const newProduct: ProductRecord = {
      id: `prod-${crypto.randomUUID()}`,
      categorySlug: matchedCat ? matchedCat.slug : categorySlug,
      categoryLabel,
      images: savedImages,
      name,
      productCode,
      uidNumber,
      modelNumber,
      description,
      price,
      stockQuantity: singleStock,
      fieldSettings,
      customFields,
      createdAt: now,
      updatedAt: now,
    };

    products.unshift(newProduct);
    writeProducts(products);

    return NextResponse.json(
      { product: newProduct, products },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid product data payload." },
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
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const products = readProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    // Fast Stock Quantity Add / Deduct action (`action: "adjust_stock"`)
    if (body.action === "adjust_stock") {
      const currentQty =
        typeof products[idx].stockQuantity === "number"
          ? products[idx].stockQuantity!
          : 0;
      let nextQty = currentQty;

      if (typeof body.delta === "number") {
        nextQty = Math.max(0, currentQty + body.delta);
      } else if (body.stockQuantity !== undefined) {
        nextQty = Math.max(0, parseInt(String(body.stockQuantity), 10) || 0);
      }

      products[idx] = {
        ...products[idx],
        stockQuantity: nextQty,
        updatedAt: new Date().toISOString(),
      };
      writeProducts(products);

      return NextResponse.json(
        { product: products[idx], products },
        { status: 200 }
      );
    }

    const categorySlug =
      typeof body.categorySlug === "string" && body.categorySlug.trim()
        ? body.categorySlug.trim()
        : products[idx].categorySlug;

    const categories = readCategories();
    const matchedCat = categories.find(
      (c) => c.slug.toLowerCase() === categorySlug.toLowerCase()
    );
    const categoryLabel =
      matchedCat?.label ||
      (typeof body.categoryLabel === "string" && body.categoryLabel.trim()) ||
      products[idx].categoryLabel;

    const name =
      typeof body.name === "string" ? body.name.trim() : products[idx].name;
    const productCode =
      typeof body.productCode === "string"
        ? body.productCode.trim()
        : products[idx].productCode;
    const uidNumber =
      typeof body.uidNumber === "string"
        ? body.uidNumber.trim()
        : products[idx].uidNumber;
    const modelNumber =
      typeof body.modelNumber === "string"
        ? body.modelNumber.trim()
        : products[idx].modelNumber;
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : products[idx].description;
    const price =
      typeof body.price === "string" || typeof body.price === "number"
        ? String(body.price).trim()
        : products[idx].price;

    const rawImages = Array.isArray(body.images)
      ? body.images
      : products[idx].images;
    const savedImages = persistProductImages(rawImages);
    const fieldSettings = sanitizeFieldSettings(
      body.fieldSettings,
      products[idx].fieldSettings || DEFAULT_FIELD_SETTINGS
    );
    const customFields = Array.isArray(body.customFields)
      ? sanitizeCustomFields(body.customFields)
      : products[idx].customFields;

    const updatedStock =
      body.stockQuantity !== undefined && body.stockQuantity !== ""
        ? Math.max(0, parseInt(String(body.stockQuantity), 10) || 0)
        : typeof products[idx].stockQuantity === "number"
        ? products[idx].stockQuantity
        : 0;

    products[idx] = {
      ...products[idx],
      categorySlug: matchedCat ? matchedCat.slug : categorySlug,
      categoryLabel,
      images: savedImages,
      name,
      productCode,
      uidNumber,
      modelNumber,
      description,
      price,
      stockQuantity: updatedStock,
      fieldSettings,
      customFields,
      updatedAt: new Date().toISOString(),
    };

    writeProducts(products);

    return NextResponse.json(
      { product: products[idx], products },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid product update payload." },
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
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const products = readProducts();
    const filtered = products.filter((p) => p.id !== id);
    writeProducts(filtered);

    return NextResponse.json({ products: filtered }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
