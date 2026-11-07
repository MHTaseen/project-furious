"use client";

import React, { useEffect, useState } from "react";

interface AchievementsData {
  customersCount: number;
  inStockCount: number;
  categoriesCount: number;
  averageRating: number;
  reviewsCount: number;
}

export default function AchievementsSection() {
  const [data, setData] = useState<AchievementsData>({
    customersCount: 0,
    inStockCount: 0,
    categoriesCount: 0,
    averageRating: 0,
    reviewsCount: 0,
  });

  const loadAchievements = () => {
    fetch("/api/achievements")
      .then((res) => res.json())
      .then((resData) => {
        if (typeof resData?.customersCount === "number") {
          setData({
            customersCount: resData.customersCount,
            inStockCount: resData.inStockCount ?? 0,
            categoriesCount: resData.categoriesCount ?? 0,
            averageRating: resData.averageRating ?? 0,
            reviewsCount: resData.reviewsCount ?? 0,
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAchievements();
    const handleUpdate = () => loadAchievements();

    window.addEventListener("furious-auth-change", handleUpdate);
    window.addEventListener("furious-sales-change", handleUpdate);
    window.addEventListener("furious-products-change", handleUpdate);
    window.addEventListener("furious-categories-change", handleUpdate);

    return () => {
      window.removeEventListener("furious-auth-change", handleUpdate);
      window.removeEventListener("furious-sales-change", handleUpdate);
      window.removeEventListener("furious-products-change", handleUpdate);
      window.removeEventListener("furious-categories-change", handleUpdate);
    };
  }, []);

  // Renders a single star with fractional fill (0% to 100%) based on averageRating
  const renderStar = (starIndex: number) => {
    const fillAmount = Math.min(
      1,
      Math.max(0, data.averageRating - starIndex)
    );
    const fillPercent = Math.round(fillAmount * 100);
    const clipId = `star-fill-clip-${starIndex}`;

    return (
      <svg
        key={starIndex}
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        style={{
          filter: "drop-shadow(0 0 6px rgba(255, 30, 39, 0.55))",
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={`${fillPercent}%`} height="24" />
          </clipPath>
          <linearGradient
            id={`starLogoGrad-${starIndex}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="40%" stopColor="#E5E7EB" />
            <stop offset="75%" stopColor="#FF1E27" />
            <stop offset="100%" stopColor="#FF5A5F" />
          </linearGradient>
        </defs>

        {/* Empty Star Outline */}
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          stroke="#FF1E27"
          strokeWidth="1.75"
          strokeLinejoin="round"
          fill="transparent"
        />

        {/* Filled Star Portion (fills proportionally as customers review) */}
        {fillPercent > 0 && (
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={`url(#starLogoGrad-${starIndex})`}
            clipPath={`url(#${clipId})`}
          />
        )}
      </svg>
    );
  };

  return (
    <section className="w-full py-12 px-6 sm:px-10">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1.5 h-6 rounded-full bg-[#FF1E27] shadow-[0_0_10px_#FF1E27]" />
        <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-glossy-gold">
          Achievements
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Customers (excluding admins) */}
        <div
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255, 30, 39, 0.12), transparent 70%), #111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow:
              "0 0 24px rgba(255, 30, 39, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
          }}
          className="p-7 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1 hover:border-[#FF5A5F] hover:shadow-[0_0_30px_rgba(255,30,39,0.35)] transition-all duration-300 group"
        >
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-glossy-gold mb-3 group-hover:scale-105 transition-transform">
            Customers
          </h3>
          <p className="text-3xl sm:text-4xl font-extrabold text-glossy-gold tracking-wider drop-shadow-[0_2px_12px_rgba(255,30,39,0.3)]">
            {data.customersCount}
          </p>
        </div>

        {/* 2. In Stock (Total products stock quantity) */}
        <div
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255, 30, 39, 0.12), transparent 70%), #111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow:
              "0 0 24px rgba(255, 30, 39, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
          }}
          className="p-7 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1 hover:border-[#FF5A5F] hover:shadow-[0_0_30px_rgba(255,30,39,0.35)] transition-all duration-300 group"
        >
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-glossy-gold mb-3 group-hover:scale-105 transition-transform">
            In Stock
          </h3>
          <p className="text-3xl sm:text-4xl font-extrabold text-glossy-gold tracking-wider drop-shadow-[0_2px_12px_rgba(255,30,39,0.3)]">
            {data.inStockCount}
          </p>
        </div>

        {/* 3. Product Category (Total number of product categories) */}
        <div
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255, 30, 39, 0.12), transparent 70%), #111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow:
              "0 0 24px rgba(255, 30, 39, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
          }}
          className="p-7 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1 hover:border-[#FF5A5F] hover:shadow-[0_0_30px_rgba(255,30,39,0.35)] transition-all duration-300 group"
        >
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-glossy-gold mb-3 group-hover:scale-105 transition-transform">
            Product Category
          </h3>
          <p className="text-3xl sm:text-4xl font-extrabold text-glossy-gold tracking-wider drop-shadow-[0_2px_12px_rgba(255,30,39,0.3)]">
            {data.categoriesCount}
          </p>
        </div>

        {/* 4. Review (5 Stars — initially empty, fills up with customer review average) */}
        <div
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255, 30, 39, 0.12), transparent 70%), #111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow:
              "0 0 24px rgba(255, 30, 39, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
          }}
          className="p-7 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1 hover:border-[#FF5A5F] hover:shadow-[0_0_30px_rgba(255,30,39,0.35)] transition-all duration-300 group"
        >
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-glossy-gold mb-4 group-hover:scale-105 transition-transform">
            Review
          </h3>
          <div
            aria-label={`Average rating: ${data.averageRating.toFixed(1)} out of 5 stars`}
            className="flex items-center justify-center gap-2"
          >
            {[0, 1, 2, 3, 4].map((starIdx) => renderStar(starIdx))}
          </div>
        </div>
      </div>
    </section>
  );
}
