"use client";

import React, { useEffect, useState } from "react";

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  password: string;
  createdAt: string;
}

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomersModal({
  isOpen,
  onClose,
}: CustomersModalProps) {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerRecord | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (res.ok && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        setError(data.error || "Failed to load customers.");
      }
    } catch {
      setError("Network error while loading customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(null);
      setError(null);
      setSuccessMsg(null);
      fetchCustomers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectCustomer = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setName(customer.name || "");
    setPhone(customer.phone || "");
    setAddress(customer.address || "");
    setEmail(customer.email || "");
    setPassword(customer.password || "");
    setShowPassword(false);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setError(null);
    setSuccessMsg(null);

    if (password.length !== 6) {
      setError("Password must be exactly 6 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name,
          phone,
          address,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update customer details.");
      } else {
        setSuccessMsg("Customer account details updated successfully!");
        setSelectedCustomer(data.customer);
        setCustomers((prev) =>
          prev.map((c) => (c.id === data.customer.id ? data.customer : c))
        );
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderEyeIcon = () =>
    showPassword ? (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    ) : (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111114",
          border: "1.5px solid rgba(0, 212, 255, 0.65)",
          boxShadow: "0 0 40px rgba(0, 212, 255, 0.25)",
          maxHeight: "85vh",
        }}
        className="relative w-full max-w-lg p-6 sm:p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Row: Title + Close Button */}
        <div
          style={{ borderBottom: "1px solid rgba(0, 212, 255, 0.35)" }}
          className="flex items-center justify-between pb-3 mb-4 shrink-0"
        >
          <div className="flex items-center gap-3">
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setError(null);
                  setSuccessMsg(null);
                }}
                style={{ border: "1px solid rgba(0, 212, 255, 0.45)" }}
                className="px-2.5 py-1 text-xs uppercase tracking-wider bg-[#0B0B0C] hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
              >
                ← Back
              </button>
            )}
            <h3 className="text-base sm:text-lg font-bold uppercase tracking-wider text-glossy-gold">
              {selectedCustomer ? "Customer Details" : "Customers"}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{ border: "1px solid rgba(0, 212, 255, 0.55)" }}
            className="w-8 h-8 flex items-center justify-center bg-[#0B0B0C] hover:border-[#7DF9FF] text-glossy-gold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 border border-red-500/50 bg-red-950/30 text-xs text-red-300 shrink-0">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 border border-[#00D4FF]/55 bg-[#00D4FF]/10 text-xs text-glossy-gold shrink-0">
            {successMsg}
          </div>
        )}

        {/* View 1: List of all Customers who created an account */}
        {!selectedCustomer ? (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="py-8 text-center text-sm text-glossy-gold">
                Loading customers...
              </p>
            ) : customers.length === 0 ? (
              <p className="py-8 text-center text-sm text-glossy-gold">
                No customer accounts have been created yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {customers.map((customer, index) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      style={{
                        border: "1px solid rgba(0, 212, 255, 0.4)",
                        backgroundColor: "#0B0B0C",
                      }}
                      className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#161922] transition-colors text-left cursor-pointer"
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-glossy-gold">
                          {index + 1}. {customer.name}
                        </p>
                        <p
                          style={{ color: "rgba(125, 249, 255, 0.75)" }}
                          className="text-xs mt-0.5"
                        >
                          {customer.phone} • {customer.email}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-wider text-glossy-gold">
                        View / Edit ›
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* View 2: Selected Customer Account Details (Editable by Admin including Password) */
          <form
            onSubmit={handleSaveCustomer}
            className="space-y-4 overflow-y-auto pr-1"
          >
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Address
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Password (exactly 6 characters)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 6))}
                  style={{ paddingRight: "2.75rem" }}
                  className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{ right: "0.75rem" }}
                  className="absolute flex items-center justify-center p-1 cursor-pointer opacity-80 hover:opacity-100"
                >
                  {renderEyeIcon()}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 mt-2 bg-[#141720] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-semibold uppercase tracking-widest text-glossy-gold shadow-[0_0_12px_rgba(0,212,255,0.28),inset_0_1px_2px_rgba(125,249,255,0.25)] transition-all cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

