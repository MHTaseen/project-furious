"use client";

import React, { useEffect, useState } from "react";
import PoliciesModal, { PoliciesData } from "./PoliciesModal";

export default function Footer() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false);
  const [policies, setPolicies] = useState<PoliciesData | null>(null);

  useEffect(() => {
    const refreshAuth = () => {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          setIsAdmin(data?.user?.role === "admin");
        })
        .catch(() => {
          setIsAdmin(false);
        });
    };

    refreshAuth();
    window.addEventListener("furious-auth-change", refreshAuth);

    fetch("/api/site-info")
      .then((res) => res.json())
      .then((data) => {
        if (data?.policies) setPolicies(data.policies);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("furious-auth-change", refreshAuth);
    };
  }, []);

  return (
    <>
      <footer className="w-full bg-matte-footer mt-auto">
        <div className="w-full px-6 sm:px-10 py-10">
          {/* Footer Sections Grid: 3 Clean Columns with Refined Glass Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-8">
            {/* 1. Quick Links Section */}
            <div className="p-5 rounded-2xl bg-[#121114]/80 border border-[#FF1E27]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] space-y-3.5 hover:border-[#FF1E27]/60 transition-colors">
              <div className="flex items-center gap-2 pb-2 border-b border-[#00D4FF]/30">
                <span className="w-1.5 h-4 rounded-full bg-[#FF1E27]" />
                <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold">
                  Quick Links
                </h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a
                    href="https://facebook.com/furiousmotoshop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-glossy-gold hover:text-[#7DF9FF] transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#1877F2]/15 border border-[#1877F2]/60 group-hover:border-[#1877F2] group-hover:bg-[#1877F2]/30 flex items-center justify-center transition-all">
                      <svg
                        className="w-3.5 h-3.5 fill-[#1877F2]"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </span>
                    <span className="font-medium tracking-wide">
                      Facebook Page
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            {/* 2. Customer Support Section */}
            <div className="p-5 rounded-2xl bg-[#121114]/80 border border-[#FF1E27]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] space-y-3.5 hover:border-[#FF1E27]/60 transition-colors">
              <div className="flex items-center gap-2 pb-2 border-b border-[#00D4FF]/30">
                <span className="w-1.5 h-4 rounded-full bg-[#FF1E27]" />
                <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold">
                  Customer Support
                </h3>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-glossy-gold">
                <li className="flex items-center gap-2">
                  <span className="text-[#00D4FF] font-semibold text-xs">Email:</span>
                  <a
                    href="mailto:furiousmoto2021@gmail.com"
                    className="hover:text-[#7DF9FF] transition-colors"
                  >
                    furiousmoto2021@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#00D4FF] font-semibold text-xs">Office:</span>
                  <a
                    href="tel:01780115682"
                    className="hover:text-[#7DF9FF] transition-colors"
                  >
                    01780115682
                  </a>
                </li>
              </ul>
            </div>

            {/* 3. Policies & Terms Section */}
            <div className="p-5 rounded-2xl bg-[#121114]/80 border border-[#FF1E27]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] space-y-3.5 hover:border-[#FF1E27]/60 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-[#00D4FF]/30">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[#FF1E27]" />
                  <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold">
                    Policies
                  </h3>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsPoliciesOpen(true)}
                    className="text-[10px] uppercase font-bold text-[#7DF9FF] hover:underline cursor-pointer"
                  >
                    ✎ Edit Policy
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-300 space-y-2">
                <p className="line-clamp-3 text-[11.5px] leading-relaxed text-gray-400">
                  {policies?.sections?.[0]?.description ||
                    "100% genuine guaranteed products, authentic distributor warranties, 48-hour return policies, and strict customer data privacy protection."}
                </p>

                <button
                  type="button"
                  onClick={() => setIsPoliciesOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-glossy-gold hover:text-[#7DF9FF] font-semibold uppercase tracking-wider underline cursor-pointer"
                >
                  Read Full Store Policies ›
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar: All Rights Preserved */}
          <div
            style={{ borderTop: "1px solid rgba(0, 212, 255, 0.25)" }}
            className="pt-6 flex items-center justify-center text-center"
          >
            <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.16em] text-glossy-gold">
              © 𝔉𝔲𝔯𝔦𝔬𝔲𝔰 — All Rights Preserved
            </p>
          </div>
        </div>
      </footer>

      {/* Policies View / Admin Edit Modal */}
      <PoliciesModal
        isOpen={isPoliciesOpen}
        onClose={() => setIsPoliciesOpen(false)}
        isAdmin={isAdmin}
        onPoliciesUpdated={(updated) => setPolicies(updated)}
      />
    </>
  );
}

