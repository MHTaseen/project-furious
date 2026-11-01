"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductsManagerModal from "./ProductsManagerModal";

interface BookingReplyItem {
  id: string;
  sender: "admin" | "customer";
  senderName: string;
  message: string;
  createdAt: string;
}

interface BookingNotificationItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  productPrice: string;
  productCode: string;
  uidNumber: string;
  modelNumber: string;
  categorySlug: string;
  categoryLabel: string;
  quantity: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerNote: string;
  status: "pending" | "confirmed" | "cancelled";
  seenByAdmin: boolean;
  dismissedFromBell: boolean;
  replies: BookingReplyItem[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryItem {
  id: string;
  label: string;
  slug: string;
}

const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: "cat-1", label: "Helmets", slug: "helmets" },
  { id: "cat-2", label: "Engine Oil", slug: "engine-oil" },
  { id: "cat-3", label: "Fog Lights", slug: "fog-lights" },
  { id: "cat-4", label: "Head Lights", slug: "head-lights" },
  { id: "cat-5", label: "Wind Breakers", slug: "wind-breakers" },
  { id: "cat-6", label: "Gloves", slug: "gloves" },
  { id: "cat-7", label: "Safety Guards", slug: "safety-guards" },
  { id: "cat-8", label: "Oil Additives", slug: "oil-additives" },
  { id: "cat-9", label: "Stock Parts", slug: "stock-parts" },
  { id: "cat-10", label: "Body Kits", slug: "body-kits" },
  { id: "cat-11", label: "Security System", slug: "security-system" },
  { id: "cat-12", label: "Modification Items", slug: "modification-items" },
];

