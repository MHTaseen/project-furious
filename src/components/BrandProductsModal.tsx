"use client";

import React, { useEffect, useState } from "react";
import ProductsManagerModal, {
  DEFAULT_FIELD_SETTINGS,
  ProductItem,
} from "@/components/ProductsManagerModal";

interface BrandProductsModalProps {
  isOpen: boolean;
  brandName: string;
  brandLogoSrc?: string;
  onClose: () => void;
}

export default function BrandProductsModal({
  isOpen,
  brandName,
  brandLogoSrc,
  onClose,
}: BrandProductsModalProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);
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

  const loadBrandProducts = async () => {
    if (!brandName) return;
    setLoading(true);
    try {
      const [prodRes, meRes] = await Promise.all([
        fetch(`/api/products?brand=${encodeURIComponent(brandName)}`),
        fetch("/api/auth/me"),
      ]);
      const prodData = await prodRes.json();
      const meData = await meRes.json();

      if (Array.isArray(prodData?.products)) {
        setProducts(prodData.products);
        setSelectedProduct((prev) => {
          if (!prev) return null;
          return (
            prodData.products.find((p: ProductItem) => p.id === prev.id) || null
          );
        });
      }
      setIsAdmin(meData?.user?.role === "admin");
      setCurrentUser(meData?.user || null);
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !brandName) return;
    loadBrandProducts();

    const handleRefresh = () => loadBrandProducts();
    window.addEventListener("furious-products-change", handleRefresh);
    window.addEventListener("furious-auth-change", handleRefresh);
    return () => {
      window.removeEventListener("furious-products-change", handleRefresh);
      window.removeEventListener("furious-auth-change", handleRefresh);
    };
  }, [isOpen, brandName]);

  if (!isOpen) return null;

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
          categorySlug: bookingProduct.categorySlug || "brand-product",
          categoryLabel: bookingProduct.categoryLabel || brandName,
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
    <>
      <div
        className="fixed inset-0 z-[115] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-6"
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "#111114",
            border: "1.5px solid rgba(255, 30, 39, 0.7)",
            boxShadow:
              "0 0 40px rgba(255, 30, 39, 0.25), 0 24px 55px rgba(0, 0, 0, 0.9)",
            maxHeight: "92vh",
          }}
          className="relative w-full max-w-6xl p-5 sm:p-8 flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Brand Popup Header */}
          <div
            style={{ borderBottom: "1.5px solid rgba(255, 30, 39, 0.45)" }}
            className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 shrink-0"
          >
            <div className="flex items-center gap-4">
              {brandLogoSrc && (
                <div className="w-20 h-14 bg-white border border-[#00D4FF]/60 p-1.5 flex items-center justify-center shrink-0">
                  <img
                    src={brandLogoSrc}
                    alt={brandName}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <span className="text-[11px] uppercase tracking-widest text-glossy-gold opacity-80 block">
                  Official Brand Products List
                </span>
                <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold">
                  {brandName} Products ({products.length})
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsManagerOpen(true)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                >
                  + Add / Manage {brandName} Products
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close brand products popup"
                style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                className="w-10 h-10 flex items-center justify-center text-base font-bold bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Brand Products List Body */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <p className="py-12 text-center text-sm uppercase tracking-wider text-glossy-gold">
                Loading {brandName} products...
              </p>
            ) : products.length === 0 ? (
              <div className="py-14 text-center space-y-4">
                <p className="text-sm uppercase tracking-wider text-glossy-gold opacity-85">
                  No products published under {brandName} yet.
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsManagerOpen(true)}
                    className="px-5 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                  >
                    + Publish First {brandName} Product
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  const visibleCustomFields = (
                    product.customFields || []
                  ).filter((cf) => isAdmin || cf.visibleToCustomer !== false);

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setActiveImageIdx(0);
                      }}
                      style={{
                        backgroundColor: "#0B0B0C",
                        border: "1.5px solid rgba(255, 30, 39, 0.55)",
                        boxShadow: "0 0 18px rgba(255, 30, 39, 0.16)",
                      }}
                      className="flex flex-col overflow-hidden hover:border-[#FF6B6B] transition-all cursor-pointer group"
                    >
                      {/* Product Image */}
                      <div className="w-full h-52 bg-[#141417] border-b border-[#00D4FF]/35 flex items-center justify-center p-3 overflow-hidden">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name || brandName}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-xs uppercase tracking-wider text-glossy-gold opacity-50">
                            No Image
                          </span>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] uppercase border border-[#00D4FF]/45 text-glossy-gold">
                              {product.categoryLabel}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase border border-[#FF1E27]/65 text-glossy-gold bg-[#1A1215]">
                              {product.brand || brandName}
                            </span>
                          </div>

                          {showName && (
                            <h3 className="text-base font-bold uppercase tracking-wider text-glossy-gold pt-0.5">
                              {product.name}
                            </h3>
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
                              className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-2.5 bg-[#111114] border border-[#00D4FF]/35"
                              onClick={(e) => isAdmin && e.stopPropagation()}
                            >
                              <span
                                className={`text-xs font-bold uppercase tracking-wider ${
                                  currentStock > 0
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
                                      border:
                                        "1px solid rgba(255, 80, 80, 0.65)",
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
                                      border:
                                        "1px solid rgba(0, 212, 255, 0.65)",
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
                            style={{
                              border: "1px solid rgba(255, 30, 39, 0.65)",
                            }}
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
          </div>
        </div>
      </div>

      {/* FULL-SCREEN PRODUCT VIEW WHEN CLICKING ANY BRAND PRODUCT */}
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
              className="fixed inset-0 z-[125] bg-[#080809]/98 backdrop-blur-md flex flex-col overflow-y-auto"
              onClick={() => setSelectedProduct(null)}
            >
              <div
                className="w-full min-h-screen flex flex-col p-6 sm:p-10 max-w-7xl mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{ borderBottom: "1.5px solid rgba(255, 30, 39, 0.45)" }}
                  className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 shrink-0"
                >
                  <div>
                    <span className="text-xs uppercase tracking-widest text-glossy-gold opacity-80">
                      {brandName} — {selectedProduct.categoryLabel}
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
                      aria-label="Close full screen product view"
                      style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                      className="w-10 h-10 flex items-center justify-center text-base font-bold bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
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
                          alt={selectedProduct.name || brandName}
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
                            className={`w-20 h-20 bg-[#0B0B0C] border-2 p-1.5 shrink-0 cursor-pointer transition-all ${
                              activeImageIdx === idx
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
                            className={`text-xl font-extrabold ${
                              selectedStock > 0
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

      {/* Customer Booking Modal inside Brand Popup */}
      {bookingProduct && (
        <div
          className="fixed inset-0 z-[135] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
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
                Book {brandName} Product
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
                  className="w-full py-2.5 bg-[#1A1215] border border-[#00D4FF]/65 text-xs font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="space-y-3.5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-glossy-gold mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookQty}
                    onChange={(e) => setBookQty(e.target.value)}
                    className="auth-input w-full px-3.5 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-glossy-gold mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder="Enter your name"
                    className="auth-input w-full px-3.5 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-glossy-gold mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookPhone}
                    onChange={(e) => setBookPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="auth-input w-full px-3.5 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-glossy-gold mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={bookAddress}
                    onChange={(e) => setBookAddress(e.target.value)}
                    placeholder="Your address"
                    className="auth-input w-full px-3.5 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-glossy-gold mb-1">
                    Order Note / Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bookNote}
                    onChange={(e) => setBookNote(e.target.value)}
                    placeholder="Any specific model, size, or question..."
                    className="auth-input w-full px-3.5 py-2 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingBusy}
                  className="w-full py-3 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                >
                  {bookingBusy ? "Sending Booking..." : "Confirm Product Booking"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Admin Products Manager Modal pre-filled with this Brand */}
      <ProductsManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        defaultBrand={brandName}
      />
    </>
  );
}

