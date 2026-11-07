"use client";

import React, { use, useEffect, useState } from "react";
import ProductsManagerModal, {
  DEFAULT_FIELD_SETTINGS,
  ProductItem,
} from "@/components/ProductsManagerModal";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [categoryLabel, setCategoryLabel] = useState<string>(
    slug.replace(/-/g, " ")
  );
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null
  );
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);

  // Customer Booking State
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    address: string;
    role: string;
  } | null>(null);
  const [bookingProduct, setBookingProduct] = useState<ProductItem | null>(
    null
  );
  const [bookQty, setBookQty] = useState<string>("1");
  const [bookName, setBookName] = useState<string>("");
  const [bookPhone, setBookPhone] = useState<string>("");
  const [bookEmail, setBookEmail] = useState<string>("");
  const [bookAddress, setBookAddress] = useState<string>("");
  const [bookNote, setBookNote] = useState<string>("");
  const [bookingBusy, setBookingBusy] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const loadCategoryProducts = async () => {
    setLoading(true);
    try {
      const [catRes, prodRes, meRes] = await Promise.all([
        fetch("/api/categories"),
        fetch(`/api/products?categorySlug=${encodeURIComponent(slug)}`),
        fetch("/api/auth/me"),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();
      const meData = await meRes.json();

      if (Array.isArray(catData?.categories)) {
        const decoded = decodeURIComponent(slug).toLowerCase();
        const normalized = decoded.replace(/\s+/g, "-");
        const matched = catData.categories.find(
          (c: { slug: string; label: string }) =>
            c.slug.toLowerCase() === slug.toLowerCase() ||
            c.slug.toLowerCase() === decoded ||
            c.slug.toLowerCase() === normalized
        );
        if (matched) setCategoryLabel(matched.label);
      }
      if (Array.isArray(prodData?.products)) {
        setProducts(prodData.products);
        setSelectedProduct((prev) => {
          if (!prev) return null;
          const updated = prodData.products.find(
            (p: ProductItem) => p.id === prev.id
          );
          return updated || null;
        });
      }
      setIsAdmin(meData?.user?.role === "admin");
      if (meData?.user) {
        setCurrentUser(meData.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryProducts();
    const handleRefresh = () => loadCategoryProducts();
    window.addEventListener("furious-products-change", handleRefresh);
    window.addEventListener("furious-auth-change", handleRefresh);
    return () => {
      window.removeEventListener("furious-products-change", handleRefresh);
      window.removeEventListener("furious-auth-change", handleRefresh);
    };
  }, [slug]);

  const handleAdjustStock = async (
    productId: string,
    delta: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
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
        setSelectedProduct((prev) =>
          prev && prev.id === productId ? data.product : prev
        );
        window.dispatchEvent(new Event("furious-products-change"));
      }
    } catch {
      // Ignore network errors
    }
  };

  const handleOpenBookingModal = (
    product: ProductItem,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    setBookingProduct(product);
    setBookQty("1");
    setBookName(currentUser?.name || "");
    setBookPhone(currentUser?.phone || "");
    setBookEmail(currentUser?.email || "");
    setBookAddress(currentUser?.address || "");
    setBookNote("");
    setBookingError(null);
    setBookingSuccess(null);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingProduct) return;
    setBookingError(null);
    setBookingSuccess(null);

    if (!bookName.trim() || !bookPhone.trim()) {
      setBookingError("Your Name and Phone Number are required to book.");
      return;
    }

    setBookingBusy(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: bookingProduct.id,
          productName: bookingProduct.name,
          productImage: bookingProduct.images?.[0] || "",
          productPrice: bookingProduct.price,
          productCode: bookingProduct.productCode,
          uidNumber: bookingProduct.uidNumber,
          modelNumber: bookingProduct.modelNumber,
          categorySlug: bookingProduct.categorySlug || slug,
          categoryLabel: bookingProduct.categoryLabel || categoryLabel,
          quantity: Math.max(1, parseInt(bookQty || "1", 10) || 1),
          customerName: bookName.trim(),
          customerPhone: bookPhone.trim(),
          customerEmail: bookEmail.trim(),
          customerAddress: bookAddress.trim(),
          customerNote: bookNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBookingError(data.error || "Failed to place booking.");
      } else {
        setBookingSuccess(
          "Your product booking has been sent! We will confirm and reply shortly."
        );
        window.dispatchEvent(new Event("furious-bookings-change"));
      }
    } catch {
      setBookingError("Network error while booking product.");
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-9.75rem)] bg-matte-black px-6 sm:px-10 py-8">
      {/* Category Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#00D4FF]/35">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold">
          {categoryLabel}
        </h1>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
          >
            + Manage / Publish Products
          </button>
        )}
      </div>

      {/* Products Grid for Customers & Admin */}
      {loading ? (
        <p className="py-12 text-center text-sm uppercase tracking-wider text-glossy-gold">
          Loading products...
        </p>
      ) : products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm uppercase tracking-wider text-glossy-gold opacity-80">
            No products available in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const fs = {
              ...DEFAULT_FIELD_SETTINGS,
              ...(product.fieldSettings || {}),
            };
            const showName =
              !fs.nameDeleted &&
              Boolean(product.name) &&
              (isAdmin || fs.nameVisible !== false);
            const showPrice =
              !fs.priceDeleted &&
              Boolean(product.price) &&
              (isAdmin || fs.priceVisible !== false);
            const showStock =
              !fs.stockQuantityDeleted &&
              (isAdmin || fs.stockQuantityVisible !== false);
            const currentStock =
              typeof product.stockQuantity === "number"
                ? Math.max(0, product.stockQuantity)
                : 0;
            const showCode =
              !fs.productCodeDeleted &&
              Boolean(product.productCode) &&
              (isAdmin || fs.productCodeVisible !== false);
            const showUid =
              !fs.uidNumberDeleted &&
              Boolean(product.uidNumber) &&
              (isAdmin || fs.uidNumberVisible !== false);
            const showModel =
              !fs.modelNumberDeleted &&
              Boolean(product.modelNumber) &&
              (isAdmin || fs.modelNumberVisible !== false);
            const showDesc =
              !fs.descriptionDeleted &&
              Boolean(product.description) &&
              (isAdmin || fs.descriptionVisible !== false);
            const visibleCustomFields = (product.customFields || []).filter(
              (cf) => isAdmin || cf.visibleToCustomer !== false
            );

            return (
              <div
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setActiveImageIdx(0);
                }}
                style={{
                  backgroundColor: "#111114",
                  border: "1.5px solid rgba(255, 30, 39, 0.55)",
                  boxShadow: "0 0 18px rgba(255, 30, 39, 0.16)",
                }}
                className="flex flex-col rounded-2xl overflow-hidden hover:border-[#FF6B6B] hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(255,30,39,0.3)] transition-all duration-300 cursor-pointer group"
              >
                {/* Product Image Box */}
                <div className="w-full h-56 bg-[#0B0B0C] border-b border-[#00D4FF]/35 flex items-center justify-center p-3 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-50">
                      No Image
                    </span>
                  )}
                </div>

                {/* Product Details Summary (respects Customer Visibility settings) */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {showName && (
                      <h2 className="text-base font-bold uppercase tracking-wider text-glossy-gold">
                        {product.name}
                      </h2>
                    )}
                    {showPrice && (
                      <p className="text-lg font-extrabold text-glossy-gold">
                        {fs.priceLabel && fs.priceLabel !== "Price"
                          ? `${fs.priceLabel}: ${product.price}`
                          : product.price}
                      </p>
                    )}

                    {showStock && (
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-2.5 bg-[#0B0B0C] border border-[#00D4FF]/35"
                        onClick={(e) => isAdmin && e.stopPropagation()}
                      >
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${currentStock > 0
                              ? "text-glossy-gold"
                              : "text-red-300"
                            }`}
                        >
                          {fs.stockQuantityLabel || "Available Stock"}:{" "}
                          {currentStock}
                        </span>

                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) =>
                                handleAdjustStock(product.id, -1, e)
                              }
                              title="Deduct 1 from stock"
                              style={{
                                border: "1px solid rgba(255, 80, 80, 0.65)",
                              }}
                              className="px-2 py-0.5 bg-[#1A0D10] hover:border-red-400 text-red-300 text-xs font-bold cursor-pointer"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={(e) =>
                                handleAdjustStock(product.id, 1, e)
                              }
                              title="Add 1 to stock"
                              style={{
                                border: "1px solid rgba(0, 212, 255, 0.65)",
                              }}
                              className="px-2 py-0.5 bg-[#141417] hover:border-[#7DF9FF] text-glossy-gold text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      style={{ color: "#E5E7EB" }}
                      className="text-xs space-y-1 pt-1"
                    >
                      {showCode && (
                        <p>
                          <strong>{fs.productCodeLabel}:</strong>{" "}
                          {product.productCode}
                        </p>
                      )}
                      {showUid && (
                        <p>
                          <strong>{fs.uidNumberLabel}:</strong>{" "}
                          {product.uidNumber}
                        </p>
                      )}
                      {showModel && (
                        <p>
                          <strong>{fs.modelNumberLabel}:</strong>{" "}
                          {product.modelNumber}
                        </p>
                      )}
                      {showDesc && (
                        <p className="line-clamp-2 opacity-85 pt-1">
                          {product.description}
                        </p>
                      )}
                      {visibleCustomFields.map((cf) => (
                        <p key={cf.id}>
                          <strong>{cf.label}:</strong> {cf.value}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#00D4FF]/25 flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-glossy-gold">
                      Full Screen View ›
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleOpenBookingModal(product, e)}
                      style={{ border: "1px solid rgba(255, 30, 39, 0.65)" }}
                      className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer shrink-0"
                    >
                      Book Product
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN PRODUCT POPUP MODAL when Admin or Customer clicks on any Product Card */}
      {selectedProduct &&
        (() => {
          const fs = {
            ...DEFAULT_FIELD_SETTINGS,
            ...(selectedProduct.fieldSettings || {}),
          };
          const showName =
            !fs.nameDeleted &&
            Boolean(selectedProduct.name) &&
            (isAdmin || fs.nameVisible !== false);
          const showPrice =
            !fs.priceDeleted &&
            Boolean(selectedProduct.price) &&
            (isAdmin || fs.priceVisible !== false);
          const showStock =
            !fs.stockQuantityDeleted &&
            (isAdmin || fs.stockQuantityVisible !== false);
          const selectedStock =
            typeof selectedProduct.stockQuantity === "number"
              ? Math.max(0, selectedProduct.stockQuantity)
              : 0;
          const showCode =
            !fs.productCodeDeleted &&
            Boolean(selectedProduct.productCode) &&
            (isAdmin || fs.productCodeVisible !== false);
          const showUid =
            !fs.uidNumberDeleted &&
            Boolean(selectedProduct.uidNumber) &&
            (isAdmin || fs.uidNumberVisible !== false);
          const showModel =
            !fs.modelNumberDeleted &&
            Boolean(selectedProduct.modelNumber) &&
            (isAdmin || fs.modelNumberVisible !== false);
          const showDesc =
            !fs.descriptionDeleted &&
            Boolean(selectedProduct.description) &&
            (isAdmin || fs.descriptionVisible !== false);
          const visibleCustomFields = (
            selectedProduct.customFields || []
          ).filter((cf) => isAdmin || cf.visibleToCustomer !== false);

          return (
            <div
              className="fixed inset-0 z-[120] bg-[#080809]/98 backdrop-blur-md flex flex-col overflow-y-auto"
              onClick={() => setSelectedProduct(null)}
            >
              <div
                className="w-full min-h-screen flex flex-col p-6 sm:p-10 max-w-7xl mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Full-Screen Top Header with Cross (✕) Button to cut popup and return to previous place */}
                <div
                  style={{ borderBottom: "1.5px solid rgba(255, 30, 39, 0.45)" }}
                  className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 shrink-0"
                >
                  <div>
                    <span className="text-xs uppercase tracking-widest text-glossy-gold opacity-80">
                      {categoryLabel}
                    </span>
                    {showName && (
                      <h3 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold mt-0.5">
                        {selectedProduct.name}
                      </h3>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(null);
                          setIsManagerOpen(true);
                        }}
                        className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                      >
                        Modify Product
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      aria-label="Close full screen product popup"
                      title="Close"
                      style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                      className="w-10 h-10 flex items-center justify-center text-base font-bold bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Main Full-Screen Grid: Clear Full-Size Image + Product Specifications */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
                  {/* Left 7 Columns: Large High-Clarity Image Display & Thumbnails */}
                  <div className="lg:col-span-7 flex flex-col space-y-4">
                    <div
                      style={{
                        backgroundColor: "#0B0B0C",
                        border: "1.5px solid rgba(255, 30, 39, 0.5)",
                        minHeight: "62vh",
                      }}
                      className="w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden"
                    >
                      {selectedProduct.images?.length > 0 ? (
                        <img
                          src={
                            selectedProduct.images[activeImageIdx] ||
                            selectedProduct.images[0]
                          }
                          alt={selectedProduct.name}
                          className="max-h-[60vh] w-full object-contain select-none"
                        />
                      ) : (
                        <span className="text-sm uppercase tracking-widest text-glossy-gold opacity-60">
                          No Image Available
                        </span>
                      )}
                    </div>

                    {selectedProduct.images?.length > 1 && (
                      <div className="flex items-center gap-3 overflow-x-auto pb-2">
                        {selectedProduct.images.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIdx(idx)}
                            className={`w-20 h-20 bg-[#0B0B0C] border-2 p-1.5 shrink-0 cursor-pointer transition-all ${activeImageIdx === idx
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

                  {/* Right 5 Columns: Full Specifications & Book Product Button */}
                  <div
                    style={{
                      backgroundColor: "#111114",
                      border: "1.5px solid rgba(255, 30, 39, 0.55)",
                    }}
                    className="lg:col-span-5 p-6 sm:p-8 space-y-4"
                  >
                    {showName && (
                      <div className="border-b border-[#00D4FF]/35 pb-3">
                        <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                          {fs.nameLabel}
                        </span>
                        <h4 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-glossy-gold mt-1">
                          {selectedProduct.name}
                        </h4>
                      </div>
                    )}

                    {showPrice && (
                      <div className="border-b border-[#00D4FF]/35 pb-3">
                        <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                          {fs.priceLabel}
                        </span>
                        <p className="text-2xl font-extrabold text-glossy-gold mt-1">
                          {selectedProduct.price}
                        </p>
                      </div>
                    )}

                    {showStock && (
                      <div className="border-b border-[#00D4FF]/35 pb-3 space-y-2">
                        <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                          {fs.stockQuantityLabel || "Available Stock"}
                        </span>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`text-xl font-extrabold ${selectedStock > 0
                                ? "text-glossy-gold"
                                : "text-red-300"
                              }`}
                          >
                            {selectedStock}{" "}
                            <span className="text-xs font-normal uppercase">
                              {selectedStock === 1 ? "Unit" : "Units"} Available
                            </span>
                          </span>

                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleAdjustStock(selectedProduct.id, -1, e)
                                }
                                style={{
                                  border: "1px solid rgba(255, 80, 80, 0.65)",
                                }}
                                className="px-3 py-1.5 bg-[#1A0D10] hover:border-red-400 text-red-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
                              >
                                − Deduct 1
                              </button>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleAdjustStock(selectedProduct.id, 1, e)
                                }
                                style={{
                                  border: "1px solid rgba(0, 212, 255, 0.65)",
                                }}
                                className="px-3 py-1.5 bg-[#0B0B0C] hover:border-[#7DF9FF] text-glossy-gold text-xs font-bold uppercase tracking-wider cursor-pointer"
                              >
                                + Add 1
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 text-sm">
                      {showCode && (
                        <p
                          style={{ color: "#E5E7EB" }}
                          className="py-1.5 border-b border-[#00D4FF]/20"
                        >
                          <strong className="text-glossy-gold">
                            {fs.productCodeLabel}:
                          </strong>{" "}
                          {selectedProduct.productCode}
                        </p>
                      )}

                      {showUid && (
                        <p
                          style={{ color: "#E5E7EB" }}
                          className="py-1.5 border-b border-[#00D4FF]/20"
                        >
                          <strong className="text-glossy-gold">
                            {fs.uidNumberLabel}:
                          </strong>{" "}
                          {selectedProduct.uidNumber}
                        </p>
                      )}

                      {showModel && (
                        <p
                          style={{ color: "#E5E7EB" }}
                          className="py-1.5 border-b border-[#00D4FF]/20"
                        >
                          <strong className="text-glossy-gold">
                            {fs.modelNumberLabel}:
                          </strong>{" "}
                          {selectedProduct.modelNumber}
                        </p>
                      )}

                      {visibleCustomFields.map((cf) => (
                        <p
                          key={cf.id}
                          style={{ color: "#E5E7EB" }}
                          className="py-1.5 border-b border-[#00D4FF]/20"
                        >
                          <strong className="text-glossy-gold">
                            {cf.label}:
                          </strong>{" "}
                          {cf.value}
                        </p>
                      ))}

                      {showDesc && (
                        <div className="pt-2 space-y-1.5">
                          <strong className="text-glossy-gold uppercase tracking-wider text-xs block">
                            {fs.descriptionLabel}:
                          </strong>
                          <p
                            style={{ color: "#E5E7EB" }}
                            className="whitespace-pre-wrap leading-relaxed bg-[#0B0B0C] p-3.5 border border-[#00D4FF]/30"
                          >
                            {selectedProduct.description}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#00D4FF]/35 flex flex-col sm:flex-row items-stretch gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const prod = selectedProduct;
                          setSelectedProduct(null);
                          handleOpenBookingModal(prod);
                        }}
                        className="flex-1 py-3.5 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                      >
                        Book This Product
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedProduct(null)}
                        style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
                        className="px-5 py-3.5 bg-[#0B0B0C] hover:border-[#FF6B6B] text-xs font-bold uppercase tracking-wider text-glossy-gold cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Customer Book Product Popup Modal */}
      {bookingProduct && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setBookingProduct(null)}
        >
          <div
            style={{
              backgroundColor: "#111114",
              border: "1.5px solid rgba(255, 30, 39, 0.65)",
              boxShadow: "0 0 40px rgba(255, 30, 39, 0.25)",
              maxHeight: "90vh",
            }}
            className="relative w-full max-w-lg p-6 sm:p-8 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
              className="flex items-center justify-between pb-3 mb-4"
            >
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-glossy-gold">
                Book Product
              </h3>
              <button
                type="button"
                onClick={() => setBookingProduct(null)}
                style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
                className="w-8 h-8 flex items-center justify-center bg-[#0B0B0C] text-glossy-gold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Selected Product Summary */}
            <div className="flex items-center gap-3.5 p-3 mb-4 bg-[#0B0B0C] border border-[#00D4FF]/40">
              <div className="w-16 h-16 bg-[#141417] border border-[#00D4FF]/35 flex items-center justify-center overflow-hidden shrink-0">
                {bookingProduct.images?.[0] ? (
                  <img
                    src={bookingProduct.images[0]}
                    alt={bookingProduct.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] uppercase text-glossy-gold opacity-60">
                    No Img
                  </span>
                )}
              </div>
              <div>
                {(isAdmin ||
                  bookingProduct.fieldSettings?.nameVisible !== false) &&
                  bookingProduct.name && (
                    <h4 className="text-sm font-bold uppercase tracking-wider text-glossy-gold">
                      {bookingProduct.name}
                    </h4>
                  )}
                {(isAdmin ||
                  bookingProduct.fieldSettings?.priceVisible !== false) &&
                  bookingProduct.price && (
                    <p className="text-xs font-semibold text-glossy-gold mt-0.5">
                      {bookingProduct.fieldSettings?.priceLabel || "Price"}:{" "}
                      {bookingProduct.price}
                    </p>
                  )}
              </div>
            </div>

            {bookingError && (
              <div className="mb-4 p-3 border border-red-500/60 bg-red-950/40 text-xs text-red-200">
                {bookingError}
              </div>
            )}

            {bookingSuccess ? (
              <div className="space-y-4">
                <div className="p-4 border border-[#FF1E27]/65 bg-[#FF1E27]/15 text-xs sm:text-sm text-glossy-gold">
                  {bookingSuccess}
                </div>
                <button
                  type="button"
                  onClick={() => setBookingProduct(null)}
                  className="w-full py-3 bg-[#1A1215] border border-[#00D4FF]/70 text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={bookQty}
                      onChange={(e) => setBookQty(e.target.value)}
                      className="auth-input w-full px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      placeholder="Enter your name"
                      className="auth-input w-full px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookPhone}
                      onChange={(e) => setBookPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="auth-input w-full px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={bookEmail}
                      onChange={(e) => setBookEmail(e.target.value)}
                      placeholder="Enter email"
                      className="auth-input w-full px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1">
                    Delivery / Contact Address
                  </label>
                  <input
                    type="text"
                    value={bookAddress}
                    onChange={(e) => setBookAddress(e.target.value)}
                    placeholder="Enter your address"
                    className="auth-input w-full px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1">
                    Note / Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bookNote}
                    onChange={(e) => setBookNote(e.target.value)}
                    placeholder="Any size, color, or booking note..."
                    className="auth-input w-full px-3 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingBusy}
                  className="w-full py-3 mt-2 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                >
                  {bookingBusy ? "Submitting Booking..." : "Confirm Booking"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Modal when opened from the Category Page */}
      <ProductsManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        categorySlug={slug}
        categoryLabel={categoryLabel}
      />
    </div>
  );
}
