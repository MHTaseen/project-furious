"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthModal, { AuthenticatedUser } from "@/components/AuthModal";

interface BookingReply {
  id: string;
  sender: "admin" | "customer";
  senderName: string;
  message: string;
  createdAt: string;
}

interface BookingDetail {
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
  replies: BookingReply[];
  createdAt: string;
  updatedAt: string;
}

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [httpStatus, setHttpStatus] = useState<number>(200);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadBookingDetail = async () => {
    try {
      const [bkRes, meRes] = await Promise.all([
        fetch(`/api/bookings?id=${encodeURIComponent(id)}`),
        fetch("/api/auth/me"),
      ]);
      const bkData = await bkRes.json();
      const meData = await meRes.json();

      setHttpStatus(bkRes.status);
      const userObj = meData?.user || null;
      setCurrentUser(userObj);
      setIsAdmin(userObj?.role === "admin");

      if (bkRes.ok && bkData?.booking) {
        setBooking(bkData.booking);
        setError(null);
      } else {
        setBooking(null);
        setError(bkData?.error || "Booking notification not found.");
      }
    } catch {
      setError("Failed to load booking notification details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingDetail();
    const handleAuthChange = () => {
      loadBookingDetail();
    };
    window.addEventListener("furious-auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("furious-auth-change", handleAuthChange);
    };
  }, [id]);

  const handleSwitchAccount = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setIsAdmin(false);
      window.dispatchEvent(new Event("furious-auth-change"));
      setIsAuthOpen(true);
    } catch {
      // ignore
    }
  };

  const handleUpdateStatus = async (
    nextStatus: "confirmed" | "cancelled" | "pending"
  ) => {
    if (!booking || actionBusy) return;
    setError(null);
    setSuccessMsg(null);
    setActionBusy(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          id: booking.id,
          status: nextStatus,
          recordAsSale: nextStatus === "confirmed",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update booking status.");
      } else {
        if (data.booking) setBooking(data.booking);
        window.dispatchEvent(new Event("furious-bookings-change"));
        window.dispatchEvent(new Event("furious-sales-change"));
        setSuccessMsg(
          nextStatus === "confirmed"
            ? "Booking CONFIRMED and recorded in Sold Products & Business Analytics!"
            : nextStatus === "cancelled"
            ? "Booking marked as Cancelled."
            : "Booking marked as Pending."
        );
      }
    } catch {
      setError("Network error while updating booking status.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !replyText.trim() || actionBusy) return;

    setError(null);
    setSuccessMsg(null);
    setActionBusy(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          id: booking.id,
          replyMessage: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reply.");
      } else {
        if (data.booking) setBooking(data.booking);
        setReplyText("");
        window.dispatchEvent(new Event("furious-bookings-change"));
        setSuccessMsg("Reply sent successfully!");
      }
    } catch {
      setError("Network error while sending reply.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemoveFromBellList = async () => {
    if (!booking || actionBusy) return;
    setActionBusy(true);
    try {
      await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          id: booking.id,
        }),
      });
      window.dispatchEvent(new Event("furious-bookings-change"));
      router.push(isAdmin ? "/admin" : "/");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-9.75rem)] bg-matte-black px-6 sm:px-10 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#00D4FF]/35">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#141417] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
            >
              ← Back
            </button>
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-glossy-gold">
              Booking Notification Details
            </h1>
          </div>

          {isAdmin && booking && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={handleRemoveFromBellList}
              style={{ border: "1px solid rgba(255, 80, 80, 0.55)" }}
              className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#1A0D10] text-red-300 hover:border-red-400 cursor-pointer"
            >
              ✕ Remove from Bell List
            </button>
          )}
        </div>

        {/* Status Feedback */}
        {error && (
          <div className="p-3.5 border border-red-500/60 bg-red-950/40 text-xs sm:text-sm text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 border border-[#FF1E27]/65 bg-[#FF1E27]/15 text-xs sm:text-sm text-glossy-gold">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm uppercase tracking-wider text-glossy-gold">
              Loading booking details...
            </p>
          </div>
        ) : !booking ? (
          <div
            style={{
              backgroundColor: "#111114",
              border: "1.5px solid rgba(0, 212, 255, 0.4)",
              boxShadow: "0 0 30px rgba(0, 212, 255, 0.15)",
            }}
            className="py-12 px-6 sm:px-10 text-center space-y-5 max-w-xl mx-auto"
          >
            {/* Lock / Security Shield Icon */}
            <div className="w-14 h-14 mx-auto rounded-full bg-[#141417] border border-[#00D4FF]/60 shadow-[0_0_15px_rgba(0,212,255,0.3)] flex items-center justify-center">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00D4FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {httpStatus === 401 ? (
              /* Case 1: Visitor is not logged in at all */
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-glossy-gold">
                  Sign In Required
                </h2>
                <p style={{ color: "#9CA3AF" }} className="text-xs sm:text-sm">
                  This booking notification is private and protected. Please sign in to the account that placed the booking to view its details.
                </p>
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider bg-[#141417] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-glossy-gold shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                  <Link
                    href="/"
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider bg-[#141417] border border-gray-700 hover:border-gray-500 text-gray-300 transition-colors"
                  >
                    Return Home
                  </Link>
                </div>
              </div>
            ) : httpStatus === 403 ? (
              /* Case 2: Visitor is logged into their own account, but the booking belongs to someone else! */
              <div className="space-y-3">
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-red-400">
                  Access Denied
                </h2>
                <p style={{ color: "#D1D5DB" }} className="text-xs sm:text-sm leading-relaxed">
                  You are signed in as{" "}
                  <span className="text-glossy-gold font-semibold">
                    {currentUser?.name || "Customer"} ({currentUser?.phone})
                  </span>
                  . This booking was placed by another customer and cannot be viewed or modified from your account.
                </p>
                <p style={{ color: "#9CA3AF" }} className="text-xs">
                  Each customer&apos;s bookings and personal information are strictly private.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <Link
                    href="/"
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider bg-[#141417] border border-[#00D4FF]/60 hover:border-[#7DF9FF] text-glossy-gold transition-colors"
                  >
                    Return Home
                  </Link>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider bg-[#141417] border border-amber-500/60 hover:border-amber-400 text-amber-300 transition-colors cursor-pointer"
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            ) : (
              /* Case 3: 404 Not Found or other error */
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-glossy-gold">
                  Booking Not Found
                </h2>
                <p style={{ color: "#9CA3AF" }} className="text-xs sm:text-sm">
                  {error || "The booking notification you requested could not be found."}
                </p>
                <div className="pt-4">
                  <Link
                    href="/"
                    className="inline-block px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider bg-[#141417] border border-[#00D4FF]/55 text-glossy-gold hover:border-[#7DF9FF] transition-colors"
                  >
                    Return Home
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Status Banner & Admin Action Controls */}
            <div
              style={{
                backgroundColor: "#111114",
                border: "1.5px solid rgba(255, 30, 39, 0.6)",
                boxShadow: "0 0 25px rgba(255, 30, 39, 0.18)",
              }}
              className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs uppercase tracking-widest text-glossy-gold">
                    Current Status:
                  </span>
                  <span
                    className={`px-3 py-1 text-xs font-extrabold uppercase tracking-widest border ${
                      booking.status === "confirmed"
                        ? "border-emerald-500 bg-emerald-950/60 text-emerald-300"
                        : booking.status === "cancelled"
                        ? "border-red-500 bg-red-950/60 text-red-300"
                        : "border-[#FF1E27] bg-[#1A1215] text-glossy-gold"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <p style={{ color: "#9CA3AF" }} className="text-xs">
                  Booked on:{" "}
                  {new Date(booking.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              {/* Admin Action Buttons: Confirm / Cancel / Mark Pending */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={actionBusy || booking.status === "confirmed"}
                    onClick={() => handleUpdateStatus("confirmed")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      booking.status === "confirmed"
                        ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300/60 cursor-default"
                        : "border-emerald-500 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    }`}
                  >
                    ✓ Confirm Booking
                  </button>

                  <button
                    type="button"
                    disabled={actionBusy || booking.status === "cancelled"}
                    onClick={() => handleUpdateStatus("cancelled")}
                    style={{ border: "1px solid rgba(255, 80, 80, 0.65)" }}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#1A0D10] text-red-300 hover:border-red-400 transition-all cursor-pointer ${
                      booking.status === "cancelled"
                        ? "opacity-50 cursor-default"
                        : ""
                    }`}
                  >
                    ✕ Cancel Booking
                  </button>

                  {booking.status !== "pending" && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleUpdateStatus("pending")}
                      className="px-3 py-2 text-xs uppercase tracking-wider bg-[#141417] border border-[#00D4FF]/45 text-glossy-gold cursor-pointer"
                    >
                      Reset to Pending
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Product & Customer Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Booked Product Card */}
              <div
                style={{
                  backgroundColor: "#111114",
                  border: "1.5px solid rgba(255, 30, 39, 0.5)",
                }}
                className="p-5 sm:p-6 space-y-4"
              >
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/35 pb-2">
                  Booked Product Information
                </h2>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-28 h-28 bg-[#0B0B0C] border border-[#00D4FF]/45 flex items-center justify-center p-2 overflow-hidden shrink-0">
                    {booking.productImage ? (
                      <img
                        src={booking.productImage}
                        alt={booking.productName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs uppercase text-glossy-gold opacity-60">
                        No Image
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <h3 className="text-base font-bold uppercase tracking-wider text-glossy-gold">
                      {booking.productName}
                    </h3>
                    <p className="text-sm font-bold text-glossy-gold">
                      Unit Price: {booking.productPrice || "N/A"}
                    </p>
                    <p className="text-sm font-bold text-glossy-gold">
                      Booked Quantity: {booking.quantity}
                    </p>
                    {booking.categoryLabel && (
                      <p style={{ color: "#E5E7EB" }}>
                        <strong>Category:</strong> {booking.categoryLabel}
                      </p>
                    )}
                    {booking.productCode && (
                      <p style={{ color: "#E5E7EB" }}>
                        <strong>Product Code:</strong> {booking.productCode}
                      </p>
                    )}
                    {booking.uidNumber && (
                      <p style={{ color: "#E5E7EB" }}>
                        <strong>UID Number:</strong> {booking.uidNumber}
                      </p>
                    )}
                    {booking.modelNumber && (
                      <p style={{ color: "#E5E7EB" }}>
                        <strong>Model Number:</strong> {booking.modelNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information Card */}
              <div
                style={{
                  backgroundColor: "#111114",
                  border: "1.5px solid rgba(255, 30, 39, 0.5)",
                }}
                className="p-5 sm:p-6 space-y-3"
              >
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/35 pb-2">
                  Customer Information
                </h2>

                <div
                  style={{ color: "#E5E7EB" }}
                  className="space-y-2 text-xs sm:text-sm"
                >
                  <p>
                    <strong className="text-glossy-gold uppercase tracking-wider">
                      Customer Name:
                    </strong>{" "}
                    {booking.customerName}
                  </p>
                  <p>
                    <strong className="text-glossy-gold uppercase tracking-wider">
                      Phone Number:
                    </strong>{" "}
                    {booking.customerPhone}
                  </p>
                  {booking.customerEmail && (
                    <p>
                      <strong className="text-glossy-gold uppercase tracking-wider">
                        Email:
                      </strong>{" "}
                      {booking.customerEmail}
                    </p>
                  )}
                  <p>
                    <strong className="text-glossy-gold uppercase tracking-wider">
                      Address:
                    </strong>{" "}
                    {booking.customerAddress || "Not provided"}
                  </p>

                  {booking.customerNote && (
                    <div className="pt-2 mt-2 border-t border-[#00D4FF]/25">
                      <strong className="text-glossy-gold uppercase tracking-wider block mb-1">
                        Customer Booking Note:
                      </strong>
                      <p className="p-3 bg-[#0B0B0C] border border-[#00D4FF]/35 whitespace-pre-wrap">
                        {booking.customerNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reply Back & Interactive Conversation Section */}
            <div
              style={{
                backgroundColor: "#111114",
                border: "1.5px solid rgba(255, 30, 39, 0.55)",
              }}
              className="p-5 sm:p-6 space-y-4"
            >
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/35 pb-2">
                Reply Back & Interaction Thread ({booking.replies?.length || 0})
              </h2>

              {/* Existing Replies List */}
              {!booking.replies || booking.replies.length === 0 ? (
                <p
                  style={{ color: "#9CA3AF" }}
                  className="text-xs sm:text-sm py-3"
                >
                  No replies yet. Send a message below to reply back and
                  interact with this booking.
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {booking.replies.map((rep) => (
                    <div
                      key={rep.id}
                      className={`p-3.5 border ${
                        rep.sender === "admin"
                          ? "bg-[#1A1215] border-[#FF1E27]/60 ml-0 sm:mr-8"
                          : "bg-[#0B0B0C] border-[#00D4FF]/40 ml-0 sm:ml-8"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                          {rep.senderName}
                        </span>
                        <span
                          style={{ color: "#9CA3AF" }}
                          className="text-[11px]"
                        >
                          {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p
                        style={{ color: "#F3F4F6" }}
                        className="text-xs sm:text-sm whitespace-pre-wrap"
                      >
                        {rep.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-glossy-gold">
                  {isAdmin
                    ? "Reply Back to Customer"
                    : "Send a Reply / Follow-up Message"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    isAdmin
                      ? "Type your confirmation note, delivery schedule, or reply to the customer..."
                      : "Type your message to Admin..."
                  }
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 text-sm focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="px-6 py-2.5 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold cursor-pointer"
                  >
                    {actionBusy ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        user={currentUser}
        onAuthSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
          setIsAuthOpen(false);
          loadBookingDetail();
          window.dispatchEvent(new Event("furious-auth-change"));
        }}
      />
    </div>
  );
}

