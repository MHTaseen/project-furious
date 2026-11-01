import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-matte-footer mt-auto">
      <div className="w-full px-6 sm:px-10 py-10">
        {/* Footer Sections Grid (Headings only — contents to be added per future instructions) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-8">
          {/* Contact Section (info to be added later) */}
          <div className="min-h-[4rem]">
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold pb-2 border-b border-[#00D4FF]/30">
              Contact
            </h3>
          </div>

          {/* Quick Links Section (empty for now) */}
          <div className="min-h-[4rem]">
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold pb-2 border-b border-[#00D4FF]/30">
              Quick Links
            </h3>
          </div>

          {/* Customer Support Section (empty for now) */}
          <div className="min-h-[4rem]">
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold pb-2 border-b border-[#00D4FF]/30">
              Customer Support
            </h3>
          </div>

          {/* Policies & Legal Section (empty for now) */}
          <div className="min-h-[4rem]">
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-[0.18em] text-glossy-gold pb-2 border-b border-[#00D4FF]/30">
              Policies
            </h3>
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
  );
}

