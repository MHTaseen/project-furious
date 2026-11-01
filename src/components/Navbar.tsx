"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal, { AuthenticatedUser } from "./AuthModal";
import ProfileModal from "./ProfileModal";
import CustomersModal from "./CustomersModal";
import ProductsManagerModal from "./ProductsManagerModal";
import AboutModal from "./AboutModal";
import ContactModal from "./ContactModal";
import StatisticsModal from "./StatisticsModal";

export default function Navbar() {
  const router = useRouter();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsProfileOpen(false);
      setIsCustomersOpen(false);
      setIsProductsOpen(false);
      setIsStatisticsOpen(false);
      window.dispatchEvent(new Event("furious-auth-change"));
      router.push("/");
    } catch {
      // Ignore logout network error
    }
  };

  return (
    <>
      <header
        style={{ height: "5.75rem" }}
        className="fixed top-0 left-0 right-0 z-50 w-full bg-matte-navbar"
      >
        <nav
          aria-label="Global Navigation"
          className="w-full h-full flex items-center justify-between px-6 sm:px-10"
        >
          {/* Left-most corner: Shop Logo — Perfectly fitted inside the Navbar without clipping */}
          <Link
            href={user?.role === "admin" ? "/admin" : "/"}
            className="flex items-center select-none focus:outline-none"
          >
            <div
              aria-label="Company Logo"
              style={{ width: "10.935rem", height: "4.185rem" }}
              className="flex items-center justify-center shrink-0 overflow-hidden"
            >
              <img
                src="/images/furious-logo.jpg"
                alt="FURIOUS Moto Shop Logo"
                style={{
                  width: "104%",
                  height: "160%",
                  maxWidth: "none",
                  objectFit: "fill",
                }}
                className="select-none pointer-events-none"
              />
            </div>
          </Link>

          {/* Right-most corner: Navigation & Account Controls */}
          <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
            >
              About US
            </button>

            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
            >
              Contact
            </button>

            {user ? (
              <>
                {/* Admin-only Buttons: Products, Statistics, Customers */}
                {user.role === "admin" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsProductsOpen(true)}
                      className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
                    >
                      Products
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsStatisticsOpen(true)}
                      className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
                    >
                      Statistics
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCustomersOpen(true)}
                      className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
                    >
                      Customers
                    </button>
                  </>
                )}

                {/* "My Profile" Button for both Admin and Customer accounts */}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
                >
                  My Profile
                </button>

                {/* "Log Out" Button for both Admin and Customer accounts */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
                >
                  Log Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-2 text-xs sm:text-sm font-medium tracking-wider uppercase bg-[#141417] border border-[#00D4FF]/55 hover:border-[#7DF9FF] shadow-[0_0_8px_rgba(0,212,255,0.25),inset_0_1px_1px_rgba(125,249,255,0.2)] text-glossy-gold transition-colors cursor-pointer"
              >
                Reg/Sign In
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* "About US" Popup Window */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        isAdmin={user?.role === "admin"}
      />

      {/* "Contact" Popup Window */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        isAdmin={user?.role === "admin"}
      />

      {/* Registration / Sign In Popup Window */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={user}
        onAuthSuccess={(updatedUser) => {
          setUser(updatedUser);
          window.dispatchEvent(new Event("furious-auth-change"));
        }}
      />

      {/* "My Profile" Popup Window */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onProfileUpdated={(updatedUser) => setUser(updatedUser)}
      />

      {/* Admin "Customers" Popup Window */}
      <CustomersModal
        isOpen={isCustomersOpen}
        onClose={() => setIsCustomersOpen(false)}
      />

      {/* Admin "Products" Popup Window — All Products Manager across all categories */}
      <ProductsManagerModal
        isOpen={isProductsOpen}
        onClose={() => setIsProductsOpen(false)}
        categorySlug={null}
        categoryLabel={null}
      />

      {/* Admin "Statistics" Popup Window (Products, Sold Products, Customer Bookings, Business Analytics) */}
      <StatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
      />
    </>
  );
}
