"use client";

import React, { useEffect, useState } from "react";

export interface OwnerProfile {
  id: string;
  image: string;
  name: string;
  designation: string;
  email: string;
}

export interface AboutUsData {
  tagline: string;
  description: string;
  mission: string;
  vision: string;
  whyChooseUs: string;
  establishedYear: string;
  owners: OwnerProfile[];
}

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

const DEFAULT_ABOUT: AboutUsData = {
  tagline: "Get Set Go — Premium Moto Gear, Lubricants & Performance Parts",
  description:
    "FURIOUS MOTO SHOP is your trusted destination for 100% genuine motorcycle helmets, synthetic engine oils, oil additives, LED fog & head lights, riding safety guards, stock parts, aerodynamic body kits, security systems, and custom modification accessories.",
  mission:
    "To empower every rider with authentic, high-performance motorcycle parts and safety gear backed by reliable service and fair pricing.",
  vision:
    "To be the most trusted and comprehensive motorcycle performance & accessories hub for riders nationwide.",
  whyChooseUs:
    "100% Authentic Global Brands • Certified Riding Safety Gear • Expert Modification Advice • Dedicated Customer Support",
  establishedYear: "2024",
  owners: [
    {
      id: "owner-1",
      image: "",
      name: "Mridul",
      designation: "Co-Founder & Managing Owner",
      email: "mridul@gmail.com",
    },
    {
      id: "owner-2",
      image: "",
      name: "Owner 2",
      designation: "Co-Founder & Operations Head",
      email: "owner2@furiousmotoshop.com",
    },
    {
      id: "owner-3",
      image: "",
      name: "Owner 3",
      designation: "Co-Founder & Finance Director",
      email: "owner3@furiousmotoshop.com",
    },
    {
      id: "owner-4",
      image: "",
      name: "Owner 4",
      designation: "Co-Founder & Technical Director",
      email: "owner4@furiousmotoshop.com",
    },
  ],
};

