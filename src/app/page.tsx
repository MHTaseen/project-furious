"use client";

import React, { useEffect, useState } from "react";
import AchievementsSection from "@/components/AchievementsSection";
import InteractiveMarquee from "@/components/InteractiveMarquee";
import BrandProductsModal from "@/components/BrandProductsModal";
import ManageTrainsModal from "@/components/ManageTrainsModal";
import {
  BrandLogoItem,
  ShowcaseImageItem,
  DEFAULT_BRAND_LOGOS,
  DEFAULT_SHOWCASE_IMAGES,
} from "@/types/homepageTrains";

export default function HomePage() {
  const [brandLogos, setBrandLogos] =
    useState<BrandLogoItem[]>(DEFAULT_BRAND_LOGOS);
  const [showcaseImages, setShowcaseImages] = useState<ShowcaseImageItem[]>(
    DEFAULT_SHOWCASE_IMAGES
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"logos" | "showcase">(
    "logos"
  );
  const [selectedBrand, setSelectedBrand] = useState<{
    name: string;
    logoSrc: string;
  } | null>(null);

  const loadTrains = async () => {
    try {
      const res = await fetch("/api/homepage-trains");
      const data = await res.json();
      if (Array.isArray(data?.brandLogos) && data.brandLogos.length > 0) {
        setBrandLogos(data.brandLogos);
      }
      if (
        Array.isArray(data?.showcaseImages) &&
        data.showcaseImages.length > 0
      ) {
        setShowcaseImages(data.showcaseImages);
      }
    } catch {
      // fallback to default
    }
  };

  const loadUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setIsAdmin(data?.user?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    loadTrains();
    loadUser();

    const handleAuth = () => loadUser();
    const handleTrains = () => loadTrains();

    window.addEventListener("furious-auth-change", handleAuth);
    window.addEventListener("furious-trains-change", handleTrains);

    return () => {
      window.removeEventListener("furious-auth-change", handleAuth);
      window.removeEventListener("furious-trains-change", handleTrains);
    };
  }, []);

  // Repeat items so the trains fill the screen smoothly and loop infinitely
  const bogieList =
    brandLogos.length < 5
      ? [...brandLogos, ...brandLogos, ...brandLogos]
      : [...brandLogos, ...brandLogos];

  const bulletinList =
    showcaseImages.length < 4
      ? [...showcaseImages, ...showcaseImages, ...showcaseImages]
      : [...showcaseImages, ...showcaseImages];

  return (
    <div className="w-full min-h-[calc(100vh-9.75rem)] bg-matte-black">
      {/* 1. CONTINUOUS LEFT-TO-RIGHT TRAIN OF BRAND LOGOS */}
      <div className="w-full bg-matte-black py-4 relative">
        {/* Soft edge fade masks so the train moves in and out of the shadows gracefully */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-[#080809] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-[#080809] to-transparent z-10" />

        {/* Admin Quick Action Button for Logos Train */}
        {isAdmin && (
          <div className="px-6 sm:px-10 mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setModalInitialTab("logos");
                setIsManageModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#141417] border border-[#00D4FF]/60 hover:border-[#7DF9FF] text-xs font-bold uppercase tracking-wider text-glossy-gold flex items-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.25)] hover:scale-105 transition-all"
            >
              <span>✎</span>
              <span>Manage Logos Train ({brandLogos.length})</span>
            </button>
          </div>
        )}

        <div className="py-2">
          <InteractiveMarquee speedPxPerSec={110}>
            {bogieList.map((item, idx) => (
              <div key={`bogie-${item.id}-${idx}`} className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedBrand({ name: item.name, logoSrc: item.src })
                  }
                  title={`Click to view ${item.name} products`}
                  className="w-36 h-24 sm:w-44 sm:h-28 rounded-xl bg-[#141417] border-[1.2px] border-[#00D4FF]/55 hover:border-[#FF1E27] shadow-[0_0_12px_rgba(255,30,39,0.2),inset_0_1px_2px_rgba(255,255,255,0.12)] hover:shadow-[0_0_20px_rgba(255,30,39,0.5)] p-2.5 flex items-center justify-center shrink-0 cursor-pointer transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className="w-full h-full rounded-lg bg-white flex items-center justify-center p-2.5 overflow-hidden shadow-inner">
                    <img
                      src={item.src}
                      alt={item.name}
                      draggable={false}
                      className="w-full h-full object-contain select-none pointer-events-none group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </button>
                {/* Train Coupler Link between Bogies */}
                <div className="w-4 h-1.5 rounded-full bg-gradient-to-r from-red-600 via-[#00D4FF]/70 to-red-600 shadow-[0_0_6px_rgba(255,30,39,0.6)] shrink-0 mx-0.5" />
              </div>
            ))}
          </InteractiveMarquee>
        </div>
      </div>

      {/* 2. "OUR PRODUCTS" TITLE + CONTINUOUS LEFT-TO-RIGHT SHOWCASE IMAGES TRAIN */}
      <section className="w-full pt-6 pb-2 relative">
        <div className="px-6 sm:px-10 mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-6 rounded-full bg-[#FF1E27] shadow-[0_0_10px_#FF1E27]" />
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-glossy-gold">
              Our Products
            </h2>
          </div>

          {/* Admin Quick Action Button for Showcase Images Train */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setModalInitialTab("showcase");
                setIsManageModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#141417] border border-[#00D4FF]/60 hover:border-[#7DF9FF] text-xs font-bold uppercase tracking-wider text-glossy-gold flex items-center gap-2 cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.25)] hover:scale-105 transition-all"
            >
              <span>✎</span>
              <span>Manage Products Showcase ({showcaseImages.length})</span>
            </button>
          )}
        </div>

        <div className="relative">
          {/* Subtle edge fade masks */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-20 bg-gradient-to-r from-[#080809] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-20 bg-gradient-to-l from-[#080809] to-transparent z-10" />

          <InteractiveMarquee speedPxPerSec={125}>
            {bulletinList.map((img, idx) => (
              <div
                key={`bulletin-${img.id}-${idx}`}
                className="px-2 shrink-0 select-none group"
              >
                <div className="rounded-2xl overflow-hidden border-[1.25px] border-[#FF1E27]/45 hover:border-[#FF5A5F] shadow-[0_8px_25px_rgba(0,0,0,0.85),0_0_14px_rgba(255,30,39,0.2)] hover:shadow-[0_12px_35px_rgba(255,30,39,0.35)] transition-all duration-300 hover:-translate-y-1">
                  <img
                    src={img.src}
                    alt={img.alt}
                    draggable={false}
                    style={{
                      width: "19.2rem",
                      height: "25.2rem",
                      display: "block",
                    }}
                    className="object-cover select-none pointer-events-none group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            ))}
          </InteractiveMarquee>
        </div>
      </section>

      {/* 3. ACHIEVEMENTS SECTION */}
      <AchievementsSection />

      {/* Brand Products Popup Modal when Admin or Client clicks any moving Brand Logo */}
      <BrandProductsModal
        isOpen={Boolean(selectedBrand)}
        brandName={selectedBrand?.name || ""}
        brandLogoSrc={selectedBrand?.logoSrc}
        onClose={() => setSelectedBrand(null)}
      />

      {/* Admin Manage Trains Modal (Add, Edit, Reorder, Delete Brand Logos & Showcase Posters) */}
      <ManageTrainsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        initialTab={modalInitialTab}
        onSaved={() => loadTrains()}
      />
    </div>
  );
}
