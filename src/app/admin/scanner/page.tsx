"use client";

import React, { useState } from "react";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Keyboard,
  ShieldCheck,
  RotateCcw,
  Volume2,
} from "lucide-react";

export default function AdminScannerPage() {
  const [ticketInput, setTicketInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play audio feedback using Web Audio API
  const playSound = (type: "success" | "error") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        osc.frequency.setValueAtTime(164.81, audioCtx.currentTime + 0.15); // E3
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // AudioContext may be blocked before gesture
    }
  };

  const handleValidate = async (identifier: string) => {
    if (!identifier.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketIdentifier: identifier.trim(),
          location: "Main Gate Turnstile",
          device: "Admin Scanner Portal",
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        playSound("success");
      } else {
        playSound("error");
      }

      // Add to session scan history
      setRecentScans((prev) => [
        {
          timestamp: new Date(),
          ticketNumber: data.ticket?.ticketNumber || identifier,
          attendeeName: data.ticket?.attendeeName || "Unknown",
          success: data.success,
          code: data.code,
          message: data.message,
        },
        ...prev.slice(0, 19),
      ]);

      setTicketInput("");
    } catch (err: any) {
      setResult({
        success: false,
        code: "NETWORK_ERROR",
        message: err.message || "Failed to communicate with gate validation server.",
      });
      playSound("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate(ticketInput);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white flex items-center space-x-2">
            <QrCode className="w-7 h-7 text-trailrz-red" />
            <span>Gate Scanner & Admission Control</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Scan digital QR passes or enter ticket IDs for atomic verification and double-entry prevention.
          </p>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl border text-xs font-bold transition-colors flex items-center space-x-1.5 ${
            soundEnabled
              ? "bg-white/10 border-white/20 text-white"
              : "bg-neutral-800 border-white/5 text-white/40"
          }`}
          title="Toggle Chime Sound"
        >
          <Volume2 className="w-4 h-4" />
          <span className="hidden sm:inline">{soundEnabled ? "Audio On" : "Audio Muted"}</span>
        </button>
      </div>

      {/* Prominent Verification Feedback Result */}
      {result && (
        <div
          className={`p-6 rounded-3xl border-2 transition-all shadow-2xl animate-in zoom-in-95 duration-150 ${
            result.success
              ? "bg-emerald-950/90 border-emerald-500 text-white"
              : result.code === "ALREADY_CHECKED_IN"
              ? "bg-amber-950/90 border-amber-500 text-white"
              : "bg-red-950/90 border-red-500 text-white"
          }`}
        >
          <div className="flex items-start space-x-4">
            {result.success ? (
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : result.code === "ALREADY_CHECKED_IN" ? (
              <div className="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                <XCircle className="w-7 h-7" />
              </div>
            )}

            <div className="space-y-1 flex-grow">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-widest opacity-80">
                  {result.success
                    ? "ACCESS GRANTED"
                    : result.code === "ALREADY_CHECKED_IN"
                    ? "DUPLICATE ENTRY DETECTED"
                    : "ACCESS DENIED"}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold leading-tight">
                {result.message}
              </h3>

              {result.ticket && (
                <div className="pt-3 mt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Attendee</span>
                    <strong className="text-sm">{result.ticket.attendeeName}</strong>
                  </div>

                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Ticket ID</span>
                    <span className="font-mono font-bold text-sm">{result.ticket.ticketNumber}</span>
                  </div>

                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Tier</span>
                    <span>{result.ticket.ticketTypeName}</span>
                  </div>

                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Experience</span>
                    <span className="truncate block">{result.ticket.eventTitle}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual & Barcode Scanner Input */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-white/80">
            Scan QR Code or Enter Ticket Number
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              required
              placeholder="Scan QR, Ticket ID (TRZ-2026-...) or Booking Ref (TRZ-BK-...)"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              className="flex-grow px-4 py-3.5 rounded-2xl bg-neutral-800 border border-white/10 text-sm text-white font-mono placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-trailrz-red/50 focus:border-trailrz-red"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 rounded-2xl bg-trailrz-red hover:bg-trailrz-red-hover text-white font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-lg shadow-trailrz-red/20 disabled:opacity-50"
            >
              <span>{loading ? "Checking..." : "Verify Pass"}</span>
            </button>
          </div>

          <p className="text-[11px] text-white/40">
            Supports hardware laser scanners, camera QR scanning payloads, or direct alphanumeric ticket IDs.
          </p>
        </form>
      </div>

      {/* Recent Scans Session Log */}
      {recentScans.length > 0 && (
        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-3">
          <h3 className="font-editorial text-base font-bold text-white flex items-center justify-between">
            <span>Session Scan History ({recentScans.length})</span>
            <button
              onClick={() => setRecentScans([])}
              className="text-[11px] text-white/40 hover:text-white font-normal"
            >
              Clear
            </button>
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentScans.map((scan, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-neutral-800/80 border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  {scan.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-white font-mono">
                      {scan.ticketNumber}
                    </div>
                    <div className="text-[11px] text-white/50">{scan.attendeeName}</div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-white/40 font-mono">
                  {scan.timestamp.toLocaleTimeString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
