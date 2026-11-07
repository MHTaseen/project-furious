"use client";

import React, { useEffect, useState } from "react";

export interface PolicySection {
  title: string;
  description: string;
}

export interface PoliciesData {
  lastUpdated?: string;
  sections: PolicySection[];
}

const DEFAULT_POLICIES: PoliciesData = {
  lastUpdated: "November 2026",
  sections: [
    {
      title: "100% Authenticity Guarantee",
      description:
        "Every product sold at Furious Moto Shop—from engine oils to brake components—is 100% genuine, factory-sealed, and sourced directly from official manufacturers and authorized distributors.",
    },
    {
      title: "Order & Booking Policy",
      description:
        "Customers can book products directly online. Once booked, our support team confirms stock availability and delivery timeline with you before final fulfillment.",
    },
    {
      title: "Return & Replacement Policy",
      description:
        "Parts damaged in transit or defective from the factory are eligible for replacement within 48 hours of receipt. Items must remain uninstalled and in original packaging.",
    },
    {
      title: "Privacy & Customer Data",
      description:
        "We value your privacy. Customer contact details and delivery addresses are never shared with third parties and are strictly used to fulfill your orders and support inquiries.",
    },
  ],
};

interface PoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onPoliciesUpdated?: (updated: PoliciesData) => void;
}

export default function PoliciesModal({
  isOpen,
  onClose,
  isAdmin,
  onPoliciesUpdated,
}: PoliciesModalProps) {
  const [policies, setPolicies] = useState<PoliciesData>(DEFAULT_POLICIES);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form edit states
  const [editSections, setEditSections] = useState<PolicySection[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccessMsg(null);
    setIsEditing(false);

    fetch("/api/site-info")
      .then((res) => res.json())
      .then((data) => {
        if (data?.policies?.sections?.length) {
          setPolicies(data.policies);
          setEditSections(data.policies.sections);
        } else {
          setPolicies(DEFAULT_POLICIES);
          setEditSections(DEFAULT_POLICIES.sections);
        }
      })
      .catch(() => {
        setPolicies(DEFAULT_POLICIES);
        setEditSections(DEFAULT_POLICIES.sections);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = () => {
    setEditSections(
      policies.sections.map((s) => ({ title: s.title, description: s.description }))
    );
    setIsEditing(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleAddSection = () => {
    setEditSections((prev) => [
      ...prev,
      { title: "New Policy Title", description: "Policy terms and conditions..." },
    ]);
  };

  const handleRemoveSection = (idx: number) => {
    setEditSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSection = (
    idx: number,
    field: "title" | "description",
    val: string
  ) => {
    setEditSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s))
    );
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      policies: {
        lastUpdated: new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        sections: editSections.filter((s) => s.title.trim() || s.description.trim()),
      },
    };

    try {
      const res = await fetch("/api/site-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save policies.");
      } else {
        setPolicies(data.policies || payload.policies);
        if (onPoliciesUpdated) {
          onPoliciesUpdated(data.policies || payload.policies);
        }
        setSuccessMsg("Policies updated successfully!");
        setIsEditing(false);
      }
    } catch {
      setError("Network error while saving policies.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111114",
          border: "1.5px solid rgba(255, 30, 39, 0.65)",
          boxShadow:
            "0 0 40px rgba(255, 30, 39, 0.25), 0 20px 50px rgba(0,0,0,0.9)",
          maxHeight: "90vh",
        }}
        className="relative w-full max-w-2xl p-6 sm:p-8 rounded-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{ borderBottom: "1px solid rgba(255, 30, 39, 0.35)" }}
          className="flex items-center justify-between pb-3 mb-5 shrink-0"
        >
          <div>
            <span className="text-[10px] uppercase tracking-widest text-glossy-gold opacity-80 block">
              FURIOUS Moto Shop Official
            </span>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-glossy-gold">
              Store Policies
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#1A1215] border border-[#00D4FF]/65 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
              >
                ✎ Edit Policies
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{ border: "1px solid rgba(255, 30, 39, 0.55)" }}
              className="w-8 h-8 flex items-center justify-center bg-[#0B0B0C] hover:border-[#FF6B6B] text-glossy-gold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/60 text-red-200 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-[#FF1E27]/15 border border-[#FF1E27]/60 text-glossy-gold text-xs">
            {successMsg}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isEditing ? (
            <form onSubmit={handleSavePolicies} className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs uppercase text-glossy-gold font-semibold">
                  Manage Policy Sections ({editSections.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-2.5 py-1 text-xs bg-[#141417] border border-[#00D4FF]/45 text-glossy-gold hover:border-[#7DF9FF] cursor-pointer"
                >
                  + Add Section
                </button>
              </div>

              {editSections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#0B0B0C] border border-[#00D4FF]/35 rounded space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      required
                      value={sec.title}
                      onChange={(e) =>
                        handleUpdateSection(idx, "title", e.target.value)
                      }
                      placeholder="Policy Title"
                      className="auth-input flex-1 px-3 py-1.5 bg-[#141417] border border-[#00D4FF]/45 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(idx)}
                      className="text-xs text-red-400 hover:text-red-200 px-2 py-1"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={sec.description}
                    onChange={(e) =>
                      handleUpdateSection(idx, "description", e.target.value)
                    }
                    placeholder="Policy content & details..."
                    className="auth-input w-full px-3 py-2 bg-[#141417] border border-[#00D4FF]/45 text-xs text-white focus:outline-none"
                  />
                </div>
              ))}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs uppercase bg-[#0B0B0C] border border-white/20 text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#1A1215] border border-[#FF1E27]/70 text-glossy-gold hover:border-[#FF6B6B] cursor-pointer"
                >
                  {saving ? "Saving Changes..." : "Save Policies"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] text-gray-400 italic">
                Last reviewed: {policies.lastUpdated || "Current"}
              </p>

              {policies.sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#0B0B0C] border border-[#00D4FF]/30 rounded-lg space-y-1.5"
                >
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-glossy-gold">
                    {idx + 1}. {sec.title}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {sec.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