export default function AboutModal({
  isOpen,
  onClose,
  isAdmin,
}: AboutModalProps) {
  const [aboutData, setAboutData] = useState<AboutUsData>(DEFAULT_ABOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable form state
  const [tagline, setTagline] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [description, setDescription] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [whyChooseUs, setWhyChooseUs] = useState("");
  const [owners, setOwners] = useState<OwnerProfile[]>(DEFAULT_ABOUT.owners);

  const syncFormFromData = (data: AboutUsData) => {
    setTagline(data.tagline || "");
    setEstablishedYear(data.establishedYear || "");
    setDescription(data.description || "");
    setMission(data.mission || "");
    setVision(data.vision || "");
    setWhyChooseUs(data.whyChooseUs || "");
    const fourOwners =
      Array.isArray(data.owners) && data.owners.length === 4
        ? data.owners.map((o) => ({ ...o }))
        : DEFAULT_ABOUT.owners.map((o) => ({ ...o }));
    setOwners(fourOwners);
  };

  const loadAboutInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site-info");
      const data = await res.json();
      if (data?.about) {
        setAboutData(data.about);
        syncFormFromData(data.about);
      }
    } catch {
      setError("Failed to load About Us information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setIsEditing(false);
      loadAboutInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOwnerFieldChange = (
    index: number,
    field: keyof OwnerProfile,
    value: string
  ) => {
    setOwners((prev) =>
      prev.map((owner, idx) =>
        idx === index ? { ...owner, [field]: value } : owner
      )
    );
  };

  const handleOwnerImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleOwnerFieldChange(index, "image", reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveAbout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const res = await fetch("/api/site-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about: {
            tagline,
            establishedYear,
            description,
            mission,
            vision,
            whyChooseUs,
            owners,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update About Us details.");
      } else {
        if (data.about) {
          setAboutData(data.about);
          syncFormFromData(data.about);
        }
        setSuccessMsg("About Us & Owners information updated successfully!");
        setIsEditing(false);
      }
    } catch {
      setError("Network error while saving About Us information.");
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
        className="relative w-full max-w-4xl p-6 sm:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
          className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-5 shrink-0"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-xl font-bold uppercase tracking-wider text-glossy-gold">
              About US — 𝔉𝔲𝔯𝔦𝔬𝔲𝔰
            </h3>
            {aboutData.establishedYear && (
              <span className="px-2.5 py-0.5 text-[11px] uppercase tracking-widest border border-[#00D4FF]/45 bg-[#0B0B0C] text-glossy-gold">
                Est. {aboutData.establishedYear}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMsg(null);
                  if (isEditing) {
                    syncFormFromData(aboutData);
                    setIsEditing(false);
                  } else {
                    syncFormFromData(aboutData);
                    setIsEditing(true);
                  }
                }}
                style={{ border: "1px solid rgba(255, 30, 39, 0.6)" }}
                className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] hover:border-[#FF6B6B] text-glossy-gold transition-colors cursor-pointer"
              >
                {isEditing ? "Cancel Modify" : "Modify About Us"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close About Us modal"
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
            Loading About Us information...
          </p>
        ) : isAdmin && isEditing ? (
          /* ADMIN MODIFY FORM */
          <form
            onSubmit={handleSaveAbout}
            className="flex-1 overflow-y-auto pr-1 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Company Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Enter company tagline"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Established Year
                </label>
                <input
                  type="text"
                  value={establishedYear}
                  onChange={(e) => setEstablishedYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Who We Are / Company Overview
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the company"
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Our Mission
                </label>
                <textarea
                  rows={3}
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="Enter company mission"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                  Our Vision
                </label>
                <textarea
                  rows={3}
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Enter company vision"
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Why Choose Us / Core Highlights
              </label>
              <textarea
                rows={2}
                value={whyChooseUs}
                onChange={(e) => setWhyChooseUs(e.target.value)}
                placeholder="Core strengths and highlights"
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:outline-none text-sm"
              />
            </div>

            {/* 4 Company Owners Edit Section */}
            <div className="pt-3 border-t border-[#00D4FF]/35">
              <h4 className="text-sm font-bold uppercase tracking-widest text-glossy-gold mb-3">
                Company Owners (4 Owners)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {owners.map((owner, idx) => (
                  <div
                    key={owner.id || idx}
                    className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/45 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-[#00D4FF]/25 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                        Owner #{idx + 1}
                      </span>
                      {owner.image && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOwnerFieldChange(idx, "image", "")
                          }
                          className="text-[11px] uppercase text-red-300 hover:text-red-200 cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>

                    {/* Owner Image Upload & Preview */}
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-[#141417] border border-[#00D4FF]/45 flex items-center justify-center overflow-hidden shrink-0">
                        {owner.image ? (
                          <img
                            src={owner.image}
                            alt={owner.name || `Owner ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] uppercase text-glossy-gold opacity-60 text-center px-1">
                            No Photo
                          </span>
                        )}
                      </div>

                      <label className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/55 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer">
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOwnerImageChange(idx, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-glossy-gold mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={owner.name}
                        onChange={(e) =>
                          handleOwnerFieldChange(idx, "name", e.target.value)
                        }
                        placeholder="Owner Name"
                        className="auth-input w-full px-3 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-glossy-gold mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={owner.designation}
                        onChange={(e) =>
                          handleOwnerFieldChange(
                            idx,
                            "designation",
                            e.target.value
                          )
                        }
                        placeholder="Designation"
                        className="auth-input w-full px-3 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-glossy-gold mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={owner.email}
                        onChange={(e) =>
                          handleOwnerFieldChange(idx, "email", e.target.value)
                        }
                        placeholder="owner@example.com"
                        className="auth-input w-full px-3 py-2 bg-[#111114] border border-[#00D4FF]/45 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 mt-2 bg-[#1A1215] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-semibold uppercase tracking-widest text-glossy-gold shadow-[0_0_12px_rgba(255,30,39,0.3)] transition-all cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save About Us & Owners"}
            </button>
          </form>
        ) : (
          /* READ-ONLY VIEW FOR CLIENTS & ADMIN DEFAULT VIEW */
          <div className="flex-1 overflow-y-auto pr-1 space-y-6">
            {/* Tagline & Overview Banner */}
            <div className="p-4 sm:p-5 bg-[#0B0B0C] border border-[#00D4FF]/45 space-y-2.5">
              {aboutData.tagline && (
                <h4 className="text-sm sm:text-base font-bold uppercase tracking-widest text-glossy-gold">
                  {aboutData.tagline}
                </h4>
              )}
              <p
                style={{ color: "#E5E7EB" }}
                className="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
              >
                {aboutData.description}
              </p>
            </div>

            {/* Mission & Vision Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Our Mission
                </h5>
                <p
                  style={{ color: "#D1D5DB" }}
                  className="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                >
                  {aboutData.mission}
                </p>
              </div>

              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Our Vision
                </h5>
                <p
                  style={{ color: "#D1D5DB" }}
                  className="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                >
                  {aboutData.vision}
                </p>
              </div>
            </div>

            {/* Why Choose Us */}
            {aboutData.whyChooseUs && (
              <div className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/40 space-y-2">
                <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold border-b border-[#00D4FF]/25 pb-1.5">
                  Why Choose FURIOUS
                </h5>
                <p
                  style={{ color: "#E5E7EB" }}
                  className="text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                >
                  {aboutData.whyChooseUs}
                </p>
              </div>
            )}

            {/* 4 Owners Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between border-b border-[#00D4FF]/35 pb-2 mb-4">
                <h4 className="text-sm sm:text-base font-bold uppercase tracking-[0.16em] text-glossy-gold">
                  Our Owners
                </h4>
                <span className="text-[11px] uppercase tracking-wider text-glossy-gold">
                  4 Owners
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {(aboutData.owners || DEFAULT_ABOUT.owners)
                  .slice(0, 4)
                  .map((owner, idx) => (
                    <div
                      key={owner.id || idx}
                      className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/45 flex flex-col items-center text-center"
                    >
                      {/* Owner Image */}
                      <div className="w-24 h-24 mb-3 bg-[#141417] border border-[#00D4FF]/50 overflow-hidden flex items-center justify-center shrink-0">
                        {owner.image ? (
                          <img
                            src={owner.image}
                            alt={owner.name || `Owner ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FF1E27"
                            strokeWidth="1.5"
                            className="w-10 h-10 opacity-75"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Owner Name */}
                      <h5 className="text-sm font-bold uppercase tracking-wider text-glossy-gold">
                        {owner.name || `Owner ${idx + 1}`}
                      </h5>

                      {/* Owner Designation */}
                      <p className="text-xs font-medium uppercase tracking-wide text-glossy-gold opacity-90 mt-1">
                        {owner.designation || "Owner"}
                      </p>

                      {/* Owner Email */}
                      {owner.email && (
                        <p
                          style={{ color: "#D1D5DB" }}
                          className="text-[11px] mt-2 break-all"
                        >
                          {owner.email}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

