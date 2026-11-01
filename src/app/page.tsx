"use client";

import React, { useState } from "react";
import AchievementsSection from "@/components/AchievementsSection";
import InteractiveMarquee from "@/components/InteractiveMarquee";
import BrandProductsModal from "@/components/BrandProductsModal";

const BRAND_LOGOS = [
  { src: "/images/liqui-moly.png", alt: "Liqui Moly" },
  { src: "/images/motul.png", alt: "Motul" },
  { src: "/images/repsol.png", alt: "Repsol" },
  { src: "/images/motocare.png", alt: "Motocare" },
  { src: "/images/rcb.png", alt: "RCB" },
  { src: "/images/flamingo.jpg", alt: "Flamingo" },
  { src: "/images/faito.jpg", alt: "Faito" },
];

// Repeat the sequence of 7 brand logos so the train fills wide screens seamlessly
const TRAIN_BOGIES = [...BRAND_LOGOS, ...BRAND_LOGOS];

const BULLETIN_IMAGES = [
  { src: "/images/bulletin-1.jpg", alt: "Windshield Visor" },
  { src: "/images/bulletin-2.jpg", alt: "Yamaha R15 Black Side Fairing" },
  { src: "/images/bulletin-3.jpg", alt: "R15 Version 4.0 Side Panel" },
  { src: "/images/bulletin-4.jpg", alt: "Yellow Front Mask Fairing" },
];

// Repeat sequence so the attached bulletin strip loops seamlessly across any screen width
const BULLETIN_STRIP = [
  ...BULLETIN_IMAGES,
  ...BULLETIN_IMAGES,
  ...BULLETIN_IMAGES,
];

export default function HomePage() {
  const [selectedBrand, setSelectedBrand] = useState<{
    name: string;
    logoSrc: string;
  } | null>(null);

  return (
    <div className="w-full min-h-[calc(100vh-9.75rem)] bg-matte-black">
      {/* Continuous Left-to-Right Train of Logos — interactive drag/scroll left or right + auto-sliding + click any logo to view Brand Products */}
      <div className="w-full bg-matte-black py-4">
        <div className="py-2">
          <InteractiveMarquee speedPxPerSec={110}>
            {TRAIN_BOGIES.map((item, idx) => (
              <div key={`bogie-${idx}`} className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedBrand({ name: item.alt, logoSrc: item.src })
                  }
                  title={`Click to view ${item.alt} products`}
                  className="w-36 h-24 sm:w-44 sm:h-28 bg-[#141417] border border-[#00D4FF]/55 hover:border-[#FF1E27] shadow-[0_0_8px_rgba(0,212,255,0.22),inset_0_1px_2px_rgba(125,249,255,0.2)] hover:shadow-[0_0_16px_rgba(255,30,39,0.45)] p-2 flex items-center justify-center shrink-0 cursor-pointer transition-all group"
                >
                  <div className="w-full h-full bg-white flex items-center justify-center p-2 overflow-hidden">
                    <img
                      src={item.src}
                      alt={item.alt}
                      draggable={false}
                      className="w-full h-full object-contain select-none pointer-events-none group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </button>
                {/* Train Coupler Link between Bogies */}
                <div className="w-4 h-1 bg-[#00D4FF]/60 shadow-[0_0_6px_rgba(0,212,255,0.5)] shrink-0" />
              </div>
            ))}
          </InteractiveMarquee>
        </div>
      </div>

      {/* "Our Products" Title + Continuous Left-to-Right Bulletin Strip of 4 Attached Images (interactive drag/scroll + auto-sliding) */}
      <section className="w-full pt-4">
        <div className="px-6 sm:px-10 mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-glossy-gold">
            Our Products
          </h2>
        </div>

        <InteractiveMarquee speedPxPerSec={125}>
          {BULLETIN_STRIP.map((img, idx) => (
            <img
              key={`bulletin-${idx}`}
              src={img.src}
              alt={img.alt}
              draggable={false}
              style={{
                width: "19.2rem",
                height: "25.2rem",
                display: "block",
              }}
              className="object-cover shrink-0 select-none pointer-events-none"
            />
          ))}
        </InteractiveMarquee>
      </section>

      {/* "Achievements" Section: Customers (non-admin count), Sold Products, Review (5 stars) */}
      <AchievementsSection />

      {/* Brand Products Popup Modal when Admin or Client clicks any moving Brand Logo */}
      <BrandProductsModal
        isOpen={Boolean(selectedBrand)}
        brandName={selectedBrand?.name || ""}
        brandLogoSrc={selectedBrand?.logoSrc}
        onClose={() => setSelectedBrand(null)}
      />
    </div>
  );
}
