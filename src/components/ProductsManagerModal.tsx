"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export const BRAND_OPTIONS = [
  "Liqui Moly",
  "Motul",
  "Repsol",
  "Motocare",
  "RCB",
  "Flamingo",
  "Faito",
];

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
  stockQuantityLabel: "Available Stock",
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

export interface ProductItem {
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

interface CategoryOption {
  id: string;
  label: string;
  slug: string;
}

interface ProductDraft {
  draftId: string;
  categorySlug: string;
  brand: string;
  images: string[];
  name: string;
  productCode: string;
  uidNumber: string;
  modelNumber: string;
  description: string;
  price: string;
  stockQuantity: number;
  fieldSettings: ProductFieldSettings;
  customFields: CustomProductField[];
}

interface ProductsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, scopes the modal to this specific category (opened from Category Drawer) */
  categorySlug?: string | null;
  categoryLabel?: string | null;
  /** If provided, pre-fills the Brand field when adding products from a Brand popup */
  defaultBrand?: string | null;
}

function createEmptyDraft(
  defaultCategorySlug: string,
  defaultBrand: string = ""
): ProductDraft {
  return {
    draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categorySlug: defaultCategorySlug,
    brand: defaultBrand,
    images: [],
    name: "",
    productCode: "",
    uidNumber: "",
    modelNumber: "",
    description: "",
    price: "",
    stockQuantity: 1,
    fieldSettings: { ...DEFAULT_FIELD_SETTINGS },
    customFields: [],
  };
}

