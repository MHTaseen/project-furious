import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifySessionToken } from "@/lib/auth";
import {
  readCategories,
  slugifyCategory,
  writeCategories,
} from "@/lib/categories";
import { readProducts, writeProducts } from "@/lib/products";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) return null;
  const user = verifySessionToken(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET() {
  const categories = readCategories();
  return NextResponse.json({ categories }, { status: 200 });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label) {
      return NextResponse.json(
        { error: "Category name is required." },
        { status: 400 }
      );
    }

    const categories = readCategories();
    const newCategory = {
      id: `cat-${crypto.randomUUID()}`,
      label,
      slug: slugifyCategory(label),
    };

    categories.push(newCategory);
    writeCategories(categories);

    return NextResponse.json({ categories, category: newCategory }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
    const label = typeof body.label === "string" ? body.label.trim() : "";

    if (!id || !label) {
      return NextResponse.json(
        { error: "Category ID and name are required." },
        { status: 400 }
      );
    }

    const categories = readCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Category not found." },
        { status: 404 }
      );
    }

    const oldSlug = categories[idx].slug;
    const newSlug = slugifyCategory(label);
    categories[idx].label = label;
    categories[idx].slug = newSlug;
    writeCategories(categories);

    // Keep products in sync when a category is renamed
    const products = readProducts();
    let productsChanged = false;
    for (const prod of products) {
      if (prod.categorySlug.toLowerCase() === oldSlug.toLowerCase()) {
        prod.categorySlug = newSlug;
        prod.categoryLabel = label;
        productsChanged = true;
      }
    }
    if (productsChanged) {
      writeProducts(products);
    }

    return NextResponse.json(
      { categories, category: categories[idx] },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
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
        { error: "Category ID is required." },
        { status: 400 }
      );
    }

    const categories = readCategories();
    const filtered = categories.filter((c) => c.id !== id);
    writeCategories(filtered);

    return NextResponse.json({ categories: filtered }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

