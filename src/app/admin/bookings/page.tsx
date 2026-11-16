"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Send,
  XCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Ticket,
  DollarSign,
  User,
  X,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");

  // Selected booking for drawer/modal
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (bookingStatusFilter !== "All") params.set("bookingStatus", bookingStatusFilter);
      if (paymentStatusFilter !== "All") params.set("paymentStatus", paymentStatusFilter);

      const res = await fetch(`/api/admin/bookings?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (err) {
      console.error("Failed to load bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [bookingStatusFilter, paymentStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  // Admin Action: Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking? Reserved inventory will be released.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: "Admin cancelled booking" }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Booking cancelled and inventory released.");
        fetchBookings();
        setSelectedBooking(null);
      } else {
        alert(data.error || "Failed to cancel booking");
      }
    } catch (err) {
      console.error("Cancel error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Action: Refund Booking
  const handleRefundBooking = async (bookingId: string, amount: number) => {
    const reason = prompt("Enter reason for refund:", "Customer requested refund");
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refund", reason, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || "Refund processed successfully.");
        fetchBookings();
        setSelectedBooking(null);
      } else {
        alert(data.error || "Failed to process refund");
      }
    } catch (err) {
      console.error("Refund error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Action: Resend Confirmation
  const handleResendNotifications = async (bookingId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_notifications" }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Notifications queued and dispatched.");
      } else {
        alert(data.error || "Failed to resend confirmation.");
      }
    } catch (err) {
      console.error("Resend error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
          Bookings & Transactions
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Monitor incoming customer orders, manage refunds, and track gate pass statuses.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Reference, Customer, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-trailrz-red"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs font-semibold text-white focus:outline-none"
          >
            <option value="All">All Booking Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs font-semibold text-white focus:outline-none"
          >
            <option value="All">All Payment Statuses</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Experience</th>
                <th className="py-3.5 px-4">Tickets</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">
                    Loading bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {b.bookingReference}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{b.customerName}</div>
                      <div className="text-[11px] text-white/40">{b.customerEmail}</div>
                      <div className="text-[10px] text-white/40">{b.customerPhone}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white max-w-[180px] truncate">
                        {b.event?.title}
                      </div>
                      <div className="text-[11px] text-white/40">{b.event?.city}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {b.totalQuantity} pass(es)
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {formatCurrency(b.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            b.bookingStatus === "CONFIRMED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : b.bookingStatus === "CANCELLED"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                        <div className="text-[10px] text-white/40">
                          Pay: {b.paymentStatus}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-white/50 text-[11px]">
                      {formatDateTime(b.createdAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {b.bookingStatus === "CONFIRMED" && (
                          <button
                            onClick={() => handleResendNotifications(b.id)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                            title="Resend Confirmation"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] uppercase font-bold text-trailrz-red">
                  Booking Details
                </span>
                <h3 className="font-mono text-lg font-bold text-white">
                  {selectedBooking.bookingReference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Event Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-800 space-y-1">
                <span className="text-white/40 font-bold uppercase text-[10px]">Customer</span>
                <div className="font-bold text-white">{selectedBooking.customerName}</div>
                <div className="text-white/60">{selectedBooking.customerEmail}</div>
                <div className="text-white/60">{selectedBooking.customerPhone}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-800 space-y-1">
                <span className="text-white/40 font-bold uppercase text-[10px]">Experience</span>
                <div className="font-bold text-white">{selectedBooking.event?.title}</div>
                <div className="text-white/60">{selectedBooking.event?.venueName}</div>
                <div className="text-white/60">{selectedBooking.event?.city}</div>
              </div>
            </div>

            {/* Tickets Generated */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                Issued Passes ({selectedBooking.tickets?.length || 0})
              </span>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedBooking.tickets?.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-neutral-800/80 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-trailrz-red block">
                        {t.ticketNumber}
                      </span>
                      <span className="text-white/80">{t.attendeeName}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        t.status === "VALID"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-neutral-700 text-white/60"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="p-3.5 rounded-xl bg-neutral-800/60 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedBooking.subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Convenience Fee + GST</span>
                <span>
                  {formatCurrency(selectedBooking.convenienceFee + selectedBooking.taxAmount)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex justify-between font-bold text-white text-sm">
                <span>Total Collected</span>
                <span className="text-trailrz-red">
                  {formatCurrency(selectedBooking.totalAmount)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
              {selectedBooking.bookingStatus === "CONFIRMED" && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRefundBooking(selectedBooking.id, selectedBooking.totalAmount)}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs transition-colors"
                  >
                    Process Refund
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-bold text-xs transition-colors"
                  >
                    Cancel Booking
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedBooking(null)}
                className="ml-auto px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/80 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
