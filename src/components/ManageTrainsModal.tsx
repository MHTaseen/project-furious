"use client";

import React, { useEffect, useState, useRef } from "react";
import { BrandLogoItem, ShowcaseImageItem } from "@/types/homepageTrains";

interface ManageTrainsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "logos" | "showcase";
  onSaved?: () => void;
}

export default function ManageTrainsModal({
  isOpen,
  onClose,
  initialTab = "logos",
  onSaved,
}: ManageTrainsModalProps) {
  const [activeTab, setActiveTab] = useState<"logos" | "showcase">(initialTab);
  const [brandLogos, setBrandLogos] = useState<BrandLogoItem[]>([]);
  const [showcaseImages, setShowcaseImages] = useState<ShowcaseImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Brand Logo Form State
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandImage, setNewBrandImage] = useState("");
  const brandFileInputRef = useRef<HTMLInputElement | null>(null);

  // New Showcase Image Form State
  const [newShowcaseAlt, setNewShowcaseAlt] = useState("");
  const [newShowcaseImage, setNewShowcaseImage] = useState("");
  const showcaseFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/homepage-trains");
      const data = await res.json();
      if (Array.isArray(data?.brandLogos)) {
        setBrandLogos(data.brandLogos);
      }
      if (Array.isArray(data?.showcaseImages)) {
        setShowcaseImages(data.showcaseImages);
      }
    } catch {
      setError("Failed to load homepage train items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle image file selection via FileReader
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (b64: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP, SVG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Add Brand Logo to list
  const handleAddBrandLogo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newBrandName.trim()) {
      setError("Brand name is required.");
      return;
    }
    if (!newBrandImage) {
      setError("Please select or upload an image for the brand logo.");
      return;
    }

    const newItem: BrandLogoItem = {
      id: `brand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newBrandName.trim(),
      src: newBrandImage,
    };

    setBrandLogos((prev) => [...prev, newItem]);
    setNewBrandName("");
    setNewBrandImage("");
    if (brandFileInputRef.current) brandFileInputRef.current.value = "";
    setSuccessMsg(`"${newItem.name}" added to the brand logos train. Click "Save Changes" to publish.`);
  };

  // Remove Brand Logo
  const handleRemoveBrand = (id: string, name: string) => {
    if (brandLogos.length <= 1) {
      setError("At least 1 brand logo is required for the train.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${name}" from the logos train?`)) {
      return;
    }
    setBrandLogos((prev) => prev.filter((b) => b.id !== id));
    setSuccessMsg(`Removed "${name}". Click "Save Changes" to apply.`);
  };

  // Move Brand Logo Up/Down
  const handleMoveBrand = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= brandLogos.length) return;
    const copy = [...brandLogos];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setBrandLogos(copy);
  };

  // Add Showcase Image to list
  const handleAddShowcaseImage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newShowcaseAlt.trim()) {
      setError("Image title or product description is required.");
      return;
    }
    if (!newShowcaseImage) {
      setError("Please select or upload a showcase product photo.");
      return;
    }

    const newItem: ShowcaseImageItem = {
      id: `showcase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      alt: newShowcaseAlt.trim(),
      src: newShowcaseImage,
    };

    setShowcaseImages((prev) => [...prev, newItem]);
    setNewShowcaseAlt("");
    setNewShowcaseImage("");
    if (showcaseFileInputRef.current) showcaseFileInputRef.current.value = "";
    setSuccessMsg(`"${newItem.alt}" added to the showcase images train. Click "Save Changes" to publish.`);
  };

  // Remove Showcase Image
  const handleRemoveShowcase = (id: string, alt: string) => {
    if (showcaseImages.length <= 1) {
      setError("At least 1 showcase image is required for the train.");
      return;
    }
    if (!confirm(`Are you sure you want to remove "${alt}" from the showcase train?`)) {
      return;
    }
    setShowcaseImages((prev) => prev.filter((s) => s.id !== id));
    setSuccessMsg(`Removed "${alt}". Click "Save Changes" to apply.`);
  };

  // Move Showcase Image Up/Down
  const handleMoveShowcase = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= showcaseImages.length) return;
    const copy = [...showcaseImages];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setShowcaseImages(copy);
  };

  // Save all changes to the server
  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/homepage-trains", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandLogos,
          showcaseImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save homepage train updates.");
      } else {
        setSuccessMsg("Homepage trains updated and published successfully!");
        if (Array.isArray(data.brandLogos)) setBrandLogos(data.brandLogos);
        if (Array.isArray(data.showcaseImages)) setShowcaseImages(data.showcaseImages);
        window.dispatchEvent(new Event("furious-trains-change"));
        if (onSaved) onSaved();
      }
    } catch {
      setError("Network error while saving homepage trains.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111114",
          border: "1.5px solid rgba(255, 30, 39, 0.7)",
          boxShadow: "0 0 45px rgba(255, 30, 39, 0.35)",
        }}
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            background:
              "linear-gradient(90deg, #181114 0%, #111114 50%, #181114 100%)",
            borderBottom: "1px solid rgba(255, 30, 39, 0.4)",
          }}
          className="p-5 flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-6 rounded-full bg-[#FF1E27] shadow-[0_0_12px_#FF1E27]" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-glossy-gold">
                Manage Homepage Moving Trains
              </h2>
              <p className="text-xs text-gray-400">
                Add, reorder, or remove Brand Logos & Product Showcase images in real-time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#141417] border border-[#00D4FF]/45 text-glossy-gold hover:border-[#FF1E27] flex items-center justify-center text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex border-b border-[#00D4FF]/30 bg-[#0B0B0C] shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("logos");
              setError(null);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "logos"
                ? "border-[#FF1E27] text-white bg-[#1A1215]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>🏷️</span>
            <span>1. Brand Logos Train ({brandLogos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("showcase");
              setError(null);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "showcase"
                ? "border-[#FF1E27] text-white bg-[#1A1215]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>🖼️</span>
            <span>2. Products Showcase Images ({showcaseImages.length})</span>
          </button>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg border border-red-500/70 bg-red-950/40 text-xs text-red-200">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg border border-[#FF1E27]/70 bg-[#FF1E27]/15 text-xs text-glossy-gold">
            {successMsg}
          </div>
        )}

        {/* CONTENT BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm uppercase tracking-wider text-glossy-gold">
              Loading train items...
            </div>
          ) : activeTab === "logos" ? (
            /* TAB 1: BRAND LOGOS */
            <div className="space-y-6">
              {/* Form to Add New Brand Logo */}
              <form
                onSubmit={handleAddBrandLogo}
                className="p-4 rounded-xl bg-[#0B0B0C] border border-[#00D4FF]/35 space-y-4 shadow-inner"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                    + Add New Brand Logo to Moving Train
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                      Brand Name (e.g. Brembo, Akrapovic, Ohlins)
                    </label>
                    <input
                      type="text"
                      required
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Enter brand name"
                      className="auth-input w-full px-3 py-2 bg-[#141417] border border-[#00D4FF]/45 rounded-lg text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                      Upload Logo Image (PNG, JPG, SVG)
                    </label>
                    <input
                      ref={brandFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNewBrandImage)}
                      className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1A1215] file:text-glossy-gold file:border file:border-[#FF1E27]/60 cursor-pointer"
                    />
                  </div>
                </div>

                {newBrandImage && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-gray-400">Preview:</span>
                    <div className="w-24 h-16 rounded-lg bg-white p-2 border border-[#FF1E27]/60 flex items-center justify-center overflow-hidden">
                      <img
                        src={newBrandImage}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#141417] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-xs font-bold uppercase tracking-wider text-glossy-gold cursor-pointer transition-all hover:scale-105"
                  >
                    + Add Logo to Train
                  </button>
                </div>
              </form>

              {/* Current Brand Logos List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                  Active Brand Logos ({brandLogos.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {brandLogos.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#0B0B0C] border border-[#FF1E27]/35 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-gray-500 font-bold w-4">
                          {idx + 1}.
                        </span>
                        <div className="w-16 h-12 rounded-lg bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          <img
                            src={item.src}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-bold text-glossy-gold truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Position #{idx + 1}
                          </p>
                        </div>
                      </div>

                      {/* Controls: Up, Down, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveBrand(idx, "up")}
                          disabled={idx === 0}
                          title="Move Left / Earlier"
                          className="w-7 h-7 rounded bg-[#141417] border border-gray-700 hover:border-gray-500 text-xs text-gray-300 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBrand(idx, "down")}
                          disabled={idx === brandLogos.length - 1}
                          title="Move Right / Later"
                          className="w-7 h-7 rounded bg-[#141417] border border-gray-700 hover:border-gray-500 text-xs text-gray-300 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveBrand(item.id, item.name)}
                          title="Remove brand logo"
                          className="w-7 h-7 rounded bg-red-950/60 border border-red-600/70 hover:border-red-400 text-xs text-red-300 cursor-pointer flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: SHOWCASE IMAGES */
            <div className="space-y-6">
              {/* Form to Add New Showcase Image */}
              <form
                onSubmit={handleAddShowcaseImage}
                className="p-4 rounded-xl bg-[#0B0B0C] border border-[#00D4FF]/35 space-y-4 shadow-inner"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                    + Add New Showcase Poster to &quot;Our Products&quot; Train
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                      Product Label / Title (e.g. Helmet Visor, Side Panel)
                    </label>
                    <input
                      type="text"
                      required
                      value={newShowcaseAlt}
                      onChange={(e) => setNewShowcaseAlt(e.target.value)}
                      placeholder="Enter photo title"
                      className="auth-input w-full px-3 py-2 bg-[#141417] border border-[#00D4FF]/45 rounded-lg text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                      Upload Product Poster Image (Vertical/Portrait recommended)
                    </label>
                    <input
                      ref={showcaseFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNewShowcaseImage)}
                      className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1A1215] file:text-glossy-gold file:border file:border-[#FF1E27]/60 cursor-pointer"
                    />
                  </div>
                </div>

                {newShowcaseImage && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-gray-400">Preview:</span>
                    <div className="w-20 h-28 rounded-lg border border-[#FF1E27]/60 overflow-hidden shadow-md">
                      <img
                        src={newShowcaseImage}
                        alt="Showcase preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-[#141417] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-xs font-bold uppercase tracking-wider text-glossy-gold cursor-pointer transition-all hover:scale-105"
                  >
                    + Add Image to Showcase
                  </button>
                </div>
              </form>

              {/* Current Showcase Images List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-glossy-gold">
                  Active Showcase Posters ({showcaseImages.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {showcaseImages.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#0B0B0C] border border-[#FF1E27]/35 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-gray-500 font-bold w-4">
                          {idx + 1}.
                        </span>
                        <div className="w-14 h-20 rounded-lg overflow-hidden border border-[#00D4FF]/30 shrink-0 shadow-inner">
                          <img
                            src={item.src}
                            alt={item.alt}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-bold text-glossy-gold truncate">
                            {item.alt}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Poster #{idx + 1}
                          </p>
                        </div>
                      </div>

                      {/* Controls: Up, Down, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveShowcase(idx, "up")}
                          disabled={idx === 0}
                          title="Move Left / Earlier"
                          className="w-7 h-7 rounded bg-[#141417] border border-gray-700 hover:border-gray-500 text-xs text-gray-300 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveShowcase(idx, "down")}
                          disabled={idx === showcaseImages.length - 1}
                          title="Move Right / Later"
                          className="w-7 h-7 rounded bg-[#141417] border border-gray-700 hover:border-gray-500 text-xs text-gray-300 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveShowcase(item.id, item.alt)}
                          title="Remove poster"
                          className="w-7 h-7 rounded bg-red-950/60 border border-red-600/70 hover:border-red-400 text-xs text-red-300 cursor-pointer flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            background:
              "linear-gradient(90deg, #181114 0%, #111114 50%, #181114 100%)",
            borderTop: "1px solid rgba(255, 30, 39, 0.4)",
          }}
          className="p-4 flex items-center justify-between gap-4 shrink-0"
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#141417] border border-gray-700 hover:border-gray-500 text-xs uppercase tracking-wider text-gray-300 cursor-pointer"
          >
            Cancel / Close
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-lg bg-[#141720] border border-[#00D4FF]/80 hover:border-[#7DF9FF] text-xs sm:text-sm font-bold uppercase tracking-widest text-glossy-gold shadow-[0_0_15px_rgba(0,212,255,0.35)] cursor-pointer hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Publishing Updates..." : "Save & Publish Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