export default function ProductsManagerModal({
  isOpen,
  onClose,
  categorySlug = null,
  categoryLabel = null,
  defaultBrand = null,
}: ProductsManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"form" | "list">(
    categorySlug || defaultBrand ? "form" : "list"
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected product for editing or full-screen inspection
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null
  );
  const [viewingProduct, setViewingProduct] = useState<ProductItem | null>(
    null
  );
  const [activeViewImageIdx, setActiveViewImageIdx] = useState<number>(0);
  // Custom step amount for adding or deducting stock per product
  const [stockStepMap, setStockStepMap] = useState<Record<string, string>>({});

  // Enlarged image popup state when Admin clicks an uploaded image in the form to inspect it for product description
  const [enlargedDraftImage, setEnlargedDraftImage] = useState<{
    draftId: string;
    imageIndex: number;
  } | null>(null);
  const [enlargedZoomed, setEnlargedZoomed] = useState<boolean>(false);

  // Multi-product drafts array so Admin can add as many products as they want in a single time
  const [drafts, setDrafts] = useState<ProductDraft[]>([
    createEmptyDraft(categorySlug || "", defaultBrand || ""),
  ]);

  const resetForm = (defaultCatSlug?: string) => {
    setEditingProduct(null);
    setEnlargedDraftImage(null);
    setEnlargedZoomed(false);
    const resolvedCat =
      defaultCatSlug ?? categorySlug ?? (categories[0]?.slug || "");
    setDrafts([createEmptyDraft(resolvedCat, defaultBrand || "")]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/categories"),
        fetch(
          categorySlug
            ? `/api/products?categorySlug=${encodeURIComponent(categorySlug)}`
            : "/api/products"
        ),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();

      if (Array.isArray(catData?.categories)) {
        setCategories(catData.categories);
        const firstSlug = catData.categories[0]?.slug || "";
        setDrafts((prev) =>
          prev.map((d) =>
            !d.categorySlug
              ? { ...d, categorySlug: categorySlug || firstSlug }
              : d
          )
        );
      }
      if (Array.isArray(prodData?.products)) {
        setProducts(prodData.products);
      }
    } catch {
      setError("Failed to load products data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setViewingProduct(null);
      setEditingProduct(null);
      setEnlargedDraftImage(null);
      setEnlargedZoomed(false);
      setFilterCategory("all");
      setActiveTab(categorySlug || defaultBrand ? "form" : "list");
      resetForm(categorySlug || undefined);
      loadData();
    }
  }, [isOpen, categorySlug, defaultBrand]);

  if (!isOpen) return null;

  // Helpers to update a specific draft in the `drafts` list
  const updateDraft = (
    draftId: string,
    updater: (draft: ProductDraft) => ProductDraft
  ) => {
    setDrafts((prev) =>
      prev.map((d) => (d.draftId === draftId ? updater(d) : d))
    );
  };

  const handleAddAnotherProductSlot = () => {
    const defaultCat =
      categorySlug ||
      drafts[drafts.length - 1]?.categorySlug ||
      categories[0]?.slug ||
      "";
    const inheritedBrand =
      defaultBrand || drafts[drafts.length - 1]?.brand || "";
    setDrafts((prev) => [
      ...prev,
      createEmptyDraft(defaultCat, inheritedBrand),
    ]);
  };

  const handleDuplicateDraft = (draft: ProductDraft) => {
    setDrafts((prev) => [
      ...prev,
      {
        ...draft,
        draftId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        images: [...draft.images],
        fieldSettings: { ...draft.fieldSettings },
        customFields: draft.customFields.map((cf) => ({
          ...cf,
          id: `cf-${Date.now()}-${Math.random()}`,
        })),
      },
    ]);
  };

  const handleRemoveDraftSlot = (draftId: string) => {
    if (drafts.length <= 1) return;
    setDrafts((prev) => prev.filter((d) => d.draftId !== draftId));
  };

  const handleDraftImageFilesSelected = (
    draftId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const dataUrl = reader.result;
          updateDraft(draftId, (d) => ({
            ...d,
            images: [...d.images, dataUrl],
          }));
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleRemoveDraftImage = (draftId: string, imageIdx: number) => {
    updateDraft(draftId, (d) => ({
      ...d,
      images: d.images.filter((_, idx) => idx !== imageIdx),
    }));
  };

  const handleUpdateDraftFieldSetting = <K extends keyof ProductFieldSettings>(
    draftId: string,
    key: K,
    value: ProductFieldSettings[K]
  ) => {
    updateDraft(draftId, (d) => ({
      ...d,
      fieldSettings: {
        ...d.fieldSettings,
        [key]: value,
      },
    }));
  };

  const handleAddDraftCustomField = (draftId: string) => {
    updateDraft(draftId, (d) => ({
      ...d,
      customFields: [
        ...d.customFields,
        {
          id: `cf-${Date.now()}-${Math.random()}`,
          label: "",
          value: "",
          visibleToCustomer: true,
        },
      ],
    }));
  };

  const handleUpdateDraftCustomField = (
    draftId: string,
    fieldId: string,
    key: "label" | "value" | "visibleToCustomer",
    val: string | boolean
  ) => {
    updateDraft(draftId, (d) => ({
      ...d,
      customFields: d.customFields.map((f) =>
        f.id === fieldId ? { ...f, [key]: val } : f
      ),
    }));
  };

  const handleRemoveDraftCustomField = (draftId: string, fieldId: string) => {
    updateDraft(draftId, (d) => ({
      ...d,
      customFields: d.customFields.filter((f) => f.id !== fieldId),
    }));
  };

  const handleStartEditProduct = (product: ProductItem) => {
    setError(null);
    setSuccessMsg(null);
    setViewingProduct(null);
    setEnlargedDraftImage(null);
    setEnlargedZoomed(false);
    setEditingProduct(product);
    setDrafts([
      {
        draftId: `edit-${product.id}`,
        categorySlug: product.categorySlug,
        brand: product.brand || "",
        images: product.images || [],
        name: product.name || "",
        productCode: product.productCode || "",
        uidNumber: product.uidNumber || "",
        modelNumber: product.modelNumber || "",
        description: product.description || "",
        price: product.price || "",
        stockQuantity:
          typeof product.stockQuantity === "number"
            ? Math.max(0, product.stockQuantity)
            : 0,
        fieldSettings: {
          ...DEFAULT_FIELD_SETTINGS,
          ...(product.fieldSettings || {}),
        },
        customFields: Array.isArray(product.customFields)
          ? product.customFields.map((cf) => ({
            ...cf,
            visibleToCustomer:
              typeof cf.visibleToCustomer === "boolean"
                ? cf.visibleToCustomer
                : true,
          }))
          : [],
      },
    ]);
    setActiveTab("form");
  };

  const handleAdjustProductStock = async (productId: string, delta: number) => {
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productId,
          action: "adjust_stock",
          delta,
        }),
      });
      const data = await res.json();
      if (res.ok && data.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? data.product : p))
        );
        setViewingProduct((prev) =>
          prev && prev.id === productId ? data.product : prev
        );
        setEditingProduct((prev) =>
          prev && prev.id === productId ? data.product : prev
        );
        window.dispatchEvent(new Event("furious-products-change"));
      } else {
        setError(data.error || "Failed to adjust stock quantity.");
      }
    } catch {
      setError("Network error while adjusting stock quantity.");
    }
  };

  const handleSubmitProducts = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (drafts.length === 0) return;

    // Validate category for each draft
    for (let i = 0; i < drafts.length; i++) {
      const targetCat = categorySlug || drafts[i].categorySlug;
      if (!targetCat) {
        setError(`Please select a category for Product #${i + 1}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const isEditing = Boolean(editingProduct);

      if (isEditing && editingProduct) {
        const draft = drafts[0];
        const targetCategorySlug = categorySlug || draft.categorySlug;
        const matchedCat = categories.find(
          (c) => c.slug === targetCategorySlug
        );

        const res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProduct.id,
            categorySlug: targetCategorySlug,
            categoryLabel:
              matchedCat?.label || categoryLabel || targetCategorySlug,
            brand: draft.brand,
            images: draft.images,
            name: draft.name,
            productCode: draft.productCode,
            uidNumber: draft.uidNumber,
            modelNumber: draft.modelNumber,
            description: draft.description,
            price: draft.price,
            stockQuantity: Math.max(0, Math.floor(Number(draft.stockQuantity) || 0)),
            fieldSettings: draft.fieldSettings,
            customFields: draft.customFields,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update product.");
        } else {
          setSuccessMsg("Product updated successfully!");
          await loadData();
          window.dispatchEvent(new Event("furious-products-change"));
          if (data.product) {
            setEditingProduct(data.product);
          }
        }
      } else {
        // Publish 1 or multiple products at once!
        const payloadProducts = drafts.map((d) => {
          const targetCategorySlug = categorySlug || d.categorySlug;
          const matchedCat = categories.find(
            (c) => c.slug === targetCategorySlug
          );
          return {
            categorySlug: targetCategorySlug,
            categoryLabel:
              matchedCat?.label || categoryLabel || targetCategorySlug,
            brand: d.brand,
            images: d.images,
            name: d.name,
            productCode: d.productCode,
            uidNumber: d.uidNumber,
            modelNumber: d.modelNumber,
            description: d.description,
            price: d.price,
            stockQuantity: Math.max(0, Math.floor(Number(d.stockQuantity) || 0)),
            fieldSettings: d.fieldSettings,
            customFields: d.customFields,
          };
        });

        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: payloadProducts,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to publish products.");
        } else {
          const count = payloadProducts.length;
          setSuccessMsg(
            count > 1
              ? `${count} products published at once successfully!`
              : "Product published successfully!"
          );
          await loadData();
          window.dispatchEvent(new Event("furious-products-change"));
          resetForm(categorySlug || undefined);
        }
      }
    } catch {
      setError("Network error while saving products.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });
      if (res.ok) {
        setSuccessMsg("Product deleted successfully.");
        if (editingProduct?.id === productId) {
          resetForm(categorySlug || undefined);
        }
        if (viewingProduct?.id === productId) {
          setViewingProduct(null);
        }
        await loadData();
        window.dispatchEvent(new Event("furious-products-change"));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete product.");
      }
    } catch {
      setError("Network error while deleting product.");
    } finally {
      setSaving(false);
    }
  };

  const displayedProducts =
    !categorySlug && filterCategory !== "all"
      ? products.filter((p) => p.categorySlug === filterCategory)
      : products;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "#111114",
            border: "1.5px solid rgba(255, 30, 39, 0.65)",
            boxShadow: "0 0 40px rgba(255, 30, 39, 0.25)",
            maxHeight: "92vh",
          }}
          className="relative w-full max-w-4xl p-6 sm:p-8 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
            className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 shrink-0"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-glossy-gold">
                {categorySlug
                  ? `${categoryLabel || categorySlug} — Products`
                  : "All Products Manager"}
              </h3>
              {categorySlug && (
                <Link
                  href={`/category/${categorySlug}`}
                  onClick={onClose}
                  style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                  className="px-2.5 py-1 text-[11px] uppercase tracking-wider bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold"
                >
                  View Page ↗
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
              className="w-8 h-8 flex items-center justify-center bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Mode Switch Tabs: Publish/Edit Product(s) vs Products List */}
          <div className="auth-toggle-container shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewingProduct(null);
                setError(null);
                setSuccessMsg(null);
                setActiveTab("form");
              }}
              className={`auth-toggle-btn ${activeTab === "form" ? "active" : "inactive"
                }`}
            >
              <span className="text-glossy-gold">
                {editingProduct
                  ? "Modify Product"
                  : `+ Publish Products (${drafts.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewingProduct(null);
                setError(null);
                setSuccessMsg(null);
                setActiveTab("list");
              }}
              className={`auth-toggle-btn ${activeTab === "list" ? "active" : "inactive"
                }`}
            >
              <span className="text-glossy-gold">
                {categorySlug
                  ? `Category Products (${products.length})`
                  : `All Products (${products.length})`}
              </span>
            </button>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-3 border border-red-500/60 bg-red-950/40 text-xs text-red-200 shrink-0">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 border border-[#FF1E27]/60 bg-[#FF1E27]/15 text-xs text-glossy-gold shrink-0">
              {successMsg}
            </div>
          )}

          {/* TAB 1: PUBLISH MULTIPLE PRODUCTS AT ONCE / MODIFY PRODUCT FORM */}
          {activeTab === "form" && (
            <form
              onSubmit={handleSubmitProducts}
              className="flex-1 overflow-y-auto pr-1 space-y-6"
            >
              {editingProduct ? (
                <div className="flex items-center justify-between p-3 bg-[#1A1215] border border-[#FF1E27]/45 text-xs">
                  <span className="text-glossy-gold">
                    Modifying: <strong>{editingProduct.name || "Product"}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => resetForm(categorySlug || undefined)}
                    className="px-2.5 py-1 border border-[#FF1E27]/50 bg-[#0B0B0C] text-glossy-gold cursor-pointer"
                  >
                    + Switch to Multi-Product Publish Mode
                  </button>
                </div>
              ) : (
                /* Top Multi-Product Toolbar so Admin can add as many products as they want in a single time */
                <div className="p-3.5 bg-[#0B0B0C] border border-[#00D4FF]/50 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-glossy-gold">
                      Batch Product Publisher — {drafts.length}{" "}
                      {drafts.length === 1 ? "Product" : "Products"} Queued
                    </p>
                    <p
                      style={{ color: "#9CA3AF" }}
                      className="text-[11px] mt-0.5"
                    >
                      Add as many products as you want below and publish all of
                      them in a single click.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAnotherProductSlot}
                    style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold shadow-[0_0_12px_rgba(255,30,39,0.25)] cursor-pointer"
                  >
                    + Add Another Product
                  </button>
                </div>
              )}

              {/* Render Each Product Form Card in the Batch */}
              <div className="space-y-6">
                {drafts.map((draft, draftIndex) => (
                  <div
                    key={draft.draftId}
                    style={{
                      backgroundColor: "#0E0E12",
                      border: "1.5px solid rgba(255, 30, 39, 0.55)",
                    }}
                    className="p-4 sm:p-5 space-y-4"
                  >
                    {/* Product Slot Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#00D4FF]/35">
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold">
                        {editingProduct
                          ? "Product Information"
                          : `Product #${draftIndex + 1}${draft.name ? ` — ${draft.name}` : ""
                          }`}
                      </span>

                      {!editingProduct && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDuplicateDraft(draft)}
                            style={{
                              border: "1px solid rgba(255, 30, 39, 0.5)",
                            }}
                            className="px-2.5 py-1 text-[11px] uppercase tracking-wider bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                          >
                            Duplicate Product
                          </button>

                          {drafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveDraftSlot(draft.draftId)
                              }
                              style={{
                                border: "1px solid rgba(255, 80, 80, 0.6)",
                              }}
                              className="px-2.5 py-1 text-[11px] uppercase tracking-wider bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                            >
                              ✕ Remove Product #{draftIndex + 1}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Category & Brand Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {(!categorySlug || editingProduct) && (
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                            Category
                          </label>
                          <select
                            required
                            value={draft.categorySlug}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                categorySlug: e.target.value,
                              }))
                            }
                            className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          >
                            <option value="" disabled>
                              Select a category
                            </option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.slug}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div
                        className={
                          categorySlug && !editingProduct ? "sm:col-span-2" : ""
                        }
                      >
                        <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                          Brand (For Home Page Brand Logo Train — Optional)
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={
                              BRAND_OPTIONS.includes(draft.brand)
                                ? draft.brand
                                : ""
                            }
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                brand: e.target.value,
                              }))
                            }
                            className="auth-input w-1/2 px-3 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          >
                            <option value="">Select Brand (or type custom)</option>
                            {BRAND_OPTIONS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={draft.brand}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                brand: e.target.value,
                              }))
                            }
                            placeholder="e.g. Liqui Moly, Motul, RCB..."
                            className="auth-input flex-1 px-3 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Product Images Upload & Gallery (Click any uploaded image to enlarge in a popup window) */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold">
                            Product Images ({draft.images.length})
                          </label>
                          {draft.images.length > 0 && (
                            <span
                              style={{ color: "#9CA3AF" }}
                              className="text-[11px]"
                            >
                              Click on any uploaded image below to enlarge it in
                              a popup window while writing your product
                              description
                            </span>
                          )}
                        </div>
                        <label
                          style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                        >
                          + Upload / Add Images
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) =>
                              handleDraftImageFilesSelected(draft.draftId, e)
                            }
                            className="hidden"
                          />
                        </label>
                      </div>

                      {draft.images.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 bg-[#0B0B0C] border border-[#00D4FF]/35">
                          {draft.images.map((imgSrc, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setEnlargedDraftImage({
                                  draftId: draft.draftId,
                                  imageIndex: idx,
                                });
                                setEnlargedZoomed(false);
                              }}
                              title="Click to enlarge image in popup window"
                              className="relative group h-28 bg-[#141417] border border-[#00D4FF]/40 hover:border-[#FF1E27] overflow-hidden flex items-center justify-center cursor-pointer transition-all"
                            >
                              <img
                                src={imgSrc}
                                alt={`Product preview ${idx + 1}`}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] uppercase tracking-wider text-center py-0.5 text-glossy-gold">
                                🔍 Click to Enlarge
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveDraftImage(draft.draftId, idx);
                                }}
                                title="Remove image"
                                className="absolute top-1 right-1 w-6 h-6 bg-black/85 border border-red-500 text-red-300 text-xs flex items-center justify-center cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <label className="w-full py-5 bg-[#0B0B0C] border border-dashed border-[#00D4FF]/40 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#141113] transition-colors">
                          <span className="text-xs uppercase tracking-wider text-glossy-gold">
                            Click to select one or multiple product images
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) =>
                              handleDraftImageFilesSelected(draft.draftId, e)
                            }
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Customizable & Deletable Default Product Fields */}
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00D4FF]/30 pb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                          Product Fields & Customer Visibility
                        </span>
                        <span
                          style={{ color: "#9CA3AF" }}
                          className="text-[11px] uppercase tracking-wider"
                        >
                          Toggle &quot;Visible to Customer&quot; or click
                          &quot;✕ Delete Field&quot; to remove any field
                        </span>
                      </div>

                      {/* 1. Product Name Field (Deletable) */}
                      {!draft.fieldSettings.nameDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={draft.fieldSettings.nameLabel}
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "nameLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="Product Name"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={draft.fieldSettings.nameVisible}
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "nameVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    name: "",
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      nameVisible: false,
                                      nameDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Enter product name (or leave empty)"
                            className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      {/* 2. Price Field (Deletable) */}
                      {!draft.fieldSettings.priceDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={draft.fieldSettings.priceLabel}
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "priceLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="Price"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={draft.fieldSettings.priceVisible}
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "priceVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    price: "",
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      priceVisible: false,
                                      priceDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={draft.price}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                price: e.target.value,
                              }))
                            }
                            placeholder="Enter price (or leave empty)"
                            className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      {/* 2B. Stock Quantity Field (Deletable) */}
                      {!draft.fieldSettings.stockQuantityDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={
                                  draft.fieldSettings.stockQuantityLabel ||
                                  "Available Stock"
                                }
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "stockQuantityLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="Available Stock"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={
                                    draft.fieldSettings.stockQuantityVisible !==
                                    false
                                  }
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "stockQuantityVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    stockQuantity: 0,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      stockQuantityVisible: false,
                                      stockQuantityDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(draft.draftId, (d) => ({
                                  ...d,
                                  stockQuantity: Math.max(
                                    0,
                                    (Number(d.stockQuantity) || 0) - 1
                                  ),
                                }))
                              }
                              style={{
                                border: "1.5px solid rgba(255, 80, 80, 0.65)",
                              }}
                              className="px-3.5 py-2 bg-[#1A0D10] hover:border-red-400 text-red-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                              − Deduct 1
                            </button>

                            <input
                              type="number"
                              min="0"
                              value={draft.stockQuantity}
                              onChange={(e) =>
                                updateDraft(draft.draftId, (d) => ({
                                  ...d,
                                  stockQuantity: Math.max(
                                    0,
                                    parseInt(e.target.value || "0", 10) || 0
                                  ),
                                }))
                              }
                              placeholder="0"
                              className="auth-input w-28 text-center px-3 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm font-bold"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(draft.draftId, (d) => ({
                                  ...d,
                                  stockQuantity:
                                    Math.max(0, Number(d.stockQuantity) || 0) +
                                    1,
                                }))
                              }
                              style={{
                                border: "1.5px solid rgba(0, 212, 255, 0.65)",
                              }}
                              className="px-3.5 py-2 bg-[#141417] hover:border-[#7DF9FF] text-glossy-gold text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                              + Add 1
                            </button>

                            <span
                              style={{ color: "#9CA3AF" }}
                              className="text-xs ml-1"
                            >
                              Units available in stock
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. Product Code Field (Deletable) */}
                      {!draft.fieldSettings.productCodeDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={draft.fieldSettings.productCodeLabel}
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "productCodeLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="Product Code"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={
                                    draft.fieldSettings.productCodeVisible
                                  }
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "productCodeVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    productCode: "",
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      productCodeVisible: false,
                                      productCodeDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={draft.productCode}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                productCode: e.target.value,
                              }))
                            }
                            placeholder="Enter product code (or leave empty)"
                            className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      {/* 4. UID Number Field (Deletable) */}
                      {!draft.fieldSettings.uidNumberDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={draft.fieldSettings.uidNumberLabel}
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "uidNumberLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="UID Number"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={draft.fieldSettings.uidNumberVisible}
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "uidNumberVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    uidNumber: "",
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      uidNumberVisible: false,
                                      uidNumberDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={draft.uidNumber}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                uidNumber: e.target.value,
                              }))
                            }
                            placeholder="Enter UID number (or leave empty)"
                            className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      {/* 5. Model Number Field (Deletable) */}
                      {!draft.fieldSettings.modelNumberDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={draft.fieldSettings.modelNumberLabel}
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "modelNumberLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="Model Number"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={
                                    draft.fieldSettings.modelNumberVisible
                                  }
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "modelNumberVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    modelNumber: "",
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      modelNumberVisible: false,
                                      modelNumberDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={draft.modelNumber}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                modelNumber: e.target.value,
                              }))
                            }
                            placeholder="Enter model number (or leave empty)"
                            className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      {/* 6. Description Field (Deletable, with Quick Image Enlarge button if images exist) */}
                      {!draft.fieldSettings.descriptionDeleted && (
                        <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                              <span className="text-[10px] uppercase tracking-wider text-glossy-gold shrink-0">
                                Field Name:
                              </span>
                              <input
                                type="text"
                                value={draft.fieldSettings.descriptionLabel}
                                onChange={(e) =>
                                  handleUpdateDraftFieldSetting(
                                    draft.draftId,
                                    "descriptionLabel",
                                    e.target.value
                                  )
                                }
                                placeholder="Description"
                                className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs font-semibold focus:outline-none"
                              />
                              {draft.images.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEnlargedDraftImage({
                                      draftId: draft.draftId,
                                      imageIndex: 0,
                                    });
                                    setEnlargedZoomed(false);
                                  }}
                                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/55 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                                >
                                  🔍 Enlarge Uploaded Image
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={
                                    draft.fieldSettings.descriptionVisible
                                  }
                                  onChange={(e) =>
                                    handleUpdateDraftFieldSetting(
                                      draft.draftId,
                                      "descriptionVisible",
                                      e.target.checked
                                    )
                                  }
                                  className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                />
                                <span>Visible to Customer</span>
                              </label>
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    description: "",
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      descriptionVisible: false,
                                      descriptionDeleted: true,
                                    },
                                  }))
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.55)",
                                }}
                                className="px-2.5 py-0.5 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                              >
                                ✕ Delete Field
                              </button>
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={draft.description}
                            onChange={(e) =>
                              updateDraft(draft.draftId, (d) => ({
                                ...d,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Enter product description"
                            className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-sm"
                          />
                        </div>
                      )}

                      {/* Restore Any Deleted Default Fields Bar */}
                      {(draft.fieldSettings.nameDeleted ||
                        draft.fieldSettings.priceDeleted ||
                        draft.fieldSettings.stockQuantityDeleted ||
                        draft.fieldSettings.productCodeDeleted ||
                        draft.fieldSettings.uidNumberDeleted ||
                        draft.fieldSettings.modelNumberDeleted ||
                        draft.fieldSettings.descriptionDeleted) && (
                          <div className="p-3 bg-[#141113] border border-dashed border-[#00D4FF]/45 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-glossy-gold mr-1">
                              Restore Deleted Default Field:
                            </span>
                            {draft.fieldSettings.nameDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      nameDeleted: false,
                                      nameVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                + {draft.fieldSettings.nameLabel || "Product Name"}
                              </button>
                            )}
                            {draft.fieldSettings.priceDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      priceDeleted: false,
                                      priceVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                + {draft.fieldSettings.priceLabel || "Price"}
                              </button>
                            )}
                            {draft.fieldSettings.stockQuantityDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    stockQuantity: 1,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      stockQuantityDeleted: false,
                                      stockQuantityVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                +{" "}
                                {draft.fieldSettings.stockQuantityLabel ||
                                  "Available Stock"}
                              </button>
                            )}
                            {draft.fieldSettings.productCodeDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      productCodeDeleted: false,
                                      productCodeVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                +{" "}
                                {draft.fieldSettings.productCodeLabel ||
                                  "Product Code"}
                              </button>
                            )}
                            {draft.fieldSettings.uidNumberDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      uidNumberDeleted: false,
                                      uidNumberVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                +{" "}
                                {draft.fieldSettings.uidNumberLabel ||
                                  "UID Number"}
                              </button>
                            )}
                            {draft.fieldSettings.modelNumberDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      modelNumberDeleted: false,
                                      modelNumberVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                +{" "}
                                {draft.fieldSettings.modelNumberLabel ||
                                  "Model Number"}
                              </button>
                            )}
                            {draft.fieldSettings.descriptionDeleted && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateDraft(draft.draftId, (d) => ({
                                    ...d,
                                    fieldSettings: {
                                      ...d.fieldSettings,
                                      descriptionDeleted: false,
                                      descriptionVisible: true,
                                    },
                                  }))
                                }
                                className="px-2.5 py-1 text-[10px] uppercase bg-[#0B0B0C] border border-[#00D4FF]/50 text-glossy-gold cursor-pointer"
                              >
                                +{" "}
                                {draft.fieldSettings.descriptionLabel ||
                                  "Description"}
                              </button>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Dynamic Custom Fields Section for this Product */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-glossy-gold">
                          Additional / Custom Fields ({draft.customFields.length}
                          )
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddDraftCustomField(draft.draftId)
                          }
                          style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                        >
                          + Add More Field
                        </button>
                      </div>

                      {draft.customFields.length > 0 && (
                        <div className="space-y-2.5">
                          {draft.customFields.map((field) => (
                            <div
                              key={field.id}
                              className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-glossy-gold">
                                  Custom Field
                                </span>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 text-xs text-glossy-gold cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={
                                        field.visibleToCustomer !== false
                                      }
                                      onChange={(e) =>
                                        handleUpdateDraftCustomField(
                                          draft.draftId,
                                          field.id,
                                          "visibleToCustomer",
                                          e.target.checked
                                        )
                                      }
                                      className="accent-[#FF1E27] w-4 h-4 cursor-pointer"
                                    />
                                    <span>Visible to Customer</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveDraftCustomField(
                                        draft.draftId,
                                        field.id
                                      )
                                    }
                                    style={{
                                      border:
                                        "1px solid rgba(255, 80, 80, 0.55)",
                                    }}
                                    className="px-2.5 py-1 text-[10px] uppercase bg-[#1A0D10] text-red-300 cursor-pointer shrink-0"
                                  >
                                    Remove Field
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) =>
                                    handleUpdateDraftCustomField(
                                      draft.draftId,
                                      field.id,
                                      "label",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Field Name (e.g. Brand, Weight, Warranty)"
                                  className="auth-input sm:w-5/12 px-3 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-xs"
                                />
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) =>
                                    handleUpdateDraftCustomField(
                                      draft.draftId,
                                      field.id,
                                      "value",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Field Value"
                                  className="auth-input flex-1 px-3 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-xs"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Bar: "+ Add Another Product" & "Publish All Products" */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-3">
                {!editingProduct && (
                  <button
                    type="button"
                    onClick={handleAddAnotherProductSlot}
                    style={{ border: "1.5px solid rgba(255, 30, 39, 0.65)" }}
                    className="sm:w-5/12 py-3.5 bg-[#0B0B0C] hover:bg-[#141417] text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold transition-all cursor-pointer"
                  >
                    + Add Another Product
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold shadow-[0_0_12px_rgba(255,30,39,0.3)] transition-all cursor-pointer"
                >
                  {saving
                    ? "Publishing Products..."
                    : editingProduct
                      ? "Update & Save Product"
                      : drafts.length > 1
                        ? `Publish All ${drafts.length} Products at Once`
                        : "Publish Product"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PRODUCTS LIST (Category-specific or All Products) */}
          {activeTab === "list" && (
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col">
              {/* Category Filter Bar when viewing All Products */}
              {!categorySlug && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#00D4FF]/25 shrink-0">
                  <span className="text-xs uppercase tracking-wider text-glossy-gold">
                    Filter by Category:
                  </span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="auth-input px-3 py-1.5 bg-[#0B0B0C] border border-[#00D4FF]/45 text-xs focus:outline-none"
                  >
                    <option value="all">
                      All Categories ({products.length})
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {loading ? (
                <p className="py-10 text-center text-sm text-glossy-gold">
                  Loading products...
                </p>
              ) : displayedProducts.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-glossy-gold">
                    No products published here yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm(categorySlug || undefined);
                      setActiveTab("form");
                    }}
                    className="px-4 py-2 text-xs uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/60 text-glossy-gold cursor-pointer"
                  >
                    + Publish Products
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedProducts.map((prod) => {
                    const currentStock =
                      typeof prod.stockQuantity === "number"
                        ? Math.max(0, prod.stockQuantity)
                        : 0;
                    const stepAmount = Math.max(
                      1,
                      parseInt(stockStepMap[prod.id] || "1", 10) || 1
                    );

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setViewingProduct(prod);
                          setActiveViewImageIdx(0);
                        }}
                        className="p-3.5 bg-[#0B0B0C] border border-[#00D4FF]/45 hover:border-[#FF6B6B] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-16 h-16 bg-[#141417] border border-[#00D4FF]/35 flex items-center justify-center shrink-0 overflow-hidden">
                            {prod.images?.[0] ? (
                              <img
                                src={prod.images[0]}
                                alt={prod.name || "Product"}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-[10px] uppercase text-glossy-gold opacity-60">
                                No Img
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!prod.fieldSettings?.nameDeleted && prod.name && (
                                <h4 className="text-sm font-bold uppercase tracking-wider text-glossy-gold">
                                  {prod.name}
                                </h4>
                              )}
                              <span className="px-2 py-0.5 text-[10px] uppercase border border-[#00D4FF]/45 text-glossy-gold">
                                {prod.categoryLabel}
                              </span>
                              {prod.brand && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase border border-[#FF1E27]/65 text-glossy-gold bg-[#1A1215]">
                                  Brand: {prod.brand}
                                </span>
                              )}
                              {!prod.fieldSettings?.stockQuantityDeleted && (
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${currentStock > 0
                                      ? "border-[#00D4FF]/65 text-glossy-gold bg-[#141417]"
                                      : "border-red-500/70 text-red-300 bg-[#1A0D10]"
                                    }`}
                                >
                                  {prod.fieldSettings?.stockQuantityLabel ||
                                    "Available Stock"}
                                  : {currentStock}
                                </span>
                              )}
                            </div>
                            {!prod.fieldSettings?.priceDeleted && prod.price && (
                              <p className="text-xs font-semibold text-glossy-gold mt-1">
                                {prod.fieldSettings?.priceLabel || "Price"}:{" "}
                                {prod.price}
                              </p>
                            )}
                            <p
                              style={{ color: "#D1D5DB" }}
                              className="text-[11px] mt-0.5"
                            >
                              {!prod.fieldSettings?.productCodeDeleted &&
                                prod.productCode &&
                                `${prod.fieldSettings?.productCodeLabel || "Code"
                                }: ${prod.productCode} `}
                              {!prod.fieldSettings?.uidNumberDeleted &&
                                prod.uidNumber &&
                                `• ${prod.fieldSettings?.uidNumberLabel || "UID"
                                }: ${prod.uidNumber} `}
                              {!prod.fieldSettings?.modelNumberDeleted &&
                                prod.modelNumber &&
                                `• ${prod.fieldSettings?.modelNumberLabel || "Model"
                                }: ${prod.modelNumber}`}
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Instant Stock Add / Deduct Control Box */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45">
                            <span className="text-[10px] uppercase tracking-wider text-glossy-gold mr-0.5">
                              Stock:
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleAdjustProductStock(prod.id, -stepAmount)
                              }
                              title={`Deduct ${stepAmount} from stock`}
                              style={{
                                border: "1px solid rgba(255, 80, 80, 0.65)",
                              }}
                              className="px-2 py-0.5 bg-[#1A0D10] hover:border-red-400 text-red-300 text-xs font-bold uppercase cursor-pointer"
                            >
                              −{stepAmount}
                            </button>

                            <span className="min-w-[28px] text-center text-xs font-extrabold text-glossy-gold">
                              {currentStock}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleAdjustProductStock(prod.id, stepAmount)
                              }
                              title={`Add ${stepAmount} to stock`}
                              style={{
                                border: "1px solid rgba(0, 212, 255, 0.65)",
                              }}
                              className="px-2 py-0.5 bg-[#0B0B0C] hover:border-[#7DF9FF] text-glossy-gold text-xs font-bold uppercase cursor-pointer"
                            >
                              +{stepAmount}
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={stockStepMap[prod.id] ?? "1"}
                              onChange={(e) =>
                                setStockStepMap((prev) => ({
                                  ...prev,
                                  [prod.id]: e.target.value,
                                }))
                              }
                              title="Quantity step to add or deduct"
                              className="auth-input w-12 text-center px-1 py-0.5 bg-[#0B0B0C] border border-[#00D4FF]/35 text-[11px] focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setViewingProduct(prod);
                              setActiveViewImageIdx(0);
                            }}
                            className="px-2.5 py-1.5 text-xs uppercase tracking-wider bg-[#141417] border border-[#00D4FF]/45 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                          >
                            Full Screen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditProduct(prod)}
                            className="px-2.5 py-1.5 text-xs uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/55 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                          >
                            Modify
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleDeleteProduct(prod.id)}
                            style={{
                              border: "1px solid rgba(255, 80, 80, 0.55)",
                            }}
                            className="px-2.5 py-1.5 text-xs uppercase tracking-wider bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FULL-SCREEN PRODUCT VIEW POPUP FOR ADMIN (with Cross Button to return to previous place) */}
      {viewingProduct && (
        <div
          className="fixed inset-0 z-[130] bg-[#080809]/98 backdrop-blur-md flex flex-col overflow-y-auto"
          onClick={() => setViewingProduct(null)}
        >
          <div
            className="w-full min-h-screen flex flex-col p-6 sm:p-10 max-w-7xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full-Screen Top Bar with Cross (✕) Button */}
            <div
              style={{ borderBottom: "1.5px solid rgba(255, 30, 39, 0.45)" }}
              className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 shrink-0"
            >
              <div>
                <span className="text-xs uppercase tracking-widest text-glossy-gold opacity-80">
                  {viewingProduct.categoryLabel} — Full Screen Product View
                </span>
                {viewingProduct.name && (
                  <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold mt-0.5">
                    {viewingProduct.name}
                  </h2>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStartEditProduct(viewingProduct)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                >
                  Modify Product
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  aria-label="Close full screen product view"
                  style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                  className="w-10 h-10 flex items-center justify-center text-base font-bold bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Full-Screen Content: Large Clear Image Gallery + Complete Specifications */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
              {/* Left 7 Columns: Large High-Clarity Image Viewer */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <div
                  style={{
                    backgroundColor: "#0B0B0C",
                    border: "1.5px solid rgba(255, 30, 39, 0.5)",
                    minHeight: "62vh",
                  }}
                  className="w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden"
                >
                  {viewingProduct.images?.length > 0 ? (
                    <img
                      src={
                        viewingProduct.images[activeViewImageIdx] ||
                        viewingProduct.images[0]
                      }
                      alt={viewingProduct.name || "Product"}
                      className="max-h-[60vh] w-full object-contain select-none"
                    />
                  ) : (
                    <span className="text-sm uppercase tracking-widest text-glossy-gold opacity-60">
                      No Image Uploaded
                    </span>
                  )}
                </div>

                {viewingProduct.images?.length > 1 && (
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {viewingProduct.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveViewImageIdx(idx)}
                        className={`w-20 h-20 bg-[#0B0B0C] border-2 p-1.5 shrink-0 cursor-pointer transition-all ${activeViewImageIdx === idx
                            ? "border-[#FF1E27] scale-105"
                            : "border-[#00D4FF]/30 opacity-65 hover:opacity-100"
                          }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 5 Columns: Product Details & Customer Visibility Status */}
              <div
                style={{
                  backgroundColor: "#111114",
                  border: "1.5px solid rgba(255, 30, 39, 0.55)",
                }}
                className="lg:col-span-5 p-6 sm:p-8 space-y-4"
              >
                {viewingProduct.brand && (
                  <div className="border-b border-[#00D4FF]/35 pb-3">
                    <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                      Brand
                    </span>
                    <p className="text-base font-bold uppercase tracking-wider text-glossy-gold mt-1">
                      {viewingProduct.brand}
                    </p>
                  </div>
                )}

                {!viewingProduct.fieldSettings?.nameDeleted &&
                  viewingProduct.name && (
                    <div className="border-b border-[#00D4FF]/35 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                          {viewingProduct.fieldSettings?.nameLabel ||
                            "Product Name"}
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/40 text-glossy-gold">
                          {viewingProduct.fieldSettings?.nameVisible !== false
                            ? "Shown to Customers"
                            : "Hidden from Customers"}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-glossy-gold mt-1">
                        {viewingProduct.name}
                      </h3>
                    </div>
                  )}

                {!viewingProduct.fieldSettings?.priceDeleted &&
                  viewingProduct.price && (
                    <div className="border-b border-[#00D4FF]/35 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                          {viewingProduct.fieldSettings?.priceLabel || "Price"}
                        </span>
                        <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/40 text-glossy-gold">
                          {viewingProduct.fieldSettings?.priceVisible !== false
                            ? "Shown to Customers"
                            : "Hidden from Customers"}
                        </span>
                      </div>
                      <p className="text-2xl font-extrabold text-glossy-gold mt-1">
                        {viewingProduct.price}
                      </p>
                    </div>
                  )}

                {/* Available Stock Quantity Add / Deduct Panel in Full Screen */}
                {!viewingProduct.fieldSettings?.stockQuantityDeleted &&
                  (() => {
                    const viewStock =
                      typeof viewingProduct.stockQuantity === "number"
                        ? Math.max(0, viewingProduct.stockQuantity)
                        : 0;
                    const viewStep = Math.max(
                      1,
                      parseInt(stockStepMap[viewingProduct.id] || "1", 10) || 1
                    );
                    return (
                      <div className="border-b border-[#00D4FF]/35 pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                            {viewingProduct.fieldSettings?.stockQuantityLabel ||
                              "Available Stock"}
                          </span>
                          <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/40 text-glossy-gold">
                            {viewingProduct.fieldSettings
                              ?.stockQuantityVisible !== false
                              ? "Shown to Customers"
                              : "Hidden from Customers"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <span
                            className={`text-xl font-extrabold ${viewStock > 0 ? "text-glossy-gold" : "text-red-300"
                              }`}
                          >
                            {viewStock}{" "}
                            <span className="text-xs font-normal uppercase">
                              {viewStock === 1 ? "Unit" : "Units"} in Stock
                            </span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAdjustProductStock(
                                  viewingProduct.id,
                                  -viewStep
                                )
                              }
                              style={{
                                border: "1px solid rgba(255, 80, 80, 0.65)",
                              }}
                              className="px-3 py-1.5 bg-[#1A0D10] hover:border-red-400 text-red-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                              − Deduct {viewStep}
                            </button>

                            <input
                              type="number"
                              min="1"
                              value={stockStepMap[viewingProduct.id] ?? "1"}
                              onChange={(e) =>
                                setStockStepMap((prev) => ({
                                  ...prev,
                                  [viewingProduct.id]: e.target.value,
                                }))
                              }
                              title="Quantity step to add or deduct"
                              className="auth-input w-14 text-center px-2 py-1 bg-[#0B0B0C] border border-[#00D4FF]/45 text-xs font-bold focus:outline-none"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                handleAdjustProductStock(
                                  viewingProduct.id,
                                  viewStep
                                )
                              }
                              style={{
                                border: "1px solid rgba(0, 212, 255, 0.65)",
                              }}
                              className="px-3 py-1.5 bg-[#0B0B0C] hover:border-[#7DF9FF] text-glossy-gold text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                              + Add {viewStep}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                <div className="space-y-3 text-sm">
                  {!viewingProduct.fieldSettings?.productCodeDeleted &&
                    viewingProduct.productCode && (
                      <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#00D4FF]/20">
                        <p style={{ color: "#E5E7EB" }}>
                          <strong className="text-glossy-gold">
                            {viewingProduct.fieldSettings?.productCodeLabel ||
                              "Product Code"}
                            :
                          </strong>{" "}
                          {viewingProduct.productCode}
                        </p>
                        <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/35 text-glossy-gold shrink-0">
                          {viewingProduct.fieldSettings?.productCodeVisible !==
                            false
                            ? "Visible"
                            : "Hidden"}
                        </span>
                      </div>
                    )}

                  {!viewingProduct.fieldSettings?.uidNumberDeleted &&
                    viewingProduct.uidNumber && (
                      <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#00D4FF]/20">
                        <p style={{ color: "#E5E7EB" }}>
                          <strong className="text-glossy-gold">
                            {viewingProduct.fieldSettings?.uidNumberLabel ||
                              "UID Number"}
                            :
                          </strong>{" "}
                          {viewingProduct.uidNumber}
                        </p>
                        <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/35 text-glossy-gold shrink-0">
                          {viewingProduct.fieldSettings?.uidNumberVisible !==
                            false
                            ? "Visible"
                            : "Hidden"}
                        </span>
                      </div>
                    )}

                  {!viewingProduct.fieldSettings?.modelNumberDeleted &&
                    viewingProduct.modelNumber && (
                      <div className="flex items-center justify-between gap-2 py-1.5 border-b border-[#00D4FF]/20">
                        <p style={{ color: "#E5E7EB" }}>
                          <strong className="text-glossy-gold">
                            {viewingProduct.fieldSettings?.modelNumberLabel ||
                              "Model Number"}
                            :
                          </strong>{" "}
                          {viewingProduct.modelNumber}
                        </p>
                        <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/35 text-glossy-gold shrink-0">
                          {viewingProduct.fieldSettings?.modelNumberVisible !==
                            false
                            ? "Visible"
                            : "Hidden"}
                        </span>
                      </div>
                    )}

                  {viewingProduct.customFields?.map((cf) => (
                    <div
                      key={cf.id}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-[#00D4FF]/20"
                    >
                      <p style={{ color: "#E5E7EB" }}>
                        <strong className="text-glossy-gold">
                          {cf.label}:
                        </strong>{" "}
                        {cf.value}
                      </p>
                      <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/35 text-glossy-gold shrink-0">
                        {cf.visibleToCustomer !== false ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  ))}

                  {!viewingProduct.fieldSettings?.descriptionDeleted &&
                    viewingProduct.description && (
                      <div className="pt-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-glossy-gold uppercase tracking-wider text-xs">
                            {viewingProduct.fieldSettings?.descriptionLabel ||
                              "Description"}
                          </strong>
                          <span className="text-[10px] uppercase px-2 py-0.5 border border-[#00D4FF]/35 text-glossy-gold">
                            {viewingProduct.fieldSettings?.descriptionVisible !==
                              false
                              ? "Visible"
                              : "Hidden"}
                          </span>
                        </div>
                        <p
                          style={{ color: "#E5E7EB" }}
                          className="whitespace-pre-wrap leading-relaxed bg-[#0B0B0C] p-3.5 border border-[#00D4FF]/30"
                        >
                          {viewingProduct.description}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENLARGED UPLOADED IMAGE POPUP WINDOW FOR PRODUCT DESCRIPTION INSPECTION */}
      {enlargedDraftImage &&
        (() => {
          const activeDraft = drafts.find(
            (d) => d.draftId === enlargedDraftImage.draftId
          );
          if (!activeDraft || activeDraft.images.length === 0) return null;
          const safeIdx = Math.min(
            enlargedDraftImage.imageIndex,
            activeDraft.images.length - 1
          );
          const currentImgUrl = activeDraft.images[safeIdx];

          return (
            <div
              className="fixed inset-0 z-[150] bg-[#060608]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
              onClick={() => {
                setEnlargedDraftImage(null);
                setEnlargedZoomed(false);
              }}
            >
              <div
                style={{
                  backgroundColor: "#111114",
                  border: "1.5px solid rgba(255, 30, 39, 0.75)",
                  boxShadow:
                    "0 0 45px rgba(255, 30, 39, 0.3), 0 25px 60px rgba(0, 0, 0, 0.9)",
                  maxHeight: "94vh",
                }}
                className="relative w-full max-w-6xl p-5 sm:p-7 flex flex-col overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Popup Top Bar */}
                <div
                  style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.4)" }}
                  className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-5 shrink-0"
                >
                  <div>
                    <span className="text-[11px] uppercase tracking-widest text-glossy-gold opacity-85 block">
                      Enlarged Uploaded Image — Inspect for Product Description
                    </span>
                    <h3 className="text-base sm:text-xl font-bold uppercase tracking-wider text-glossy-gold mt-0.5">
                      {activeDraft.name || "Product Image Preview"} (Image{" "}
                      {safeIdx + 1} of {activeDraft.images.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEnlargedZoomed((z) => !z)}
                      style={{ border: "1px solid rgba(0, 212, 255, 0.65)" }}
                      className="px-3 py-1.5 bg-[#0B0B0C] hover:border-[#7DF9FF] text-xs font-bold uppercase tracking-wider text-glossy-gold cursor-pointer"
                    >
                      {enlargedZoomed ? "🔍 1x Fit View" : "🔍 2x Zoom In"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnlargedDraftImage(null);
                        setEnlargedZoomed(false);
                      }}
                      aria-label="Close enlarged image popup"
                      style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                      className="w-9 h-9 flex items-center justify-center text-base font-bold bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Main Split Layout: Large Enlarged Image on Left + Live Product Description Box on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left 8 Columns: High-Clarity Enlarged Image Container */}
                  <div className="lg:col-span-8 flex flex-col space-y-3">
                    <div
                      onClick={() => setEnlargedZoomed((z) => !z)}
                      title="Click image to toggle 1x / 2x zoom"
                      style={{
                        backgroundColor: "#0B0B0C",
                        border: "1.5px solid rgba(0, 212, 255, 0.45)",
                        minHeight: "56vh",
                        maxHeight: "68vh",
                      }}
                      className="w-full flex items-center justify-center p-3 overflow-auto cursor-zoom-in"
                    >
                      <img
                        src={currentImgUrl}
                        alt={`Enlarged upload ${safeIdx + 1}`}
                        style={{
                          transform: enlargedZoomed ? "scale(1.85)" : "scale(1)",
                          transformOrigin: "center center",
                        }}
                        className="max-h-[62vh] w-auto object-contain transition-transform duration-200 select-none"
                      />
                    </div>

                    {/* Multi-Image Thumbnails & Prev/Next Controls */}
                    {activeDraft.images.length > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setEnlargedDraftImage({
                              draftId: activeDraft.draftId,
                              imageIndex:
                                (safeIdx - 1 + activeDraft.images.length) %
                                activeDraft.images.length,
                            })
                          }
                          className="px-3 py-1.5 bg-[#0B0B0C] border border-[#00D4FF]/45 hover:border-[#7DF9FF] text-xs font-bold uppercase text-glossy-gold cursor-pointer"
                        >
                          ‹ Prev Image
                        </button>

                        <div className="flex items-center gap-2 overflow-x-auto py-1">
                          {activeDraft.images.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                setEnlargedDraftImage({
                                  draftId: activeDraft.draftId,
                                  imageIndex: i,
                                })
                              }
                              className={`w-14 h-14 bg-[#0B0B0C] border-2 p-1 shrink-0 cursor-pointer ${i === safeIdx
                                  ? "border-[#FF1E27]"
                                  : "border-[#00D4FF]/30 opacity-65 hover:opacity-100"
                                }`}
                            >
                              <img
                                src={img}
                                alt={`Thumb ${i + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setEnlargedDraftImage({
                              draftId: activeDraft.draftId,
                              imageIndex:
                                (safeIdx + 1) % activeDraft.images.length,
                            })
                          }
                          className="px-3 py-1.5 bg-[#0B0B0C] border border-[#00D4FF]/45 hover:border-[#7DF9FF] text-xs font-bold uppercase text-glossy-gold cursor-pointer"
                        >
                          Next Image ›
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right 4 Columns: Live Product Name, Codes & Description Editor while viewing enlarged image */}
                  <div
                    style={{
                      backgroundColor: "#0B0B0C",
                      border: "1.5px solid rgba(255, 30, 39, 0.5)",
                    }}
                    className="lg:col-span-4 p-4 sm:p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-glossy-gold block border-b border-[#00D4FF]/30 pb-2">
                        Write / Check Product Details While Viewing Image
                      </span>

                      {!activeDraft.fieldSettings.nameDeleted && (
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-glossy-gold block mb-1">
                            {activeDraft.fieldSettings.nameLabel ||
                              "Product Name"}
                          </label>
                          <input
                            type="text"
                            value={activeDraft.name}
                            onChange={(e) =>
                              updateDraft(activeDraft.draftId, (d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Product name..."
                            className="auth-input w-full px-3 py-2 bg-[#141417] border border-[#00D4FF]/45 focus:outline-none text-xs"
                          />
                        </div>
                      )}

                      {!activeDraft.fieldSettings.modelNumberDeleted && (
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-glossy-gold block mb-1">
                            {activeDraft.fieldSettings.modelNumberLabel ||
                              "Model Number"}
                          </label>
                          <input
                            type="text"
                            value={activeDraft.modelNumber}
                            onChange={(e) =>
                              updateDraft(activeDraft.draftId, (d) => ({
                                ...d,
                                modelNumber: e.target.value,
                              }))
                            }
                            placeholder="Model / Part number on box..."
                            className="auth-input w-full px-3 py-2 bg-[#141417] border border-[#00D4FF]/45 focus:outline-none text-xs"
                          />
                        </div>
                      )}

                      {!activeDraft.fieldSettings.descriptionDeleted && (
                        <div>
                          <label className="text-[11px] uppercase tracking-wider text-glossy-gold block mb-1">
                            {activeDraft.fieldSettings.descriptionLabel ||
                              "Product Description"}
                          </label>
                          <textarea
                            rows={7}
                            value={activeDraft.description}
                            onChange={(e) =>
                              updateDraft(activeDraft.draftId, (d) => ({
                                ...d,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Read the enlarged product image clearly and type the product description, specifications, viscosity, or part details here..."
                            className="auth-input w-full px-3 py-2.5 bg-[#141417] border border-[#00D4FF]/45 focus:outline-none text-xs sm:text-sm leading-relaxed"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEnlargedDraftImage(null);
                        setEnlargedZoomed(false);
                      }}
                      className="w-full py-2.5 bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-xs font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                    >
                      ✓ Done Checking Image
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
