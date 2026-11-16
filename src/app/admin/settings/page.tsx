"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Settings State
  const [platformName, setPlatformName] = useState("TRAILRZ");
  const [tagline, setTagline] = useState("Life is happening. Go be part of it.");
  const [convenienceFeePercentage, setConvenienceFeePercentage] = useState(2.5);
  const [convenienceFeeFixedRupees, setConvenienceFeeFixedRupees] = useState(20);
  const [taxPercentage, setTaxPercentage] = useState(18.0);
  const [bookingExpiryMinutes, setBookingExpiryMinutes] = useState(10);

  // Gateway Keys
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");

  // Notification Credentials
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromEmail, setResendFromEmail] = useState("tickets@trailrz.com");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");

  // Support & Legal
  const [supportEmail, setSupportEmail] = useState("care@trailrz.com");
  const [supportPhone, setSupportPhone] = useState("+91 98765 43210");
  const [cancellationPolicyDefault, setCancellationPolicyDefault] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.success && data.settings) {
          const s = data.settings;
          setPlatformName(s.platformName || "TRAILRZ");
          setTagline(s.tagline || "");
          setConvenienceFeePercentage(s.convenienceFeePercentage ?? 2.5);
          setConvenienceFeeFixedRupees(Math.round((s.convenienceFeeFixed || 2000) / 100));
          setTaxPercentage(s.taxPercentage ?? 18.0);
          setBookingExpiryMinutes(s.bookingExpiryMinutes ?? 10);

          setRazorpayKeyId(s.razorpayKeyId || "");
          setRazorpayKeySecret(s.razorpayKeySecret || "");
          setResendApiKey(s.resendApiKey || "");
          setResendFromEmail(s.resendFromEmail || "tickets@trailrz.com");
          setWhatsappToken(s.whatsappToken || "");
          setWhatsappPhoneNumberId(s.whatsappPhoneNumberId || "");

          setSupportEmail(s.supportEmail || "care@trailrz.com");
          setSupportPhone(s.supportPhone || "+91 98765 43210");
          setCancellationPolicyDefault(s.cancellationPolicyDefault || "");
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformName,
          tagline,
          convenienceFeePercentage: parseFloat(convenienceFeePercentage.toString()),
          convenienceFeeFixed: Math.round(Number(convenienceFeeFixedRupees) * 100), // paise
          taxPercentage: parseFloat(taxPercentage.toString()),
          bookingExpiryMinutes: parseInt(bookingExpiryMinutes.toString()),
          razorpayKeyId,
          razorpayKeySecret,
          resendApiKey,
          resendFromEmail,
          whatsappToken,
          whatsappPhoneNumberId,
          supportEmail,
          supportPhone,
          cancellationPolicyDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update platform settings.");
      }

      setSuccessMessage("Settings updated successfully and persisted to database!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 rounded-full border-4 border-trailrz-red border-t-transparent animate-spin mx-auto mb-2" />
        <p className="text-xs text-white/50">Loading platform configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
          Platform Configuration & Credentials
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Adjust transaction fees, Indian GST taxes, Razorpay merchant keys, and transactional notification gateways.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 bg-neutral-900 border border-white/10 p-6 sm:p-8 rounded-3xl shadow-xl">
        {/* Section 1: Brand & Identity */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            1. Platform Brand & Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                required
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Brand Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Transparent Fees & Indian Tax Calculation */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            2. Customer Checkout Fees & Tax
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                Fee Percentage (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={convenienceFeePercentage}
                onChange={(e) => setConvenienceFeePercentage(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                Fixed Fee (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                value={convenienceFeeFixedRupees}
                onChange={(e) => setConvenienceFeeFixedRupees(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                GST on Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                Hold Window (Mins)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={bookingExpiryMinutes}
                onChange={(e) => setBookingExpiryMinutes(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Razorpay Payment Gateway Keys */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2 flex items-center space-x-2">
            <span>3. Razorpay Payment Gateway</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/60 font-normal">
              Server-Verified
            </span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Razorpay Key ID
              </label>
              <input
                type="text"
                placeholder="rzp_test_..."
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Razorpay Key Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••"
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Email & WhatsApp Notifications */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            4. Resend & WhatsApp Integrations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Resend API Key
              </label>
              <input
                type="password"
                placeholder="re_..."
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Resend Sender Email
              </label>
              <input
                type="email"
                placeholder="tickets@trailrz.com"
                value={resendFromEmail}
                onChange={(e) => setResendFromEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                WhatsApp Cloud API Token
              </label>
              <input
                type="password"
                placeholder="EAAG..."
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                placeholder="1048291..."
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Concierge Contact & Policies */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            5. Concierge & Default Policy
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Customer Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Customer Support Phone
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Default Cancellation Policy Text
            </label>
            <textarea
              rows={2}
              value={cancellationPolicyDefault}
              onChange={(e) => setCancellationPolicyDefault(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-trailrz-red hover:bg-trailrz-red-hover text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-lg shadow-trailrz-red/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Updating..." : "Save Platform Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
