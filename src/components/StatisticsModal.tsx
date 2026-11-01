"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ProductItem } from "./ProductsManagerModal";

export interface CustomSaleField {
  id: string;
  label: string;
  value: string;
}

export interface SoldProductItem {
  id: string;
  productId: string;
  productImage: string;
  productName: string;
  productCode?: string;
  uidNumber: string;
  modelNumber?: string;
  categoryLabel?: string;
  description?: string;
  customFields?: CustomSaleField[];
  price: number;
  priceDisplay: string;
  quantity: number;
  soldDate: string; // YYYY-MM-DD
  createdAt: string;
}

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateDMY(isoDate: string): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function StatisticsModal({
  isOpen,
  onClose,
}: StatisticsModalProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [sales, setSales] = useState<SoldProductItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sold Products Section Tabs:
  // "history" = Sold Products List (Image, Name, UID, Date DD/MM/YYYY)
  // "ranking" = Product Name & Quantity Sold ranking (most sold / selling good)
  // "record"  = Input / Modify Any Sold Product & Product Details
  const [soldTab, setSoldTab] = useState<"history" | "ranking" | "record">(
    "history"
  );

  // Full-Screen View or Editing a Sold Product Record
  const [viewingSale, setViewingSale] = useState<SoldProductItem | null>(null);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);

  // Record / Input Any Sold Product & Details Form State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [saleImage, setSaleImage] = useState<string>("");
  const [customProductName, setCustomProductName] = useState<string>("");
  const [customCategoryLabel, setCustomCategoryLabel] = useState<string>("");
  const [customProductCode, setCustomProductCode] = useState<string>("");
  const [customUid, setCustomUid] = useState<string>("");
  const [customModelNumber, setCustomModelNumber] = useState<string>("");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [customSaleFields, setCustomSaleFields] = useState<CustomSaleField[]>(
    []
  );
  const [customPrice, setCustomPrice] = useState<string>("");
  const [saleQuantity, setSaleQuantity] = useState<string>("1");
  const [saleDate, setSaleDate] = useState<string>(getLocalDateStr());

  const saleImageInputRef = useRef<HTMLInputElement | null>(null);

  // Business Analytics State:
  // Buttons under graph chart: "Todays sale" ("daily"), "Monthly Sale" ("monthly"), "Yearly sale" ("yearly")
  const [analyticsMode, setAnalyticsMode] = useState<
    "daily" | "monthly" | "yearly"
  >("daily");
  const [metricType, setMetricType] = useState<"amount" | "quantity">(
    "amount"
  );

  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    now.getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const resetSaleForm = () => {
    setEditingSaleId(null);
    setSelectedProductId("");
    setSaleImage("");
    setCustomProductName("");
    setCustomCategoryLabel("");
    setCustomProductCode("");
    setCustomUid("");
    setCustomModelNumber("");
    setCustomDescription("");
    setCustomSaleFields([]);
    setCustomPrice("");
    setSaleQuantity("1");
    setSaleDate(getLocalDateStr());
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/products"),
      ]);
      const salesData = await salesRes.json();
      const prodData = await prodRes.json();

      if (Array.isArray(salesData?.sales)) {
        setSales(salesData.sales);
      }
      if (Array.isArray(prodData?.products)) {
        setProducts(prodData.products);
      }
    } catch {
      setError("Failed to load statistics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedCard(null);
      setError(null);
      setSuccessMsg(null);
      setViewingSale(null);
      setSoldTab("history");
      setAnalyticsMode("daily");
      setSelectedDate(getLocalDateStr());
      resetSaleForm();
      loadAllData();
    }
  }, [isOpen]);

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const matched = products.find((p) => p.id === prodId);
    if (matched) {
      setSaleImage(matched.images?.[0] || "");
      setCustomProductName(matched.name || "");
      setCustomCategoryLabel(matched.categoryLabel || "");
      setCustomProductCode(matched.productCode || "");
      setCustomUid(matched.uidNumber || "");
      setCustomModelNumber(matched.modelNumber || "");
      setCustomDescription(matched.description || "");
      setCustomPrice(matched.price || "");
      if (Array.isArray(matched.customFields)) {
        setCustomSaleFields(
          matched.customFields.map((cf) => ({
            id: `scf-${Date.now()}-${Math.random()}`,
            label: cf.label,
            value: cf.value,
          }))
        );
      }
    }
  };

  const handleSaleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSaleImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddCustomSaleField = () => {
    setCustomSaleFields((prev) => [
      ...prev,
      { id: `scf-${Date.now()}-${Math.random()}`, label: "", value: "" },
    ]);
  };

  const handleUpdateCustomSaleField = (
    id: string,
    key: "label" | "value",
    val: string
  ) => {
    setCustomSaleFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: val } : f))
    );
  };

  const handleRemoveCustomSaleField = (id: string) => {
    setCustomSaleFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartEditSale = (item: SoldProductItem) => {
    setError(null);
    setSuccessMsg(null);
    setViewingSale(null);
    setEditingSaleId(item.id);
    setSelectedProductId(item.productId || "");
    setSaleImage(item.productImage || "");
    setCustomProductName(item.productName || "");
    setCustomCategoryLabel(item.categoryLabel || "");
    setCustomProductCode(item.productCode || "");
    setCustomUid(item.uidNumber || "");
    setCustomModelNumber(item.modelNumber || "");
    setCustomDescription(item.description || "");
    setCustomSaleFields(
      Array.isArray(item.customFields)
        ? item.customFields.map((cf) => ({ ...cf }))
        : []
    );
    setCustomPrice(item.priceDisplay || String(item.price || ""));
    setSaleQuantity(String(item.quantity || 1));
    setSaleDate(item.soldDate || getLocalDateStr());
    setSelectedCard("Sold Products");
    setSoldTab("record");
  };

  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const matchedProd = products.find((p) => p.id === selectedProductId);
    const finalName =
      customProductName.trim() || matchedProd?.name || "Sold Product";

    setSaving(true);
    try {
      const isEditing = Boolean(editingSaleId);
      const res = await fetch("/api/sales", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSaleId || undefined,
          productId: selectedProductId,
          productImage: saleImage || matchedProd?.images?.[0] || "",
          productName: finalName,
          categoryLabel:
            customCategoryLabel.trim() || matchedProd?.categoryLabel || "",
          productCode:
            customProductCode.trim() || matchedProd?.productCode || "",
          uidNumber: customUid.trim() || matchedProd?.uidNumber || "",
          modelNumber:
            customModelNumber.trim() || matchedProd?.modelNumber || "",
          description:
            customDescription.trim() || matchedProd?.description || "",
          customFields: customSaleFields,
          price: customPrice.trim() || matchedProd?.price || "0",
          quantity: Math.max(1, parseInt(saleQuantity || "1", 10) || 1),
          soldDate: saleDate || getLocalDateStr(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save sold product record.");
      } else {
        if (Array.isArray(data.sales)) {
          setSales(data.sales);
        } else {
          await loadAllData();
        }
        window.dispatchEvent(new Event("furious-sales-change"));
        setSuccessMsg(
          isEditing
            ? "Sold product record updated & synced with Business Analytics!"
            : "Sold product recorded & added to Business Analytics!"
        );
        resetSaleForm();
        setSoldTab("history");
      }
    } catch {
      setError("Network error while saving sold product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.sales)) {
        setSales(data.sales);
        if (viewingSale?.id === id) setViewingSale(null);
        if (editingSaleId === id) resetSaleForm();
        window.dispatchEvent(new Event("furious-sales-change"));
      }
    } catch {
      setError("Failed to delete sale entry.");
    } finally {
      setSaving(false);
    }
  };

  // Available years from sales records + current year range
  const availableYears = useMemo(() => {
    const currentY = new Date().getFullYear();
    const yearSet = new Set<number>([
      currentY - 3,
      currentY - 2,
      currentY - 1,
      currentY,
      currentY + 1,
    ]);
    sales.forEach((s) => {
      const y = parseInt(s.soldDate?.slice(0, 4), 10);
      if (!isNaN(y)) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [sales]);

  // Product Ranking Aggregation (Product Name + Total Quantity Sold)
  const productSellingRankings = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        productName: string;
        productImage: string;
        uidNumber: string;
        totalQuantity: number;
        totalRevenue: number;
        lastSoldDate: string;
      }
    >();

    sales.forEach((s) => {
      const key = (
        s.productId ||
        s.productName?.toLowerCase() ||
        s.uidNumber ||
        s.id
      ).trim();
      const qty = Number(s.quantity) || 1;
      const rev = (Number(s.price) || 0) * qty;
      const existing = map.get(key);
      if (existing) {
        existing.totalQuantity += qty;
        existing.totalRevenue += rev;
        if (!existing.productImage && s.productImage) {
          existing.productImage = s.productImage;
        }
        if (!existing.uidNumber && s.uidNumber) {
          existing.uidNumber = s.uidNumber;
        }
        if (s.soldDate > existing.lastSoldDate) {
          existing.lastSoldDate = s.soldDate;
        }
      } else {
        map.set(key, {
          key,
          productName: s.productName || "Sold Product",
          productImage: s.productImage,
          uidNumber: s.uidNumber,
          totalQuantity: qty,
          totalRevenue: rev,
          lastSoldDate: s.soldDate,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );
  }, [sales]);

  // Business Analytics Summary Metrics (Today, Yesterday, Selected Date, Selected Month, Selected Year)
  const analyticsSummary = useMemo(() => {
    let todayAmount = 0;
    let todayQty = 0;
    let yesterdayAmount = 0;
    let yesterdayQty = 0;
    let selectedDateAmount = 0;
    let selectedDateQty = 0;
    let selectedMonthAmount = 0;
    let selectedMonthQty = 0;
    let selectedYearAmount = 0;
    let selectedYearQty = 0;

    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0"
    )}`;
    const yearPrefix = `${selectedYear}-`;

    sales.forEach((s) => {
      const qty = Number(s.quantity) || 1;
      const amount = (Number(s.price) || 0) * qty;

      if (s.soldDate === todayStr) {
        todayAmount += amount;
        todayQty += qty;
      }
      if (s.soldDate === yesterdayStr) {
        yesterdayAmount += amount;
        yesterdayQty += qty;
      }
      if (s.soldDate === selectedDate) {
        selectedDateAmount += amount;
        selectedDateQty += qty;
      }
      if (s.soldDate.startsWith(monthPrefix)) {
        selectedMonthAmount += amount;
        selectedMonthQty += qty;
      }
      if (s.soldDate.startsWith(yearPrefix)) {
        selectedYearAmount += amount;
        selectedYearQty += qty;
      }
    });

    return {
      todayAmount,
      todayQty,
      yesterdayAmount,
      yesterdayQty,
      selectedDateAmount,
      selectedDateQty,
      selectedMonthAmount,
      selectedMonthQty,
      selectedYearAmount,
      selectedYearQty,
    };
  }, [
    sales,
    todayStr,
    yesterdayStr,
    selectedDate,
    selectedMonth,
    selectedYear,
  ]);

  // Graph Chart Data Bars based on active mode
  const chartBars = useMemo(() => {
    if (analyticsMode === "daily") {
      const base = new Date(`${selectedDate}T00:00:00`);
      const validBase = isNaN(base.getTime()) ? new Date() : base;
      const bars: {
        label: string;
        subLabel: string;
        amount: number;
        qty: number;
        isHighlight: boolean;
      }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(validBase);
        d.setDate(validBase.getDate() - i);
        const dStr = getLocalDateStr(d);
        let amount = 0;
        let qty = 0;
        sales.forEach((s) => {
          if (s.soldDate === dStr) {
            const q = Number(s.quantity) || 1;
            qty += q;
            amount += (Number(s.price) || 0) * q;
          }
        });

        let tag = formatDateDMY(dStr).slice(0, 5);
        if (dStr === todayStr) tag = "Today";
        else if (dStr === yesterdayStr) tag = "Yesterday";

        bars.push({
          label: tag,
          subLabel: formatDateDMY(dStr),
          amount,
          qty,
          isHighlight: dStr === selectedDate,
        });
      }
      return bars;
    }

    if (analyticsMode === "monthly") {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const bars: {
        label: string;
        subLabel: string;
        amount: number;
        qty: number;
        isHighlight: boolean;
      }[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;
        let amount = 0;
        let qty = 0;
        sales.forEach((s) => {
          if (s.soldDate === dStr) {
            const q = Number(s.quantity) || 1;
            qty += q;
            amount += (Number(s.price) || 0) * q;
          }
        });
        bars.push({
          label: String(day),
          subLabel: formatDateDMY(dStr),
          amount,
          qty,
          isHighlight: dStr === todayStr,
        });
      }
      return bars;
    }

    // "yearly": 12 Months (Jan - Dec) of selectedYear
    const bars: {
      label: string;
      subLabel: string;
      amount: number;
      qty: number;
      isHighlight: boolean;
    }[] = [];

    for (let m = 1; m <= 12; m++) {
      const mPrefix = `${selectedYear}-${String(m).padStart(2, "0")}`;
      let amount = 0;
      let qty = 0;
      sales.forEach((s) => {
        if (s.soldDate.startsWith(mPrefix)) {
          const q = Number(s.quantity) || 1;
          qty += q;
          amount += (Number(s.price) || 0) * q;
        }
      });
      bars.push({
        label: SHORT_MONTH_NAMES[m - 1],
        subLabel: `${MONTH_NAMES[m - 1]} ${selectedYear}`,
        amount,
        qty,
        isHighlight:
          selectedYear === new Date().getFullYear() &&
          m === new Date().getMonth() + 1,
      });
    }
    return bars;
  }, [
    analyticsMode,
    sales,
    selectedDate,
    selectedMonth,
    selectedYear,
    todayStr,
    yesterdayStr,
  ]);

  if (!isOpen) return null;

  const maxChartVal = Math.max(
    1,
    ...chartBars.map((b) => (metricType === "amount" ? b.amount : b.qty))
  );

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
          className={`relative w-full ${
            selectedCard ? "max-w-4xl" : "max-w-2xl"
          } p-6 sm:p-8 flex flex-col transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
            className="flex items-center justify-between pb-3 mb-5 shrink-0"
          >
            <div className="flex items-center gap-3">
              {selectedCard && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCard(null);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                  className="px-2.5 py-1 text-xs uppercase tracking-wider bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                >
                  ← Back
                </button>
              )}
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-glossy-gold">
                {selectedCard || "Statistics"}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Statistics modal"
              style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
              className="w-8 h-8 flex items-center justify-center bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold transition-colors cursor-pointer"
            >
              ✕
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

          {/* MAIN 4 CARDS GRID */}
          {!selectedCard && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Products",
                "Sold Products",
                "Customer Bookings",
                "Business Analytics",
              ].map((cardTitle) => (
                <button
                  key={cardTitle}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setSelectedCard(cardTitle);
                  }}
                  style={{
                    backgroundColor: "#0B0B0C",
                    border: "1.5px solid rgba(255, 30, 39, 0.5)",
                    boxShadow: "0 0 14px rgba(255, 30, 39, 0.15)",
                    minHeight: "7.5rem",
                  }}
                  className="p-6 flex items-center justify-center text-center hover:bg-[#151821] hover:border-[#FF6B6B] transition-all cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold uppercase tracking-[0.16em] text-glossy-gold">
                    {cardTitle}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* =========================================================
              CARD 2: SOLD PRODUCTS
              - Section 1: Sold Products List (Product Image, Name, UID, Date DD/MM/YYYY)
              - Section 2: Most Sold / Selling Performance (Product Name & Quantity of selling)
              - Section 3: Input / Modify Any Sold Product & Product Details
             ========================================================= */}
          {selectedCard === "Sold Products" && (
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col">
              {/* Switch Tabs inside Sold Products Popup */}
              <div
                style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                className="auth-toggle-container shrink-0 mb-4"
              >
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setSoldTab("history");
                  }}
                  className={`auth-toggle-btn ${
                    soldTab === "history" ? "active" : "inactive"
                  }`}
                >
                  <span className="text-glossy-gold">
                    Sold Products List ({sales.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setSoldTab("ranking");
                  }}
                  className={`auth-toggle-btn ${
                    soldTab === "ranking" ? "active" : "inactive"
                  }`}
                >
                  <span className="text-glossy-gold">
                    Top Selling / Quantity Analysis
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setSoldTab("record");
                  }}
                  className={`auth-toggle-btn ${
                    soldTab === "record" ? "active" : "inactive"
                  }`}
                >
                  <span className="text-glossy-gold">
                    {editingSaleId
                      ? "Modify Sold Product"
                      : "+ Input Sold Product"}
                  </span>
                </button>
              </div>

              {/* SUB-SECTION 1: SOLD PRODUCTS LIST (Product Image, Name, UID, Date DD/MM/YYYY) */}
              {soldTab === "history" && (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {loading ? (
                    <p className="py-10 text-center text-sm text-glossy-gold">
                      Loading sold products...
                    </p>
                  ) : sales.length === 0 ? (
                    <div className="py-10 text-center space-y-3 bg-[#0B0B0C] border border-[#00D4FF]/35 p-6">
                      <p className="text-sm text-glossy-gold">
                        No sold products recorded yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          resetSaleForm();
                          setSoldTab("record");
                        }}
                        className="px-4 py-2 text-xs uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/60 text-glossy-gold cursor-pointer"
                      >
                        + Input Sold Product
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#00D4FF]/40 bg-[#0B0B0C]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#00D4FF]/35 bg-[#141417]">
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              Product Image
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              Name & Details
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              UID
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              Date (Date/Month/Year)
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold text-center">
                              Qty
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#00D4FF]/20">
                          {sales.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => setViewingSale(item)}
                              className="hover:bg-[#141417]/70 transition-colors cursor-pointer"
                            >
                              <td className="py-3 px-4">
                                <div className="w-14 h-14 bg-[#141417] border border-[#00D4FF]/40 flex items-center justify-center overflow-hidden">
                                  {item.productImage ? (
                                    <img
                                      src={item.productImage}
                                      alt={item.productName}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[10px] uppercase text-glossy-gold opacity-60">
                                      No Img
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-glossy-gold">
                                  {item.productName}
                                </p>
                                <p
                                  style={{ color: "#9CA3AF" }}
                                  className="text-[11px] mt-0.5"
                                >
                                  Unit Price:{" "}
                                  {item.priceDisplay || `${item.price} BDT`} •
                                  Total:{" "}
                                  {(
                                    (Number(item.price) || 0) *
                                    (Number(item.quantity) || 1)
                                  ).toLocaleString()}{" "}
                                  BDT
                                </p>
                                {(item.productCode || item.modelNumber) && (
                                  <p
                                    style={{ color: "#9CA3AF" }}
                                    className="text-[10px]"
                                  >
                                    {item.productCode &&
                                      `Code: ${item.productCode} `}
                                    {item.modelNumber &&
                                      `• Model: ${item.modelNumber}`}
                                  </p>
                                )}
                              </td>
                              <td
                                style={{ color: "#E5E7EB" }}
                                className="py-3 px-4 text-xs sm:text-sm font-mono"
                              >
                                {item.uidNumber || "—"}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 text-xs font-semibold tracking-wider bg-[#141417] border border-[#00D4FF]/40 text-glossy-gold">
                                  {formatDateDMY(item.soldDate)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-xs sm:text-sm font-bold text-glossy-gold">
                                  {item.quantity || 1}
                                </span>
                              </td>
                              <td
                                className="py-3 px-4 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSale(item)}
                                    className="px-2 py-1 text-[10px] uppercase bg-[#141417] border border-[#00D4FF]/45 text-glossy-gold cursor-pointer"
                                  >
                                    Full View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSale(item)}
                                    className="px-2 py-1 text-[10px] uppercase bg-[#1A1215] border border-[#00D4FF]/55 text-glossy-gold cursor-pointer"
                                  >
                                    Modify
                                  </button>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleDeleteSale(item.id)}
                                    style={{
                                      border:
                                        "1px solid rgba(255, 80, 80, 0.55)",
                                    }}
                                    className="px-2 py-1 text-[10px] uppercase bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-SECTION 2: PRODUCT NAME & QUANTITY OF SELLING (MOST SOLD ANALYSIS) */}
              {soldTab === "ranking" && (
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className="p-3.5 bg-[#0B0B0C] border border-[#00D4FF]/40 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-glossy-gold">
                      Products Ranked by Total Selling Quantity (Highest to
                      Lowest)
                    </span>
                    <span className="text-xs font-bold text-glossy-gold">
                      Total Units Sold:{" "}
                      {productSellingRankings.reduce(
                        (acc, r) => acc + r.totalQuantity,
                        0
                      )}
                    </span>
                  </div>

                  {productSellingRankings.length === 0 ? (
                    <div className="py-10 text-center bg-[#0B0B0C] border border-[#00D4FF]/35 p-6">
                      <p className="text-sm text-glossy-gold">
                        No product sales data available yet to rank.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-[#00D4FF]/40 bg-[#0B0B0C]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#00D4FF]/35 bg-[#141417]">
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              Rank
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              Product Name
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold text-center">
                              Quantity of Selling
                            </th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-glossy-gold">
                              Selling Performance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#00D4FF]/20">
                          {productSellingRankings.map((row, idx) => {
                            const topQty =
                              productSellingRankings[0]?.totalQuantity || 1;
                            const barPercent = Math.max(
                              8,
                              Math.round((row.totalQuantity / topQty) * 100)
                            );
                            return (
                              <tr
                                key={row.key}
                                className="hover:bg-[#141417]/70 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold border border-[#00D4FF]/50 bg-[#141417] text-glossy-gold">
                                    #{idx + 1}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    {row.productImage && (
                                      <img
                                        src={row.productImage}
                                        alt={row.productName}
                                        className="w-10 h-10 object-contain bg-[#141417] border border-[#00D4FF]/35 shrink-0"
                                      />
                                    )}
                                    <div>
                                      <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-glossy-gold">
                                        {row.productName}
                                      </p>
                                      {row.uidNumber && (
                                        <p
                                          style={{ color: "#9CA3AF" }}
                                          className="text-[11px]"
                                        >
                                          UID: {row.uidNumber}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-3 py-1 text-sm font-bold bg-[#141417] border border-[#00D4FF]/50 text-glossy-gold">
                                    {row.totalQuantity}
                                  </span>
                                </td>
                                <td className="py-3 px-4 w-56">
                                  <div className="w-full bg-[#141417] h-3 border border-[#00D4FF]/30 overflow-hidden">
                                    <div
                                      style={{
                                        width: `${barPercent}%`,
                                        background:
                                          "linear-gradient(90deg, #FF1E27 0%, #FF6B6B 100%)",
                                      }}
                                      className="h-full"
                                    />
                                  </div>
                                  <span className="text-[10px] uppercase tracking-wider text-glossy-gold mt-1 inline-block">
                                    {idx === 0
                                      ? "★ Best Selling Product"
                                      : `${row.totalQuantity} Units Sold • ${row.totalRevenue.toLocaleString()} BDT`}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-SECTION 3: INPUT / MODIFY ANY SOLD PRODUCT & PRODUCT DETAILS */}
              {soldTab === "record" && (
                <form
                  onSubmit={handleRecordSale}
                  className="flex-1 overflow-y-auto space-y-4 bg-[#0B0B0C] border border-[#00D4FF]/40 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#00D4FF]/30 pb-2">
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-glossy-gold">
                      {editingSaleId
                        ? "Modify Sold Product & Details"
                        : "Input Any Sold Product & Product Details"}
                    </h4>
                    {editingSaleId && (
                      <button
                        type="button"
                        onClick={resetSaleForm}
                        className="px-2.5 py-1 text-[11px] uppercase bg-[#141417] border border-[#00D4FF]/45 text-glossy-gold cursor-pointer"
                      >
                        + Switch to New Entry
                      </button>
                    )}
                  </div>

                  {/* Optional Quick Fill from Published Products */}
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                      Quick Auto-Fill from Published Products (Optional — or
                      input any product manually below)
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) =>
                        handleProductSelectChange(e.target.value)
                      }
                      className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                    >
                      <option value="">
                        -- Manual Sold Product Entry (Any Product) --
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || "Unnamed Product"}{" "}
                          {p.uidNumber ? `(UID: ${p.uidNumber})` : ""} —{" "}
                          {p.price}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sold Product Image Upload */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold">
                        Sold Product Image
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saleImageInputRef.current?.click()}
                          style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                        >
                          + Upload Image
                        </button>
                        {saleImage && (
                          <button
                            type="button"
                            onClick={() => setSaleImage("")}
                            style={{
                              border: "1px solid rgba(255, 80, 80, 0.55)",
                            }}
                            className="px-2.5 py-1 text-xs uppercase bg-[#1A0D10] text-red-300 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        ref={saleImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleSaleImageUpload}
                        className="hidden"
                      />
                    </div>

                    {saleImage && (
                      <div className="w-28 h-28 bg-[#141417] border border-[#00D4FF]/40 p-2 flex items-center justify-center">
                        <img
                          src={saleImage}
                          alt="Sold product preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sold Product Details Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={customProductName}
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Enter sold product name"
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Category / Type
                      </label>
                      <input
                        type="text"
                        value={customCategoryLabel}
                        onChange={(e) => setCustomCategoryLabel(e.target.value)}
                        placeholder="e.g. Helmets, Engine Oil, Custom Part"
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Unit Selling Price (Used for Business Analytics)
                      </label>
                      <input
                        type="text"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="e.g. 2500"
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Quantity Sold *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={saleQuantity}
                        onChange={(e) => setSaleQuantity(e.target.value)}
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        UID Number
                      </label>
                      <input
                        type="text"
                        value={customUid}
                        onChange={(e) => setCustomUid(e.target.value)}
                        placeholder="Enter UID number"
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Product Code
                      </label>
                      <input
                        type="text"
                        value={customProductCode}
                        onChange={(e) => setCustomProductCode(e.target.value)}
                        placeholder="Enter product code"
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Model Number
                      </label>
                      <input
                        type="text"
                        value={customModelNumber}
                        onChange={(e) => setCustomModelNumber(e.target.value)}
                        placeholder="Enter model number"
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                        Sold Date (Date/Month/Year) *
                      </label>
                      <input
                        type="date"
                        required
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="auth-input w-full px-3.5 py-2.5 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                      Product Details / Description
                    </label>
                    <textarea
                      rows={2}
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Enter sold product details, specifications, or sale notes..."
                      className="auth-input w-full px-3.5 py-2 bg-[#111114] border border-[#00D4FF]/45 text-sm focus:outline-none"
                    />
                  </div>

                  {/* Additional Custom Fields for Sold Product */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-glossy-gold">
                        Additional Product Details / Custom Fields (
                        {customSaleFields.length})
                      </label>
                      <button
                        type="button"
                        onClick={handleAddCustomSaleField}
                        style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                        className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                      >
                        + Add Detail Field
                      </button>
                    </div>

                    {customSaleFields.length > 0 && (
                      <div className="space-y-2">
                        {customSaleFields.map((field) => (
                          <div
                            key={field.id}
                            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-[#111114] border border-[#00D4FF]/35"
                          >
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) =>
                                handleUpdateCustomSaleField(
                                  field.id,
                                  "label",
                                  e.target.value
                                )
                              }
                              placeholder="Field Name (e.g. Brand, Customer, Invoice)"
                              className="auth-input sm:w-5/12 px-3 py-1.5 bg-[#0B0B0C] border border-[#00D4FF]/45 text-xs focus:outline-none"
                            />
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) =>
                                handleUpdateCustomSaleField(
                                  field.id,
                                  "value",
                                  e.target.value
                                )
                              }
                              placeholder="Field Value"
                              className="auth-input flex-1 px-3 py-1.5 bg-[#0B0B0C] border border-[#00D4FF]/45 text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCustomSaleField(field.id)
                              }
                              style={{
                                border: "1px solid rgba(255, 80, 80, 0.55)",
                              }}
                              className="px-2.5 py-1.5 text-xs uppercase bg-[#1A0D10] text-red-300 cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3.5 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-xs sm:text-sm font-semibold uppercase tracking-widest text-glossy-gold cursor-pointer"
                  >
                    {saving
                      ? "Saving Sold Product..."
                      : editingSaleId
                      ? "Update Sold Product & Sync Business Analytics"
                      : "Save Sold Product & Add to Business Analytics"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* =========================================================
              CARD 4: BUSINESS ANALYTICS
              - Graph Chart
              - Under it: 3 Buttons named "Todays sale", "Monthly Sale", "Yearly sale"
              - Quick button to "+ Input Sold Product" directly for analysis
             ========================================================= */}
          {selectedCard === "Business Analytics" && (
            <div className="flex-1 overflow-y-auto pr-1 space-y-5">
              {/* Top Action Bar inside Business Analytics */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B0B0C] border border-[#00D4FF]/40 px-4 py-2.5">
                <span className="text-xs uppercase tracking-wider text-glossy-gold">
                  Total Recorded Sales Entries: <strong>{sales.length}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    resetSaleForm();
                    setSelectedCard("Sold Products");
                    setSoldTab("record");
                  }}
                  style={{ border: "1px solid rgba(255, 30, 39, 0.65)" }}
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                >
                  + Input Sold Product
                </button>
              </div>

              {/* Top Summary Strip: Today, Yesterday, Selected Month, Selected Year */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/45">
                  <p className="text-[10px] uppercase tracking-wider text-glossy-gold opacity-80">
                    Today&apos;s Sale ({formatDateDMY(todayStr)})
                  </p>
                  <p className="text-base sm:text-lg font-bold text-glossy-gold mt-1">
                    {analyticsSummary.todayAmount.toLocaleString()} BDT
                  </p>
                  <p style={{ color: "#9CA3AF" }} className="text-[11px]">
                    {analyticsSummary.todayQty} pcs sold
                  </p>
                </div>

                <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/45">
                  <p className="text-[10px] uppercase tracking-wider text-glossy-gold opacity-80">
                    Yesterday&apos;s Sale ({formatDateDMY(yesterdayStr)})
                  </p>
                  <p className="text-base sm:text-lg font-bold text-glossy-gold mt-1">
                    {analyticsSummary.yesterdayAmount.toLocaleString()} BDT
                  </p>
                  <p style={{ color: "#9CA3AF" }} className="text-[11px]">
                    {analyticsSummary.yesterdayQty} pcs sold
                  </p>
                </div>

                <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/45">
                  <p className="text-[10px] uppercase tracking-wider text-glossy-gold opacity-80">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-glossy-gold mt-1">
                    {analyticsSummary.selectedMonthAmount.toLocaleString()} BDT
                  </p>
                  <p style={{ color: "#9CA3AF" }} className="text-[11px]">
                    {analyticsSummary.selectedMonthQty} pcs sold
                  </p>
                </div>

                <div className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/45">
                  <p className="text-[10px] uppercase tracking-wider text-glossy-gold opacity-80">
                    Year {selectedYear} Total
                  </p>
                  <p className="text-base sm:text-lg font-bold text-glossy-gold mt-1">
                    {analyticsSummary.selectedYearAmount.toLocaleString()} BDT
                  </p>
                  <p style={{ color: "#9CA3AF" }} className="text-[11px]">
                    {analyticsSummary.selectedYearQty} pcs sold
                  </p>
                </div>
              </div>

              {/* Interactive Period Controls based on selected mode */}
              <div className="p-3.5 bg-[#0B0B0C] border border-[#00D4FF]/45 flex flex-wrap items-center justify-between gap-3">
                {analyticsMode === "daily" && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-glossy-gold">
                      Inspect Day:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(todayStr)}
                      className={`px-3 py-1 text-xs uppercase tracking-wider border cursor-pointer ${
                        selectedDate === todayStr
                          ? "bg-[#1A1215] border-[#FF1E27] text-glossy-gold font-bold"
                          : "bg-[#141417] border-[#00D4FF]/40 text-glossy-gold"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(yesterdayStr)}
                      className={`px-3 py-1 text-xs uppercase tracking-wider border cursor-pointer ${
                        selectedDate === yesterdayStr
                          ? "bg-[#1A1215] border-[#FF1E27] text-glossy-gold font-bold"
                          : "bg-[#141417] border-[#00D4FF]/40 text-glossy-gold"
                      }`}
                    >
                      Yesterday
                    </button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) =>
                        setSelectedDate(e.target.value || todayStr)
                      }
                      className="auth-input px-2.5 py-1 bg-[#141417] border border-[#00D4FF]/45 text-xs focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-glossy-gold ml-1">
                      Selected Day ({formatDateDMY(selectedDate)}):{" "}
                      {analyticsSummary.selectedDateAmount.toLocaleString()} BDT
                      ({analyticsSummary.selectedDateQty} pcs)
                    </span>
                  </div>
                )}

                {analyticsMode === "monthly" && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-glossy-gold">
                      Select Month & Year:
                    </span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="auth-input px-3 py-1.5 bg-[#141417] border border-[#00D4FF]/45 text-xs focus:outline-none"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={mName} value={idx + 1}>
                          {mName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="auth-input px-3 py-1.5 bg-[#141417] border border-[#00D4FF]/45 text-xs focus:outline-none"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>

                    <span className="text-xs font-semibold text-glossy-gold ml-1">
                      Total:{" "}
                      {analyticsSummary.selectedMonthAmount.toLocaleString()}{" "}
                      BDT ({analyticsSummary.selectedMonthQty} pcs)
                    </span>
                  </div>
                )}

                {analyticsMode === "yearly" && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs uppercase tracking-wider text-glossy-gold">
                      Select Year:
                    </span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="auth-input px-3 py-1.5 bg-[#141417] border border-[#00D4FF]/45 text-xs focus:outline-none"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>

                    <span className="text-xs font-semibold text-glossy-gold ml-1">
                      Year {selectedYear} Total:{" "}
                      {analyticsSummary.selectedYearAmount.toLocaleString()} BDT
                      ({analyticsSummary.selectedYearQty} pcs)
                    </span>
                  </div>
                )}

                {/* Metric Toggle: Sale Amount (BDT) vs Quantity Sold */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMetricType("amount")}
                    className={`px-2.5 py-1 text-[11px] uppercase tracking-wider border cursor-pointer ${
                      metricType === "amount"
                        ? "bg-[#1A1215] border-[#FF1E27] text-glossy-gold font-bold"
                        : "bg-[#141417] border-[#00D4FF]/35 text-glossy-gold opacity-75"
                    }`}
                  >
                    Revenue (BDT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricType("quantity")}
                    className={`px-2.5 py-1 text-[11px] uppercase tracking-wider border cursor-pointer ${
                      metricType === "quantity"
                        ? "bg-[#1A1215] border-[#FF1E27] text-glossy-gold font-bold"
                        : "bg-[#141417] border-[#00D4FF]/35 text-glossy-gold opacity-75"
                    }`}
                  >
                    Units Sold
                  </button>
                </div>
              </div>

              {/* GRAPH CHART */}
              <div className="p-4 sm:p-5 bg-[#0B0B0C] border border-[#00D4FF]/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold">
                    {analyticsMode === "daily" &&
                      `Daily Sales Graph (Today, Yesterday & 7-Day Trend)`}
                    {analyticsMode === "monthly" &&
                      `Monthly Sales Graph — ${
                        MONTH_NAMES[selectedMonth - 1]
                      } ${selectedYear}`}
                    {analyticsMode === "yearly" &&
                      `Yearly Sales Graph — ${selectedYear} (Jan – Dec)`}
                  </h4>
                  <span className="text-[11px] uppercase tracking-wider text-glossy-gold">
                    {metricType === "amount" ? "Amount (BDT)" : "Quantity (Pcs)"}
                  </span>
                </div>

                {/* Bar Graph Area */}
                <div className="w-full overflow-x-auto pb-2">
                  <div
                    style={{
                      minWidth:
                        analyticsMode === "monthly" ? "640px" : "100%",
                    }}
                    className="h-56 pt-6 pb-2 px-2 flex items-end justify-between gap-1.5 sm:gap-2 border-b border-l border-[#00D4FF]/40 bg-[#111114]/60"
                  >
                    {chartBars.map((bar, idx) => {
                      const rawVal =
                        metricType === "amount" ? bar.amount : bar.qty;
                      const heightPct =
                        rawVal > 0
                          ? Math.max(
                              8,
                              Math.round((rawVal / maxChartVal) * 100)
                            )
                          : 2;

                      return (
                        <div
                          key={`${bar.label}-${idx}`}
                          title={`${bar.subLabel}: ${bar.amount.toLocaleString()} BDT (${
                            bar.qty
                          } pcs)`}
                          className="flex-1 flex flex-col items-center justify-end h-full group"
                        >
                          {/* Value label above bar */}
                          <span
                            className={`text-[9px] sm:text-[10px] mb-1 font-mono ${
                              rawVal > 0
                                ? "text-glossy-gold font-bold"
                                : "text-gray-600"
                            }`}
                          >
                            {rawVal > 0 ? rawVal.toLocaleString() : "0"}
                          </span>

                          {/* Vertical Bar */}
                          <div className="w-full max-w-[2.25rem] h-40 flex items-end justify-center">
                            <div
                              style={{
                                height: `${heightPct}%`,
                                background:
                                  rawVal > 0
                                    ? bar.isHighlight
                                      ? "linear-gradient(180deg, #FFFFFF 0%, #FF1E27 55%, #990A10 100%)"
                                      : "linear-gradient(180deg, #FF6B6B 0%, #FF1E27 70%, #6B080D 100%)"
                                    : "rgba(255, 30, 39, 0.18)",
                                boxShadow:
                                  rawVal > 0
                                    ? "0 0 10px rgba(255, 30, 39, 0.45)"
                                    : "none",
                              }}
                              className="w-full transition-all duration-300 border-t border-[#FF6B6B]/70"
                            />
                          </div>

                          {/* X-Axis Label */}
                          <span
                            className={`mt-2 text-[9px] sm:text-[10px] uppercase tracking-tighter text-center truncate w-full ${
                              bar.isHighlight
                                ? "text-glossy-gold font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            {bar.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3 BUTTONS UNDER THE GRAPH CHART: Todays sale, Monthly Sale, Yearly sale */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setAnalyticsMode("daily")}
                  style={{
                    border:
                      analyticsMode === "daily"
                        ? "1.5px solid #FF1E27"
                        : "1px solid rgba(255, 30, 39, 0.45)",
                    boxShadow:
                      analyticsMode === "daily"
                        ? "0 0 16px rgba(255, 30, 39, 0.35)"
                        : "none",
                  }}
                  className={`py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    analyticsMode === "daily" ? "bg-[#1F1216]" : "bg-[#0B0B0C]"
                  } text-glossy-gold`}
                >
                  Todays sale
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsMode("monthly")}
                  style={{
                    border:
                      analyticsMode === "monthly"
                        ? "1.5px solid #FF1E27"
                        : "1px solid rgba(255, 30, 39, 0.45)",
                    boxShadow:
                      analyticsMode === "monthly"
                        ? "0 0 16px rgba(255, 30, 39, 0.35)"
                        : "none",
                  }}
                  className={`py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    analyticsMode === "monthly"
                      ? "bg-[#1F1216]"
                      : "bg-[#0B0B0C]"
                  } text-glossy-gold`}
                >
                  Monthly Sale
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyticsMode("yearly")}
                  style={{
                    border:
                      analyticsMode === "yearly"
                        ? "1.5px solid #FF1E27"
                        : "1px solid rgba(255, 30, 39, 0.45)",
                    boxShadow:
                      analyticsMode === "yearly"
                        ? "0 0 16px rgba(255, 30, 39, 0.35)"
                        : "none",
                  }}
                  className={`py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    analyticsMode === "yearly" ? "bg-[#1F1216]" : "bg-[#0B0B0C]"
                  } text-glossy-gold`}
                >
                  Yearly sale
                </button>
              </div>
            </div>
          )}

          {/* Placeholder for Products & Customer Bookings cards inside Statistics */}
          {(selectedCard === "Products" ||
            selectedCard === "Customer Bookings") && (
            <div style={{ minHeight: "14rem" }} className="w-full" />
          )}
        </div>
      </div>

      {/* FULL-SCREEN SOLD PRODUCT DETAILS POPUP (with Cross Button to return) */}
      {viewingSale && (
        <div
          className="fixed inset-0 z-[130] bg-[#080809]/98 backdrop-blur-md flex flex-col overflow-y-auto"
          onClick={() => setViewingSale(null)}
        >
          <div
            className="w-full min-h-screen flex flex-col p-6 sm:p-10 max-w-6xl mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ borderBottom: "1.5px solid rgba(255, 30, 39, 0.45)" }}
              className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 shrink-0"
            >
              <div>
                <span className="text-xs uppercase tracking-widest text-glossy-gold opacity-80">
                  Sold Product Record — Sold on{" "}
                  {formatDateDMY(viewingSale.soldDate)}
                </span>
                <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold mt-0.5">
                  {viewingSale.productName}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStartEditSale(viewingSale)}
                  className="px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                >
                  Modify Record
                </button>
                <button
                  type="button"
                  onClick={() => setViewingSale(null)}
                  aria-label="Close full screen sold product view"
                  style={{ border: "1.5px solid rgba(255, 30, 39, 0.75)" }}
                  className="w-10 h-10 flex items-center justify-center text-base font-bold bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
              {/* Left 7 Columns: Large Product Image */}
              <div
                style={{
                  backgroundColor: "#0B0B0C",
                  border: "1.5px solid rgba(255, 30, 39, 0.5)",
                  minHeight: "58vh",
                }}
                className="lg:col-span-7 flex items-center justify-center p-6 overflow-hidden"
              >
                {viewingSale.productImage ? (
                  <img
                    src={viewingSale.productImage}
                    alt={viewingSale.productName}
                    className="max-h-[55vh] w-full object-contain select-none"
                  />
                ) : (
                  <span className="text-sm uppercase tracking-widest text-glossy-gold opacity-60">
                    No Image Uploaded
                  </span>
                )}
              </div>

              {/* Right 5 Columns: Full Sold Product Details */}
              <div
                style={{
                  backgroundColor: "#111114",
                  border: "1.5px solid rgba(255, 30, 39, 0.55)",
                }}
                className="lg:col-span-5 p-6 sm:p-8 space-y-3 text-sm"
              >
                <h3 className="text-lg font-bold uppercase tracking-wider text-glossy-gold border-b border-[#00D4FF]/35 pb-2">
                  Sold Product Details
                </h3>

                <p style={{ color: "#E5E7EB" }}>
                  <strong className="text-glossy-gold">Sold Date:</strong>{" "}
                  {formatDateDMY(viewingSale.soldDate)}
                </p>
                <p style={{ color: "#E5E7EB" }}>
                  <strong className="text-glossy-gold">Quantity Sold:</strong>{" "}
                  {viewingSale.quantity || 1}
                </p>
                <p style={{ color: "#E5E7EB" }}>
                  <strong className="text-glossy-gold">Unit Price:</strong>{" "}
                  {viewingSale.priceDisplay || `${viewingSale.price} BDT`}
                </p>
                <p className="text-base font-bold text-glossy-gold pt-1 border-t border-[#00D4FF]/25">
                  Total Sale Amount:{" "}
                  {(
                    (Number(viewingSale.price) || 0) *
                    (Number(viewingSale.quantity) || 1)
                  ).toLocaleString()}{" "}
                  BDT
                </p>

                {viewingSale.categoryLabel && (
                  <p style={{ color: "#E5E7EB" }}>
                    <strong className="text-glossy-gold">Category:</strong>{" "}
                    {viewingSale.categoryLabel}
                  </p>
                )}
                {viewingSale.uidNumber && (
                  <p style={{ color: "#E5E7EB" }}>
                    <strong className="text-glossy-gold">UID Number:</strong>{" "}
                    {viewingSale.uidNumber}
                  </p>
                )}
                {viewingSale.productCode && (
                  <p style={{ color: "#E5E7EB" }}>
                    <strong className="text-glossy-gold">Product Code:</strong>{" "}
                    {viewingSale.productCode}
                  </p>
                )}
                {viewingSale.modelNumber && (
                  <p style={{ color: "#E5E7EB" }}>
                    <strong className="text-glossy-gold">Model Number:</strong>{" "}
                    {viewingSale.modelNumber}
                  </p>
                )}

                {viewingSale.customFields?.map((cf) => (
                  <p key={cf.id} style={{ color: "#E5E7EB" }}>
                    <strong className="text-glossy-gold">{cf.label}:</strong>{" "}
                    {cf.value}
                  </p>
                ))}

                {viewingSale.description && (
                  <div className="pt-2 border-t border-[#00D4FF]/25">
                    <strong className="text-glossy-gold block mb-1">
                      Details / Description:
                    </strong>
                    <p
                      style={{ color: "#E5E7EB" }}
                      className="whitespace-pre-wrap bg-[#0B0B0C] p-3 border border-[#00D4FF]/30"
                    >
                      {viewingSale.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
