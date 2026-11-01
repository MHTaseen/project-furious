"use client";

import React, { useEffect, useState } from "react";

export interface ContactUsData {
  shopName: string;
  address: string;
  primaryPhone: string;
  secondaryPhone: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  businessHours: string;
  facebookUrl: string;
  instagramUrl: string;
  mapLocation: string;
  additionalNote: string;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

const DEFAULT_CONTACT: ContactUsData = {
  shopName: "FURIOUS MOTO SHOP",
  address: "Race Course",
  primaryPhone: "01836585258",
  secondaryPhone: "",
  whatsapp: "01836585258",
  email: "mridul@gmail.com",
  supportEmail: "support@furiousmotoshop.com",
  businessHours:
    "Saturday – Thursday: 10:00 AM – 10:00 PM (Friday: 3:00 PM – 10:00 PM)",
  facebookUrl: "https://facebook.com/furiousmotoshop",
  instagramUrl: "https://instagram.com/furiousmotoshop",
  mapLocation: "Race Course",
  additionalNote:
    "Feel free to call, WhatsApp, or visit our showroom for genuine parts, helmets, engine oils, and bike modification consultations.",
};

export default function ContactModal({
  isOpen,
  onClose,
  isAdmin,
}: ContactModalProps) {
  const [contactData, setContactData] = useState<ContactUsData>(DEFAULT_CONTACT);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [mapLocation, setMapLocation] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");

  const syncFormFromData = (data: ContactUsData) => {
    setShopName(data.shopName || "");
    setAddress(data.address || "");
    setPrimaryPhone(data.primaryPhone || "");
    setSecondaryPhone(data.secondaryPhone || "");
    setWhatsapp(data.whatsapp || "");
    setEmail(data.email || "");
    setSupportEmail(data.supportEmail || "");
    setBusinessHours(data.businessHours || "");
    setFacebookUrl(data.facebookUrl || "");
    setInstagramUrl(data.instagramUrl || "");
    setMapLocation(data.mapLocation || "");
    setAdditionalNote(data.additionalNote || "");
  };

  const loadContactInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site-info");
      const data = await res.json();
      if (data?.contact) {
        setContactData(data.contact);
        syncFormFromData(data.contact);
      }
    } catch {
      setError("Failed to load Contact information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setIsEditing(false);
      loadContactInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const res = await fetch("/api/site-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            shopName,
            address,
            primaryPhone,
            secondaryPhone,
            whatsapp,
            email,
            supportEmail,
            businessHours,
            facebookUrl,
            instagramUrl,
            mapLocation,
            additionalNote,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update Contact details.");
      } else {
        if (data.contact) {
          setContactData(data.contact);
          syncFormFromData(data.contact);
        }
        setSuccessMsg("Contact information updated successfully!");
        setIsEditing(false);
      }
    } catch {
      setError("Network error while saving Contact information.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111114",
          border: "1.5px solid rgba(255, 30, 39, 0.65)",
          boxShadow: "0 0 40px rgba(255, 30, 39, 0.25)",
          maxHeight: "90vh",
        }}
        className="relative w-full max-w-3xl p-6 sm:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
          className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-5 shrink-0"
        >
          <h3 className="text-base sm:text-xl font-bold uppercase tracking-wider text-glossy-gold">
            Contact Us — 𝔉𝔲𝔯𝔦𝔬𝔲𝔰
          </h3>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  if (isEditing) {
                    syncFormFromData(contactData);
                    setIsEditing(false);
                  } else {
                    syncFormFromData(contactData);
                    setIsEditing(true);
                  }
                }}
                style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold transition-colors cursor-pointer"
              >
                {isEditing ? "Cancel Modify" : "Modify Contact"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Contact modal"
              style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
              className="w-8 h-8 flex items-center justify-center bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
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

        {loading ? (
          <p className="py-12 text-center text-sm text-glossy-gold">
            Loading Contact information...
          </p>
        ) : isAdmin && isEditing ? (
          /* ADMIN MODIFY FORM */
          <form
            onSubmit={handleSaveContact}
            className="flex-1 overflow-y-auto pr-1 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Shop / Company Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="FURIOUS MOTO SHOP"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Showroom / Office Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter showroom address"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Primary Phone / Hotline
                </label>
                <input
                  type="text"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  placeholder="01836585258"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Secondary Phone (Optional)
                </label>
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="Enter secondary phone"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Enter WhatsApp number"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mridul@gmail.com"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Customer Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@furiousmotoshop.com"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Map / Location Landmark
                </label>
                <input
                  type="text"
                  value={mapLocation}
                  onChange={(e) => setMapLocation(e.target.value)}
                  placeholder="Location landmark or map URL"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Business / Opening Hours
              </label>
              <input
                type="text"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                placeholder="e.g. Saturday – Thursday: 10:00 AM – 10:00 PM"
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Facebook Page Link
                </label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Instagram Link
                </label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Customer Support / Showroom Note
              </label>
              <textarea
                rows={3}
                value={additionalNote}
                onChange={(e) => setAdditionalNote(e.target.value)}
                placeholder="Additional note for customers"
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 mt-2 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-semibold uppercase tracking-widest text-glossy-gold shadow-[0_0_12px_rgba(255,30,39,0.3)] transition-all cursor-pointer"
            >
              {saving ? "Saving Contact Info..." : "Save Contact Information"}
            </button>
          </form>
        ) : (
          /* READ-ONLY VIEW FOR CLIENTS & ADMIN DEFAULT VIEW */
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            {/* Shop Header Banner */}
            <div className="p-4 sm:p-5 bg-[#0B0B0C] border border-[#00D4FF]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base sm:text-lg font-bold uppercase tracking-widest text-glossy-gold">
                  {contactData.shopName || "FURIOUS MOTO SHOP"}
                </h4>
                {contactData.address && (
                  <p
                    style={{ color: "#E5E7EB" }}
                    className="text-xs sm:text-sm mt-1"
                  >
                    Showroom Address: {contactData.address}
                  </p>
                )}
              </div>
              {contactData.mapLocation && (
                <div className="px-3 py-1.5 bg-[#141417] border border-[#00D4FF]/40 text-xs uppercase tracking-wider text-glossy-gold self-start sm:self-center">
                  Location: {contactData.mapLocation}
                </div>
              )}
            </div>

            {/* Contact Details Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone & Hotline */}
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-1.5">
                <h5 className="text-xs font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Phone & Hotline
                </h5>
                <p
                  style={{ color: "#E5E7EB" }}
                  className="text-xs sm:text-sm font-medium pt-1"
                >
                  Primary: {contactData.primaryPhone || "N/A"}
                </p>
                {contactData.secondaryPhone && (
                  <p style={{ color: "#D1D5DB" }} className="text-xs sm:text-sm">
                    Secondary: {contactData.secondaryPhone}
                  </p>
                )}
                {contactData.whatsapp && (
                  <p style={{ color: "#D1D5DB" }} className="text-xs sm:text-sm">
                    WhatsApp: {contactData.whatsapp}
                  </p>
                )}
              </div>

              {/* Email & Support */}
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-1.5">
                <h5 className="text-xs font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Email & Support
                </h5>
                <p
                  style={{ color: "#E5E7EB" }}
                  className="text-xs sm:text-sm pt-1 break-all"
                >
                  Official Email: {contactData.email || "N/A"}
                </p>
                {contactData.supportEmail && (
                  <p
                    style={{ color: "#D1D5DB" }}
                    className="text-xs sm:text-sm break-all"
                  >
                    Support Email: {contactData.supportEmail}
                  </p>
                )}
              </div>

              {/* Business Hours */}
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-1.5">
                <h5 className="text-xs font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Business Hours
                </h5>
                <p
                  style={{ color: "#E5E7EB" }}
                  className="text-xs sm:text-sm leading-relaxed pt-1"
                >
                  {contactData.businessHours || "Open Daily"}
                </p>
              </div>

              {/* Social Channels */}
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-1.5">
                <h5 className="text-xs font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Social Channels
                </h5>
                <div className="pt-1 space-y-1 text-xs sm:text-sm">
                  {contactData.facebookUrl && (
                    <p style={{ color: "#E5E7EB" }} className="break-all">
                      Facebook: {contactData.facebookUrl}
                    </p>
                  )}
                  {contactData.instagramUrl && (
                    <p style={{ color: "#D1D5DB" }} className="break-all">
                      Instagram: {contactData.instagramUrl}
                    </p>
                  )}
                  {!contactData.facebookUrl && !contactData.instagramUrl && (
                    <p style={{ color: "#9CA3AF" }}>Not specified</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Customer Note */}
            {contactData.additionalNote && (
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-1.5">
                <h5 className="text-xs font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Customer Assistance
                </h5>
                <p
                  style={{ color: "#E5E7EB" }}
                  className="text-xs sm:text-sm leading-relaxed pt-1 whitespace-pre-line"
                >
                  {contactData.additionalNote}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

