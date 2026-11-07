"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_FIELD_SETTINGS,
  ProductFieldSettings,
  ProductItem,
} from "./ProductsManagerModal";

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export default function ProductSearchModal({
  isOpen,
  onClose,
  isAdmin,
}: ProductSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Booking State
  const [bookingProduct, setBookingProduct] = useState<ProductItem | null>(null);
  const [bookQty, setBookQty] = useState("1");
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookAddress, setBookAddress] = useState("");
  const [bookNote, setBookNote] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Load all products when opened
  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (Array.isArray(data?.products)) {
        setAllProducts(data.products);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      // Auto-focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setSelectedProduct(null);
      setBookingProduct(null);
    }
  }, [isOpen]);

  // Keep products synced
  useEffect(() => {
    const handleRefresh = () => {
      if (isOpen) loadProducts();
    };
    window.addEventListener("furious-products-change", handleRefresh);
    return () => {
      window.removeEventListener("furious-products-change", handleRefresh);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (bookingProduct) {
          setBookingProduct(null);
        } else if (selectedProduct) {
          setSelectedProduct(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedProduct, bookingProduct, onClose]);

  // Load authenticated user for auto-filling booking fields
  useEffect(() => {
    if (bookingProduct) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((d) => {
          if (d?.user) {
            setBookName((prev) => prev || d.user.name || "");
            setBookPhone((prev) => prev || d.user.phone || "");
            setBookEmail((prev) => prev || d.user.email || "");
            setBookAddress((prev) => prev || d.user.address || "");
          }
        })
        .catch(() => {});
    }
  }, [bookingProduct]);

  // Real-time live filtering irrespective of case, numeric, alphanumeric, special characters
  const trimmedQuery = query.trim().toLowerCase();
  const searchResults: ProductItem[] =
    trimmedQuery.length >= 1
      ? allProducts.filter((p) => {
          const name = (p.name || "").toLowerCase();
          const brand = (p.brand || "").toLowerCase();
          const catLabel = (p.categoryLabel || "").toLowerCase();
          const catSlug = (p.categorySlug || "").toLowerCase();
          const code = (p.productCode || "").toLowerCase();
          const uid = (p.uidNumber || "").toLowerCase();
          const model = (p.modelNumber || "").toLowerCase();
          const desc = (p.description || "").toLowerCase();
          const price = (p.price || "").toLowerCase();
          const stock = String(p.stockQuantity ?? "").toLowerCase();

          const customMatch = (p.customFields || []).some(
            (cf) =>
              (cf.label || "").toLowerCase().includes(trimmedQuery) ||
              (cf.value || "").toLowerCase().includes(trimmedQuery)
          );

          return (
            name.includes(trimmedQuery) ||
            brand.includes(trimmedQuery) ||
            catLabel.includes(trimmedQuery) ||
            catSlug.includes(trimmedQuery) ||
            code.includes(trimmedQuery) ||
            uid.includes(trimmedQuery) ||
            model.includes(trimmedQuery) ||
            desc.includes(trimmedQuery) ||
            price.includes(trimmedQuery) ||
            stock.includes(trimmedQuery) ||
            customMatch
          );
        })
      : [];

  const handleOpenBooking = (product: ProductItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookingProduct(product);
    setBookQty("1");
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
      setBookingError("Your Name and Phone Number are required.");
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
          categorySlug: bookingProduct.categorySlug,
          categoryLabel: bookingProduct.categoryLabel,
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
        setBookingSuccess("Booking placed successfully! Admin will review it.");
        window.dispatchEvent(new Event("furious-bookings-change"));
        setTimeout(() => {
          setBookingProduct(null);
          setBookingSuccess(null);
        }, 1800);
      }
    } catch {
      setBookingError("Network error while submitting booking.");
    } finally {
      setBookingBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Main Search Modal Box */}
      <div
        style={{
          backgroundColor: "#0D0D10",
          border: "1.5px solid rgba(255, 30, 39, 0.65)",
          boxShadow:
            "0 15px 45px rgba(0, 0, 0, 0.95), 0 0 35px rgba(255, 30, 39, 0.25)",
        }}
        className="relative w-full max-w-4xl my-6 rounded-2xl overflow-hidden flex flex-col z-10 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
          className="flex items-center justify-between px-5 sm:px-7 py-4 bg-[#141417]"
        >
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-5 rounded-full bg-[#FF1E27] shadow-[0_0_8px_#FF1E27]" />
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-widest text-glossy-gold">
              Product Search
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
            className="w-7 h-7 flex items-center justify-center text-sm bg-[#0B0B0C] text-glossy-gold hover:border-[#FF6B6B] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-4 sm:p-6 bg-[#0E0E12] border-b border-[#00D4FF]/25">
          <div className="relative flex items-center">
            {/* Search Icon */}
            <div className="absolute left-4 pointer-events-none flex items-center justify-center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="#FF1E27"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 20L16.5 16.5"
                  stroke="#FF1E27"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, brand, code, UID, model, category, price..."
              style={{
                backgroundColor: "#141417",
                border: "1.5px solid rgba(255, 30, 39, 0.55)",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
              }}
              className="w-full pl-12 pr-12 py-3.5 text-sm sm:text-base text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:border-[#FF5A5F] focus:shadow-[0_0_20px_rgba(255,30,39,0.35)] transition-all"
            />

            {/* Clear Button */}
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-4 w-6 h-6 flex items-center justify-center text-xs text-gray-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Meta Status */}
          <div className="flex items-center justify-between mt-2.5 px-1 text-xs text-gray-400">
            <span>
              {trimmedQuery.length === 0
                ? "Start typing to search products in real-time"
                : `Showing results for "${query}"`}
            </span>
            {trimmedQuery.length >= 1 && (
              <span className="font-semibold text-glossy-gold">
                {searchResults.length} matching item
                {searchResults.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {/* State 1: User hasn't typed anything yet */}
          {trimmedQuery.length === 0 ? (
            <div className="py-14 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#141417] border border-[#FF1E27]/50 shadow-[0_0_20px_rgba(255,30,39,0.2)] flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="#FF1E27"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 20L16.5 16.5"
                    stroke="#FF1E27"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-glossy-gold">
                Type To Search Anything
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                As soon as you type a single character, all matching products
                appear instantly. When you delete characters, they disappear.
                Irrespective of capital/small letters, numbers, or words.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            /* State 2: No matches found */
            <div className="py-14 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#1A0D10] border border-red-500/50 flex items-center justify-center text-red-400 text-xl font-bold">
                ✕
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-red-400">
                No Products Found
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
                No products match &ldquo;{query}&rdquo;. Try another name, code,
                brand, or model number.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                className="mt-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#141417] text-glossy-gold hover:border-[#FF6B6B] transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* State 3: Display matching product cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {searchResults.map((product) => {
                const fs: ProductFieldSettings = {
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
                    : 1;
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
                      border: "1.5px solid rgba(255, 30, 39, 0.5)",
                      boxShadow: "0 0 16px rgba(255, 30, 39, 0.15)",
                    }}
                    className="flex flex-col rounded-xl overflow-hidden hover:border-[#FF5A5F] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(255,30,39,0.3)] transition-all duration-300 cursor-pointer group"
                  >
                    {/* Thumbnail Image */}
                    <div className="w-full h-44 bg-[#141417] border-b border-[#00D4FF]/30 flex items-center justify-center p-3 overflow-hidden relative">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name || "Product"}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">
                          No Image
                        </span>
                      )}

                      {/* Category Badge */}
                      <span
                        style={{
                          backgroundColor: "rgba(14, 14, 18, 0.9)",
                          border: "1px solid rgba(0, 212, 255, 0.5)",
                        }}
                        className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-glossy-gold"
                      >
                        {product.categoryLabel || product.categorySlug}
                      </span>

                      {/* Brand Badge (if present) */}
                      {product.brand && (
                        <span
                          style={{
                            backgroundColor: "rgba(255, 30, 39, 0.2)",
                            border: "1px solid rgba(255, 30, 39, 0.6)",
                          }}
                          className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200"
                        >
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        {/* Product Name */}
                        {showName && (
                          <h4 className="text-sm font-bold uppercase tracking-wider text-glossy-gold line-clamp-1 group-hover:text-white transition-colors">
                            {product.name}
                          </h4>
                        )}

                        {/* Admin Badge if name hidden from customer */}
                        {isAdmin && fs.nameVisible === false && (
                          <span className="inline-block text-[9px] px-1.5 py-0.5 bg-yellow-950/60 border border-yellow-500/50 text-yellow-300">
                            Name Hidden from Customers
                          </span>
                        )}

                        {/* Price & Stock Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {showPrice && (
                            <span
                              style={{
                                border: "1px solid rgba(0, 212, 255, 0.4)",
                              }}
                              className="px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-glossy-gold bg-[#141417]"
                            >
                              {fs.priceLabel || "Price"}: {product.price}
                            </span>
                          )}

                          {showStock && (
                            <span
                              style={{
                                border: "1px solid rgba(255, 30, 39, 0.45)",
                              }}
                              className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-[#141417] ${
                                currentStock > 0
                                  ? "text-glossy-gold"
                                  : "text-red-300"
                              }`}
                            >
                              {fs.stockQuantityLabel || "Available Stock"}:{" "}
                              {currentStock}
                            </span>
                          )}
                        </div>

                        {/* Model / Code / UID Pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-gray-300">
                          {showCode && (
                            <span className="px-1.5 py-0.5 bg-[#141417] border border-gray-700">
                              {fs.productCodeLabel || "Code"}:{" "}
                              {product.productCode}
                            </span>
                          )}
                          {showModel && (
                            <span className="px-1.5 py-0.5 bg-[#141417] border border-gray-700">
                              {fs.modelNumberLabel || "Model"}:{" "}
                              {product.modelNumber}
                            </span>
                          )}
                          {showUid && (
                            <span className="px-1.5 py-0.5 bg-[#141417] border border-gray-700">
                              {fs.uidNumberLabel || "UID"}: {product.uidNumber}
                            </span>
                          )}
                        </div>

                        {/* Description Preview */}
                        {showDesc && (
                          <p className="text-xs text-gray-400 line-clamp-2 pt-1 leading-relaxed">
                            {product.description}
                          </p>
                        )}

                        {/* Custom Fields */}
                        {visibleCustomFields.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {visibleCustomFields.slice(0, 2).map((cf) => (
                              <span
                                key={cf.id}
                                className="text-[10px] px-2 py-0.5 bg-[#18181D] border border-[#00D4FF]/30 text-gray-200"
                              >
                                <strong>{cf.label}:</strong> {cf.value}
                              </span>
                            ))}
                            {visibleCustomFields.length > 2 && (
                              <span className="text-[10px] px-1 text-gray-500">
                                +{visibleCustomFields.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-[#00D4FF]/20 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setActiveImageIdx(0);
                          }}
                          style={{
                            border: "1px solid rgba(255, 30, 39, 0.6)",
                          }}
                          className="flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#141417] text-glossy-gold hover:border-[#FF5A5F] hover:bg-[#1C1417] transition-all cursor-pointer text-center"
                        >
                          View Details
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleOpenBooking(product, e)}
                          style={{
                            border: "1px solid rgba(0, 212, 255, 0.6)",
                          }}
                          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#141417] text-cyan-300 hover:border-[#7DF9FF] hover:bg-[#12181C] transition-all cursor-pointer"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL POPUP FOR A CLICKED PRODUCT */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          <div
            style={{
              backgroundColor: "#0D0D10",
              border: "1.5px solid rgba(255, 30, 39, 0.65)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.95)",
            }}
            className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-y-auto z-10 flex flex-col p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#00D4FF]/35 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#FF1E27]" />
                <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-glossy-gold">
                  {selectedProduct.name || "Product Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                className="w-7 h-7 flex items-center justify-center text-xs bg-[#0B0B0C] text-glossy-gold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Gallery */}
            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div className="space-y-3">
                <div className="w-full h-64 sm:h-80 bg-[#141417] border border-[#00D4FF]/35 rounded-xl flex items-center justify-center p-3 overflow-hidden">
                  <img
                    src={selectedProduct.images[activeImageIdx]}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                {selectedProduct.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {selectedProduct.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImageIdx(i)}
                        style={{
                          border:
                            i === activeImageIdx
                              ? "2px solid #FF1E27"
                              : "1px solid rgba(0, 212, 255, 0.3)",
                        }}
                        className="w-14 h-14 bg-[#141417] rounded-lg overflow-hidden shrink-0 cursor-pointer"
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Full Specifications according to Admin Preferences */}
            <div className="space-y-3 bg-[#111114] p-4 rounded-xl border border-[#00D4FF]/25 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div className="p-2.5 bg-[#141417] border border-gray-800">
                  <span className="text-[10px] uppercase text-gray-400 block font-bold">
                    Category
                  </span>
                  <span className="text-glossy-gold font-semibold uppercase">
                    {selectedProduct.categoryLabel ||
                      selectedProduct.categorySlug}
                  </span>
                </div>

                {/* Brand */}
                {selectedProduct.brand && (
                  <div className="p-2.5 bg-[#141417] border border-gray-800">
                    <span className="text-[10px] uppercase text-gray-400 block font-bold">
                      Brand
                    </span>
                    <span className="text-gray-100 font-semibold uppercase">
                      {selectedProduct.brand}
                    </span>
                  </div>
                )}

                {/* Price (if visible to user or admin) */}
                {(!selectedProduct.fieldSettings?.priceDeleted || isAdmin) &&
                  selectedProduct.price &&
                  (isAdmin ||
                    selectedProduct.fieldSettings?.priceVisible !== false) && (
                    <div className="p-2.5 bg-[#141417] border border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 block font-bold">
                        {selectedProduct.fieldSettings?.priceLabel || "Price"}
                      </span>
                      <span className="text-glossy-gold font-bold">
                        {selectedProduct.price}
                      </span>
                    </div>
                  )}

                {/* Available Stock */}
                {(!selectedProduct.fieldSettings?.stockQuantityDeleted ||
                  isAdmin) &&
                  (isAdmin ||
                    selectedProduct.fieldSettings?.stockQuantityVisible !==
                      false) && (
                    <div className="p-2.5 bg-[#141417] border border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 block font-bold">
                        {selectedProduct.fieldSettings?.stockQuantityLabel ||
                          "Available Stock"}
                      </span>
                      <span className="text-glossy-gold font-bold">
                        {typeof selectedProduct.stockQuantity === "number"
                          ? selectedProduct.stockQuantity
                          : 1}
                      </span>
                    </div>
                  )}

                {/* Product Code */}
                {(!selectedProduct.fieldSettings?.productCodeDeleted ||
                  isAdmin) &&
                  selectedProduct.productCode &&
                  (isAdmin ||
                    selectedProduct.fieldSettings?.productCodeVisible !==
                      false) && (
                    <div className="p-2.5 bg-[#141417] border border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 block font-bold">
                        {selectedProduct.fieldSettings?.productCodeLabel ||
                          "Product Code"}
                      </span>
                      <span className="text-gray-200">
                        {selectedProduct.productCode}
                      </span>
                    </div>
                  )}

                {/* UID Number */}
                {(!selectedProduct.fieldSettings?.uidNumberDeleted || isAdmin) &&
                  selectedProduct.uidNumber &&
                  (isAdmin ||
                    selectedProduct.fieldSettings?.uidNumberVisible !==
                      false) && (
                    <div className="p-2.5 bg-[#141417] border border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 block font-bold">
                        {selectedProduct.fieldSettings?.uidNumberLabel ||
                          "UID Number"}
                      </span>
                      <span className="text-gray-200">
                        {selectedProduct.uidNumber}
                      </span>
                    </div>
                  )}

                {/* Model Number */}
                {(!selectedProduct.fieldSettings?.modelNumberDeleted ||
                  isAdmin) &&
                  selectedProduct.modelNumber &&
                  (isAdmin ||
                    selectedProduct.fieldSettings?.modelNumberVisible !==
                      false) && (
                    <div className="p-2.5 bg-[#141417] border border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 block font-bold">
                        {selectedProduct.fieldSettings?.modelNumberLabel ||
                          "Model Number"}
                      </span>
                      <span className="text-gray-200">
                        {selectedProduct.modelNumber}
                      </span>
                    </div>
                  )}
              </div>

              {/* Description */}
              {(!selectedProduct.fieldSettings?.descriptionDeleted || isAdmin) &&
                selectedProduct.description &&
                (isAdmin ||
                  selectedProduct.fieldSettings?.descriptionVisible !==
                    false) && (
                  <div className="p-2.5 bg-[#141417] border border-gray-800 space-y-1">
                    <span className="text-[10px] uppercase text-gray-400 block font-bold">
                      {selectedProduct.fieldSettings?.descriptionLabel ||
                        "Description"}
                    </span>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

              {/* Custom Fields */}
              {selectedProduct.customFields &&
                selectedProduct.customFields.filter(
                  (cf) => isAdmin || cf.visibleToCustomer !== false
                ).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-gray-800">
                    <span className="text-[10px] uppercase text-gray-400 block font-bold">
                      Additional Specifications
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedProduct.customFields
                        .filter(
                          (cf) => isAdmin || cf.visibleToCustomer !== false
                        )
                        .map((cf) => (
                          <div
                            key={cf.id}
                            className="p-2 bg-[#141417] border border-gray-800 text-xs"
                          >
                            <span className="text-gray-400 font-semibold block">
                              {cf.label}
                            </span>
                            <span className="text-gray-200 font-medium">
                              {cf.value}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link
                href={`/category/${selectedProduct.categorySlug}`}
                onClick={() => {
                  setSelectedProduct(null);
                  onClose();
                }}
                style={{ border: "1px solid rgba(0, 212, 255, 0.5)" }}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#141417] text-glossy-gold hover:border-[#7DF9FF] transition-colors"
              >
                Go to {selectedProduct.categoryLabel || "Category"} →
              </Link>

              <button
                type="button"
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  handleOpenBooking(p);
                }}
                style={{
                  border: "1.5px solid rgba(255, 30, 39, 0.7)",
                  boxShadow: "0 0 15px rgba(255, 30, 39, 0.3)",
                }}
                className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-[#1A0D10] text-glossy-gold hover:border-[#FF5A5F] hover:bg-[#251014] transition-all cursor-pointer"
              >
                Book This Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSTANT BOOKING MODAL */}
      {bookingProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setBookingProduct(null)}
          />
          <div
            style={{
              backgroundColor: "#0D0D10",
              border: "1.5px solid rgba(0, 212, 255, 0.65)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.95)",
            }}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden z-10 flex flex-col p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#00D4FF]/30 pb-3">
              <h3 className="text-base font-bold uppercase tracking-wider text-glossy-gold">
                Book Product
              </h3>
              <button
                type="button"
                onClick={() => setBookingProduct(null)}
                style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                className="w-7 h-7 flex items-center justify-center text-xs bg-[#0B0B0C] text-glossy-gold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#141417] border border-[#00D4FF]/30 rounded-xl">
              <div className="w-14 h-14 bg-[#0B0B0C] border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                {bookingProduct.images?.[0] ? (
                  <img
                    src={bookingProduct.images[0]}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-gray-500">Item</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-glossy-gold truncate">
                  {bookingProduct.name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {bookingProduct.categoryLabel}
                </p>
                {bookingProduct.price && (
                  <p className="text-xs font-semibold text-white">
                    {bookingProduct.price}
                  </p>
                )}
              </div>
            </div>

            {bookingError && (
              <div className="p-3 bg-red-950/50 border border-red-500/60 text-xs text-red-200">
                {bookingError}
              </div>
            )}
            {bookingSuccess && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/60 text-xs text-emerald-200">
                {bookingSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 text-xs bg-[#141417] border border-gray-700 focus:border-[#00D4FF] focus:outline-none text-white rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 text-xs bg-[#141417] border border-gray-700 focus:border-[#00D4FF] focus:outline-none text-white rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={bookEmail}
                    onChange={(e) => setBookEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full px-3 py-2 text-xs bg-[#141417] border border-gray-700 focus:border-[#00D4FF] focus:outline-none text-white rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bookQty}
                    onChange={(e) => setBookQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#141417] border border-gray-700 focus:border-[#00D4FF] focus:outline-none text-white rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={bookAddress}
                  onChange={(e) => setBookAddress(e.target.value)}
                  placeholder="Street, City, Postal Code"
                  className="w-full px-3 py-2 text-xs bg-[#141417] border border-gray-700 focus:border-[#00D4FF] focus:outline-none text-white rounded"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  Note / Special Instructions
                </label>
                <textarea
                  rows={2}
                  value={bookNote}
                  onChange={(e) => setBookNote(e.target.value)}
                  placeholder="Any customization, preferred time, or note..."
                  className="w-full px-3 py-2 text-xs bg-[#141417] border border-gray-700 focus:border-[#00D4FF] focus:outline-none text-white rounded resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingProduct(null)}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#141417] text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingBusy}
                  style={{
                    border: "1.5px solid rgba(0, 212, 255, 0.7)",
                    boxShadow: "0 0 15px rgba(0, 212, 255, 0.25)",
                  }}
                  className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-[#141417] text-glossy-gold hover:border-[#7DF9FF] transition-all cursor-pointer disabled:opacity-50"
                >
                  {bookingBusy ? "Submitting..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

