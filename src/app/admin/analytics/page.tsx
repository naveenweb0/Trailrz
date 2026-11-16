"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  TrendingUp,
  DollarSign,
  Ticket,
  MapPin,
  RefreshCw,
  PieChart,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDownloadCsv = () => {
    window.location.href = "/api/admin/analytics?format=csv";
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 rounded-full border-4 border-trailrz-red border-t-transparent animate-spin mx-auto mb-2" />
        <p className="text-xs text-white/50">Compiling financial performance & occupancy...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const cityStats = data?.cityStats || [];
  const eventReports = data?.eventReports || [];

  return (
    <div className="space-y-8">
      {/* Page Header & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
            Business Analytics & Revenue Audit
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Complete audit distinguishing gross collections, refunds, net profit, and city occupancy.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors inline-flex items-center space-x-1.5 self-start sm:self-auto border border-white/10"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Financial Health Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Gross Collections
          </span>
          <div className="text-2xl font-extrabold text-white">
            {formatCurrency(summary.grossCollections || 0)}
          </div>
          <span className="text-[11px] text-white/40 block">
            {summary.totalTransactions || 0} total gateway transactions
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Total Refunds Processed
          </span>
          <div className="text-2xl font-extrabold text-amber-400">
            {formatCurrency(summary.totalRefunds || 0)}
          </div>
          <span className="text-[11px] text-white/40 block">
            {summary.refundTransactions || 0} refunded orders
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Net Collected Amount
          </span>
          <div className="text-2xl font-extrabold text-emerald-400">
            {formatCurrency(summary.netCollections || 0)}
          </div>
          <span className="text-[11px] text-white/40 block">
            Gross minus processed refunds
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
            Total Passes Issued
          </span>
          <div className="text-2xl font-extrabold text-trailrz-red">
            {summary.totalTicketsSold || 0}
          </div>
          <span className="text-[11px] text-white/40 block">
            Valid tickets generated
          </span>
        </div>
      </div>

      {/* City Breakdown & Occupancy Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* City Stats */}
        <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white">
            Revenue by City
          </h3>
          <div className="space-y-3">
            {cityStats.map((c: any) => (
              <div key={c.city} className="p-3.5 rounded-2xl bg-neutral-800/60 border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-trailrz-red" />
                    <span>{c.city}</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {formatCurrency(c.grossRevenue)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-white/40">
                  <span>{c.ticketsSold} passes</span>
                  <span>{c.percentage}% of gross</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Event Performance (2 cols) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white">
            Event Occupancy & Collections
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/80">
              <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
                <tr>
                  <th className="py-3 px-3">Title</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Tickets Sold</th>
                  <th className="py-3 px-3">Occupancy</th>
                  <th className="py-3 px-3 text-right">Collections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {eventReports.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-bold text-white max-w-[200px] truncate">
                      {ev.title}
                    </td>
                    <td className="py-3 px-3 text-white/60">
                      {new Date(ev.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {ev.ticketsSold} / {ev.capacity}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-800 text-[10px] font-bold">
                        {ev.occupancyRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white font-mono">
                      {formatCurrency(ev.grossRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
