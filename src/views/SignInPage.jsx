"use client";

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { api, errMsg } from "@/lib/api";

const Shell = ({ children }) => (
  <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-parchment">
    <div className="hidden lg:flex flex-col justify-between bg-ink-deep text-parchment p-12 dark-zone">
      <div className="self-start">
        <Logo className="h-9" plate />
      </div>
      <div>
        <p className="eyebrow !text-[#bdb3a3]">Staff access</p>
        <h1 className="font-display text-5xl mt-4 leading-[1.05] max-w-md">The house lights are yours.</h1>
        <p className="mt-5 text-[#bdb3a3] max-w-sm">
          Administrators manage experiences and bookings. Gate operators admit guests.
        </p>
      </div>
      <Link to="/" className="text-sm text-[#bdb3a3] link-u w-fit">← Back to TRAILRZ</Link>
    </div>
    <div className="flex flex-col items-center justify-center p-6 sm:p-12 gap-6">
      <div className="lg:hidden"><Logo className="h-8" /></div>
      {children}
    </div>
  </div>
);

export function SignInPage() {
  const [params] = useSearchParams();
  const next = params.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/admin/login", { email, password });
      if (res.data?.token) {
        try {
          localStorage.setItem("trz_staff_token", res.data.token);
        } catch {}
      }
      window.location.href = next;
    } catch (err) {
      setError(errMsg(err, "Invalid email or password. Please try again."));
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="w-full max-w-md bg-surface border hairline p-8 sm:p-10 shadow-sm" data-testid="admin-login-card">
        <div className="mb-8">
          <span className="beam-wedge mb-4 inline-block" aria-hidden />
          <h2 className="font-display text-4xl leading-tight">Admin Sign In</h2>
          <p className="text-mineral text-sm mt-2">
            Enter your staff credentials to access the admin portal.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-invalid/20 text-invalid text-xs rounded" data-testid="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-mineral mb-2" htmlFor="admin-email">
              Staff Email
            </label>
            <div className="relative">
              <input
                id="admin-email"
                data-testid="admin-email-input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trailrz.com"
                className="w-full h-12 px-4 pl-10 bg-transparent border hairline text-sm outline-none focus:border-ink transition-colors"
              />
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-mineral pointer-events-none" aria-hidden />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-mineral mb-2" htmlFor="admin-password">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                data-testid="admin-password-input"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 px-4 pl-10 pr-10 bg-transparent border hairline text-sm outline-none focus:border-ink transition-colors"
              />
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-mineral pointer-events-none" aria-hidden />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-mineral hover:text-ink transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="admin-submit-button"
            className="btn-ink w-full h-12 mt-4 text-sm font-semibold justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              <>
                Sign In <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </Shell>
  );
}

export function SignUpPage() {
  return <SignInPage />;
}
