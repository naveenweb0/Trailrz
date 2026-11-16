"use client";

import React, { useState, useEffect } from "react";
import { Search, CreditCard, RefreshCw, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error("Failed to load payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
          Payment Transactions
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Gateway ledger containing all Razorpay transaction IDs, orders, and payment statuses.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Order ID, Payment ID, Ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-trailrz-red"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs font-semibold text-white focus:outline-none w-full md:w-auto"
        >
          <option value="All">All Payment Statuses</option>
          <option value="SUCCESSFUL">Successful</option>
          <option value="PENDING">Pending</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Transaction / Order ID</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Method / Provider</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-white">
                        {p.razorpayPaymentId || "—"}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {p.razorpayOrderId}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-trailrz-red">
                      {p.booking?.bookingReference}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{p.booking?.customerName}</div>
                      <div className="text-[10px] text-white/40">{p.booking?.customerEmail}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-white font-semibold">
                        {p.paymentMethod || "Razorpay"}
                      </span>
                      <span className="block text-[10px] text-white/40">INR</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                          p.status === "SUCCESSFUL"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : p.status === "REFUNDED"
                            ? "bg-purple-500/20 text-purple-400"
                            : p.status === "FAILED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-white/50 text-[11px] font-mono">
                      {formatDateTime(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
