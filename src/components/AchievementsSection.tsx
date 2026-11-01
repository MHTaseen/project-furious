"use client";

import React, { useEffect, useState } from "react";

interface AchievementsData {
  customersCount: number;
  soldProducts: number;
  averageRating: number;
  reviewsCount: number;
}

export default function AchievementsSection() {
  const [data, setData] = useState<AchievementsData>({
    customersCount: 0,
    soldProducts: 0,
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
            soldProducts: resData.soldProducts ?? 0,
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
    return () => {
      window.removeEventListener("furious-auth-change", handleUpdate);
      window.removeEventListener("furious-sales-change", handleUpdate);
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
        width="32"
        height="32"
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
    <section className="w-full py-10 px-6 sm:px-10">
      <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold mb-6">
        Achievements
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Customers (excluding admins) */}
        <div
          style={{
            backgroundColor: "#111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow: "0 0 18px rgba(255, 30, 39, 0.18)",
          }}
          className="p-6 flex flex-col items-center justify-center text-center"
        >
          <h3 className="text-base sm:text-lg font-semibold uppercase tracking-[0.18em] text-glossy-gold mb-3">
            Customers
          </h3>
          <p className="text-3xl sm:text-4xl font-bold text-glossy-gold">
            {data.customersCount}
          </p>
        </div>

        {/* 2. Sold Products */}
        <div
          style={{
            backgroundColor: "#111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow: "0 0 18px rgba(255, 30, 39, 0.18)",
          }}
          className="p-6 flex flex-col items-center justify-center text-center"
        >
          <h3 className="text-base sm:text-lg font-semibold uppercase tracking-[0.18em] text-glossy-gold mb-3">
            Sold Products
          </h3>
          <p className="text-3xl sm:text-4xl font-bold text-glossy-gold">
            {data.soldProducts}
          </p>
        </div>

        {/* 3. Review (5 Stars — initially empty, fills up with customer review average) */}
        <div
          style={{
            backgroundColor: "#111114",
            border: "1.5px solid rgba(255, 30, 39, 0.55)",
            boxShadow: "0 0 18px rgba(255, 30, 39, 0.18)",
          }}
          className="p-6 flex flex-col items-center justify-center text-center"
        >
          <h3 className="text-base sm:text-lg font-semibold uppercase tracking-[0.18em] text-glossy-gold mb-3">
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
