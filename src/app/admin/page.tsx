"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Ticket,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Users,
  QrCode,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatEventDate } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async (selectedRange = range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/overview?range=${selectedRange}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(range);
  }, [range]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 rounded-full border-4 border-trailrz-red border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-xs text-white/50">Loading real-time platform statistics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recent = data?.recentActivity || {};
  const categoryBreakdown = data?.categoryBreakdown || [];
  const eventPerformance = data?.eventPerformance || [];

  return (
    <div className="space-y-8">
      {/* Page Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
            Operations Overview
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Real-time verified booking activity, gross collections, and event capacities.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-xs font-semibold text-white focus:outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={() => fetchOverview(range)}
            className="p-2 rounded-xl bg-neutral-900 border border-white/10 text-white/80 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Total Revenue */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="uppercase font-bold tracking-wider">Confirmed Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatCurrency(kpis.totalRevenue || 0)}
          </div>
          <div className="text-[11px] text-white/40">
            {kpis.confirmedBookings || 0} confirmed transactions
          </div>
        </div>

        {/* KPI 2: Tickets Sold */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="uppercase font-bold tracking-wider">Tickets Issued</span>
            <span className="p-1.5 rounded-lg bg-trailrz-red/10 text-trailrz-red">
              <Ticket className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {kpis.ticketsSold || 0}
          </div>
          <div className="text-[11px] text-white/40">
            Across active curated events
          </div>
        </div>

        {/* KPI 3: Active Events */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="uppercase font-bold tracking-wider">Live Events</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {kpis.activeEvents || 0}
          </div>
          <div className="text-[11px] text-white/40">
            {kpis.upcomingEvents || 0} upcoming on calendar
          </div>
        </div>

        {/* KPI 4: Pending / Cancelled Bookings */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="uppercase font-bold tracking-wider">Pending / Cancelled</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {kpis.pendingPayments || 0} <span className="text-xs text-white/40 font-normal">/ {kpis.cancelledBookings || 0}</span>
          </div>
          <div className="text-[11px] text-white/40">
            {kpis.totalBookings || 0} total booking attempts
          </div>
        </div>
      </div>

      {/* Event Occupancy & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Event-wise Performance (2 cols) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-lg font-bold text-white">
              Event Occupancy & Sales
            </h3>
            <a
              href="/admin/events"
              className="text-xs text-trailrz-red hover:underline font-bold flex items-center space-x-1"
            >
              <span>Manage Events</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="text-[10px] uppercase font-bold text-white/40 border-b border-white/10">
                <tr>
                  <th className="pb-3">Event Title</th>
                  <th className="pb-3">City</th>
                  <th className="pb-3">Sold / Cap</th>
                  <th className="pb-3">Occupancy</th>
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {eventPerformance.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 font-bold text-white max-w-[180px] truncate">
                      {ev.title}
                    </td>
                    <td className="py-3 text-white/60">{ev.city}</td>
                    <td className="py-3 font-mono">
                      {ev.ticketsSold} / {ev.capacity}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-trailrz-red rounded-full"
                            style={{ width: `${ev.occupancyRate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-white/60">
                          {ev.occupancyRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-bold text-white">
                      {formatCurrency(ev.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Category Distribution */}
        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white">
            Category Breakdown
          </h3>
          <p className="text-xs text-white/50">Ticket sales by genre</p>

          <div className="space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-white/40 py-6 text-center">No bookings recorded yet.</p>
            ) : (
              categoryBreakdown.map((c: any) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">{c.category}</span>
                    <span className="text-white/60 font-mono">
                      {c.tickets} tickets • {formatCurrency(c.revenue)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-trailrz-red to-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (c.tickets / Math.max(1, kpis.ticketsSold || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-lg font-bold text-white">
              Recent Bookings
            </h3>
            <a
              href="/admin/bookings"
              className="text-xs text-trailrz-red hover:underline font-bold"
            >
              View All
            </a>
          </div>

          <div className="space-y-2.5">
            {recent.bookings?.length === 0 ? (
              <p className="text-xs text-white/40 py-4 text-center">No recent bookings</p>
            ) : (
              recent.bookings?.map((b: any) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-neutral-800/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center space-x-1.5">
                      <span>{b.customerName}</span>
                      <span className="text-[10px] font-mono text-white/40">
                        ({b.bookingReference})
                      </span>
                    </div>
                    <div className="text-[11px] text-white/60 truncate max-w-[200px]">
                      {b.event?.title}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-white font-mono">
                      {formatCurrency(b.totalAmount)}
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        b.bookingStatus === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {b.bookingStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Gate Check-Ins */}
        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-lg font-bold text-white">
              Recent Gate Check-Ins
            </h3>
            <a
              href="/admin/scanner"
              className="text-xs text-trailrz-red hover:underline font-bold flex items-center space-x-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Launch Scanner</span>
            </a>
          </div>

          <div className="space-y-2.5">
            {recent.checkIns?.length === 0 ? (
              <p className="text-xs text-white/40 py-4 text-center">No check-ins recorded yet.</p>
            ) : (
              recent.checkIns?.map((ci: any) => (
                <div
                  key={ci.id}
                  className="p-3 rounded-2xl bg-neutral-800/60 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-white">
                        {ci.ticket?.attendeeName}
                      </div>
                      <div className="text-[11px] text-white/40">
                        {ci.ticket?.ticketNumber} • {ci.ticket?.ticketType?.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-white/50 font-mono">
                    {new Date(ci.scannedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
