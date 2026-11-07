import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthenticatedUser {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  role: "customer" | "admin";
  password?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthenticatedUser | null;
  onAuthSuccess: (user: AuthenticatedUser | null) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  user,
  onAuthSuccess,
}: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (password.length !== 6) {
      setError("Password must be exactly 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, password, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
      } else {
        setSuccessMsg("Account created successfully!");
        onAuthSuccess({ ...data.user, password });
        setName("");
        setPhone("");
        setAddress("");
        setPassword("");
        setEmail("");
        onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (password.length !== 6) {
      setError("Password must be exactly 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
      } else {
        setSuccessMsg("Signed in successfully!");
        onAuthSuccess({ ...data.user, password });
        setPassword("");
        onClose();
        if (data.user?.role === "admin") {
          router.push("/admin");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    resetMessages();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      onAuthSuccess(null);
      setSuccessMsg("Signed out.");
    } finally {
      setLoading(false);
    }
  };

  const renderEyeIcon = () =>
    showPassword ? (
      /* Eye Off (Hide Password) SVG */
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
      /* Eye On (Show Password) SVG */
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
        }}
        className="relative w-full max-w-md p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Row: Close Button positioned cleanly ABOVE the toggle box so it never overlaps */}
        <div className="flex items-center justify-end mb-3">
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

        {/* Toggle Box: Both Registration and Sign In buttons are always visible */}
        <div className="auth-toggle-container">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              resetMessages();
            }}
            className={`auth-toggle-btn ${
              mode === "register" ? "active" : "inactive"
            }`}
          >
            <span className="text-glossy-gold">Registration</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              resetMessages();
            }}
            className={`auth-toggle-btn ${
              mode === "signin" ? "active" : "inactive"
            }`}
          >
            <span className="text-glossy-gold">Sign In</span>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 border border-red-500/50 bg-red-950/30 text-xs text-red-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 border border-[#00D4FF]/55 bg-[#00D4FF]/10 text-xs text-glossy-gold">
            {successMsg}
          </div>
        )}

        {/* Active Account Details if Logged In */}
        {user && (
          <div className="mb-5 p-3.5 border border-[#00D4FF]/40 bg-[#0B0B0C] flex items-center justify-between">
            <div className="text-xs">
              <p className="text-glossy-gold font-semibold">
                {user.name}{" "}
                {user.role === "admin" && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] border border-[#00D4FF]/60 uppercase">
                    Admin
                  </span>
                )}
              </p>
              <p style={{ color: "rgba(0, 212, 255, 0.8)" }}>
                {user.phone || user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="px-3 py-1.5 text-xs border border-[#00D4FF]/50 hover:border-[#7DF9FF] text-glossy-gold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Registration Form */}
        {mode === "register" ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
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
                placeholder="Enter your phone number"
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
                placeholder="Enter your full address"
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
                  placeholder="Exactly 6 characters"
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

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-[#141720] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-semibold uppercase tracking-widest text-glossy-gold shadow-[0_0_12px_rgba(0,212,255,0.28),inset_0_1px_2px_rgba(125,249,255,0.25)] transition-all cursor-pointer"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        ) : (
          /* Sign In Form — Phone Number Box + Password Box with Eye Toggle */
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="auth-input w-full px-3.5 py-2.5 bg-[#0B0B0C] border border-[#00D4FF]/45 focus:border-[#7DF9FF] focus:outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-glossy-gold mb-1.5">
                Password (6 characters)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 6))}
                  placeholder="Enter 6-character password"
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
              disabled={loading}
              className="w-full py-3 mt-2 bg-[#141720] border border-[#00D4FF]/70 hover:border-[#7DF9FF] text-sm font-semibold uppercase tracking-widest text-glossy-gold shadow-[0_0_12px_rgba(0,212,255,0.28),inset_0_1px_2px_rgba(125,249,255,0.25)] transition-all cursor-pointer"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
