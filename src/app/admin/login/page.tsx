"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid credentials.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-trailrz-black text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center space-x-2 mb-4">
          <span className="w-10 h-10 rounded-xl bg-trailrz-red text-white flex items-center justify-center font-bold text-xl tracking-wider">
            T
          </span>
          <span className="font-editorial text-3xl font-extrabold tracking-widest text-white">
            TRAILRZ
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white/90">
          Curator Portal & Operations
        </h2>
        <p className="mt-1 text-xs text-white/50">
          Manage live events, bookings, tickets, payments, and gate check-ins.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-neutral-900 border border-white/10 py-8 px-6 shadow-2xl rounded-3xl sm:px-10">
          <form className="space-y-4" onSubmit={handleLogin}>
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@trailrz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-trailrz-red/50 focus:border-trailrz-red"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-trailrz-red/50 focus:border-trailrz-red"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-trailrz-red text-white font-extrabold text-sm hover:bg-trailrz-red-hover transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-trailrz-red/20"
              >
                <span>{loading ? "Authenticating..." : "Sign In to Admin"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center text-xs text-white/40 flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted Server-Side Session Protection</span>
          </div>
        </div>

        {/* Demo Credentials Helper Pill for convenient evaluation */}
        <div className="mt-4 p-3 rounded-xl bg-neutral-900/60 border border-white/5 text-center text-xs text-white/50">
          Default Admin: <code className="text-white font-bold">admin@trailrz.com</code> /{" "}
          <code className="text-white font-bold">trailrzAdmin2026!</code>
        </div>
      </div>
    </div>
  );
}