export default function CategoryDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [categories, setCategories] =
    useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [busy, setBusy] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<BookingNotificationItem[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Admin Category Products Popup Modal state
  const [activeCategoryModal, setActiveCategoryModal] =
    useState<CategoryItem | null>(null);

  const loadNotifications = () => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.bookings)) {
          setNotifications(data.bookings);
        }
        if (typeof data?.unreadCount === "number") {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
  };

  const loadCategoriesAndRole = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.categories)) {
          setCategories(data.categories);
        }
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const logged = Boolean(data?.user);
        setIsLoggedIn(logged);
        setIsAdmin(data?.user?.role === "admin");
        loadNotifications();
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsAdmin(false);
      });
  };

  useEffect(() => {
    loadCategoriesAndRole();
    const handleAuthChange = () => loadCategoriesAndRole();
    const handleBookingsChange = () => loadNotifications();
    window.addEventListener("furious-auth-change", handleAuthChange);
    window.addEventListener("furious-bookings-change", handleBookingsChange);

    // Poll notifications every 6 seconds so Admin sees new customer bookings live
    const interval = setInterval(loadNotifications, 6000);

    return () => {
      window.removeEventListener("furious-auth-change", handleAuthChange);
      window.removeEventListener(
        "furious-bookings-change",
        handleBookingsChange
      );
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCategoriesAndRole();
    }
  }, [isOpen]);

  const handleToggleBell = async () => {
    const nextOpen = !isBellOpen;
    setIsBellOpen(nextOpen);
    if (nextOpen) {
      setIsOpen(false);
      // When Admin clicks the bell icon and sees the notifications,
      // remove the unread number from the bell icon while keeping the items in the list
      if (isAdmin && unreadCount > 0) {
        setUnreadCount(0);
        try {
          const res = await fetch("/api/bookings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_all_seen" }),
          });
          const data = await res.json();
          if (Array.isArray(data?.bookings)) {
            setNotifications(data.bookings);
          }
        } catch {
          // Ignore network error
        }
      } else {
        loadNotifications();
      }
    }
  };

  const handleDismissNotification = async (
    id: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    // Optimistically remove from list
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", id }),
      });
      const data = await res.json();
      if (Array.isArray(data?.bookings)) {
        setNotifications(data.bookings);
      }
      if (typeof data?.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Ignore error
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryLabel.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
        setNewCategoryLabel("");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleStartEdit = (category: CategoryItem) => {
    setEditingId(category.id);
    setEditingLabel(category.label);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editingLabel.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: trimmed }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
        setEditingId(null);
        setEditingLabel("");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
        if (editingId === id) {
          setEditingId(null);
          setEditingLabel("");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Universal Square Category Button (left-most) & Notification Bell Button (right-most) Bar */}
      <div className="category-top-bar justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Categories"
          aria-expanded={isOpen}
          title="Categories"
          className="category-square-btn"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="logoThemeGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="40%" stopColor="#D1D5DB" />
                <stop offset="75%" stopColor="#FF1E27" />
                <stop offset="100%" stopColor="#FF5A5F" />
              </linearGradient>
            </defs>
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="1"
              stroke="url(#logoThemeGrad)"
              strokeWidth="2"
            />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="1"
              stroke="url(#logoThemeGrad)"
              strokeWidth="2"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="1"
              stroke="url(#logoThemeGrad)"
              strokeWidth="2"
            />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="1"
              stroke="url(#logoThemeGrad)"
              strokeWidth="2"
            />
          </svg>
        </button>

        {/* Square Notification Bell Button (right-most) */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleBell}
            aria-label="Notifications"
            aria-expanded={isBellOpen}
            title="Notifications"
            className="category-square-btn relative"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="url(#logoThemeGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="url(#logoThemeGrad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Unread Notification Count Badge (Removed as soon as Admin clicks the Bell Icon) */}
            {isAdmin && unreadCount > 0 && (
              <span
                style={{
                  backgroundColor: "#FF1E27",
                  boxShadow: "0 0 10px rgba(255, 30, 39, 0.9)",
                }}
                className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white border border-white/80 select-none"
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Bell Popup / Dropdown List */}
          {isBellOpen && (
            <>
              <div
                className="fixed inset-0 z-[65]"
                onClick={() => setIsBellOpen(false)}
              />
              <div
                style={{
                  backgroundColor: "#0E0E12",
                  border: "1.5px solid rgba(255, 30, 39, 0.65)",
                  boxShadow: "0 10px 35px rgba(0, 0, 0, 0.9), 0 0 25px rgba(255, 30, 39, 0.25)",
                  maxHeight: "75vh",
                }}
                className="absolute right-0 mt-2 w-80 sm:w-96 z-[75] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.4)" }}
                  className="px-4 py-3 bg-[#141417] flex items-center justify-between shrink-0"
                >
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold">
                    {isAdmin
                      ? `Booking Notifications (${notifications.length})`
                      : `My Bookings & Replies (${notifications.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBellOpen(false)}
                    style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                    className="w-6 h-6 flex items-center justify-center text-xs bg-[#0B0B0C] text-glossy-gold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#FF1E27]/20">
                  {notifications.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <p className="text-xs uppercase tracking-wider text-glossy-gold opacity-80">
                        {isLoggedIn
                          ? "No booking notifications in the list."
                          : "Sign in or book a product to see notifications."}
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          setIsBellOpen(false);
                          router.push(`/notifications/${notif.id}`);
                        }}
                        className="p-3.5 hover:bg-[#1A1215] transition-colors flex items-start justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Product Thumbnail */}
                          <div className="w-12 h-12 bg-[#141417] border border-[#00D4FF]/40 flex items-center justify-center overflow-hidden shrink-0">
                            {notif.productImage ? (
                              <img
                                src={notif.productImage}
                                alt={notif.productName}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-[9px] uppercase text-glossy-gold opacity-60">
                                Item
                              </span>
                            )}
                          </div>

                          {/* Booking Info Summary */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold uppercase tracking-wider text-glossy-gold truncate">
                                {notif.productName}
                              </p>
                              <span
                                className={`px-1.5 py-0.5 text-[9px] uppercase font-bold border ${
                                  notif.status === "confirmed"
                                    ? "border-emerald-500/60 bg-emerald-950/50 text-emerald-300"
                                    : notif.status === "cancelled"
                                    ? "border-red-500/60 bg-red-950/50 text-red-300"
                                    : "border-[#00D4FF]/50 bg-[#141417] text-glossy-gold"
                                }`}
                              >
                                {notif.status}
                              </span>
                            </div>

                            <p
                              style={{ color: "#E5E7EB" }}
                              className="text-[11px] mt-1 truncate"
                            >
                              Customer: <strong>{notif.customerName}</strong> (
                              {notif.customerPhone})
                            </p>

                            <p
                              style={{ color: "#9CA3AF" }}
                              className="text-[10px] mt-0.5"
                            >
                              Qty: {notif.quantity} • {notif.productPrice} •{" "}
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </p>

                            {notif.replies?.length > 0 && (
                              <p className="text-[10px] text-glossy-gold mt-1 truncate">
                                💬 {notif.replies.length} reply(s) — Click to
                                view
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Cross (✕) Button beside each notification info so Admin can remove it from the list */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) =>
                              handleDismissNotification(notif.id, e)
                            }
                            title="Remove from notification list"
                            aria-label="Remove notification from list"
                            style={{
                              border: "1px solid rgba(255, 80, 80, 0.55)",
                            }}
                            className="w-6 h-6 flex items-center justify-center bg-[#1A0D10] hover:bg-red-950 text-red-300 hover:border-red-400 text-xs shrink-0 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Backdrop Overlay when Drawer is Open */}
      {isOpen && (
        <div
          className="category-drawer-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Category Drawer positioned cleanly below the Category Button */}
      <aside
        aria-label="Category Drawer"
        aria-hidden={!isOpen}
        style={{ width: isAdmin ? "22rem" : "19rem" }}
        className={`category-drawer-panel ${isOpen ? "open" : "closed"}`}
      >
        {/* Drawer Header */}
        <div
          style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.45)" }}
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-glossy-gold">
            Categories
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close categories drawer"
            style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
            className="w-7 h-7 flex items-center justify-center text-glossy-gold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Admin Only: Add New Category Form */}
        {isAdmin && (
          <form
            onSubmit={handleAddCategory}
            style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
            className="p-3.5 bg-[#0B0B0E] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              placeholder="Add new category..."
              className="auth-input flex-1 px-2.5 py-1.5 text-xs bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              style={{ border: "1px solid rgba(255, 30, 39, 0.65)" }}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#7DF9FF] text-glossy-gold cursor-pointer shrink-0"
            >
              + Add
            </button>
          </form>
        )}

        {/* Scrollable Vertical List of Clickable Category Options */}
        <ul className="flex-1 overflow-y-auto py-1">
          {categories.map((category) => (
            <li
              key={category.id}
              style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.18)" }}
            >
              {isAdmin && editingId === category.id ? (
                /* Inline Edit Row for Admin */
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1A1215]">
                  <input
                    type="text"
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="auth-input flex-1 px-2 py-1 text-xs bg-[#0B0B0C] border border-[#00D4FF]/55 focus:border-[#7DF9FF] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSaveEdit(category.id)}
                    title="Save"
                    style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                    className="px-2 py-1 text-xs bg-[#0B0B0C] text-glossy-gold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingLabel("");
                    }}
                    title="Cancel"
                    style={{ border: "1px solid rgba(255, 30, 39, 0.35)" }}
                    className="px-2 py-1 text-xs bg-[#0B0B0C] text-glossy-gold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-5 py-3 hover:bg-[#1A1215] transition-colors">
                  {isAdmin ? (
                    /* For Admin: clicking the category opens the Category Products Management Popup */
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setActiveCategoryModal(category);
                      }}
                      className="flex-1 flex items-center justify-between text-left text-sm font-medium tracking-wider uppercase text-glossy-gold pr-2 cursor-pointer"
                    >
                      <span>{category.label}</span>
                    </button>
                  ) : (
                    /* For Customers: clicking the category navigates to that category's products page */
                    <Link
                      href={`/category/${category.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 flex items-center justify-between text-sm font-medium tracking-wider uppercase text-glossy-gold pr-2"
                    >
                      <span>{category.label}</span>
                      <span className="text-xs opacity-70">›</span>
                    </Link>
                  )}

                  {/* Admin Controls: Edit & Delete Category */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(category)}
                        title="Edit Category"
                        style={{ border: "1px solid rgba(255, 30, 39, 0.5)" }}
                        className="px-2 py-1 text-[11px] uppercase tracking-wider bg-[#0B0B0C] hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        title="Delete Category"
                        style={{ border: "1px solid rgba(255, 80, 80, 0.55)" }}
                        className="px-2 py-1 text-[11px] uppercase tracking-wider bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* Admin Category-Specific Products Popup Window */}
      <ProductsManagerModal
        isOpen={Boolean(activeCategoryModal)}
        onClose={() => setActiveCategoryModal(null)}
        categorySlug={activeCategoryModal?.slug || null}
        categoryLabel={activeCategoryModal?.label || null}
      />
    </>
  );
}
