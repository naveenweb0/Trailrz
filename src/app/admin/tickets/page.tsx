"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  QrCode,
  Download,
  Eye,
  X,
  Ticket as TicketIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
            Ticket Passes & Validation Registry
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Browse all individual issued gate passes, verify QR codes, and check admission statuses.
          </p>
        </div>

        <a
          href="/admin/scanner"
          className="px-4 py-2.5 rounded-xl bg-trailrz-red hover:bg-trailrz-red-hover text-white text-xs font-bold transition-colors inline-flex items-center space-x-1.5 shadow-lg shadow-trailrz-red/20 self-start sm:self-auto"
        >
          <QrCode className="w-4 h-4" />
          <span>Launch Gate Scanner</span>
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Ticket ID, Attendee, Reference..."
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
          <option value="All">All Ticket Statuses</option>
          <option value="VALID">Valid (Pending Check-in)</option>
          <option value="USED">Used (Admitted)</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-4">Attendee</th>
                <th className="py-3.5 px-4">Experience</th>
                <th className="py-3.5 px-4">Pass Tier</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Check-in Time</th>
                <th className="py-3.5 px-4 text-right">View QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">
                    Loading passes...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">
                    No tickets found matching filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-trailrz-red">
                      {t.ticketNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{t.attendeeName}</div>
                      {t.attendeeEmail && (
                        <div className="text-[10px] text-white/40">{t.attendeeEmail}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white max-w-[180px] truncate">
                        {t.booking?.event?.title}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {t.booking?.event?.city}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-white font-medium">
                      {t.ticketType?.name}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white/60">
                      {t.booking?.bookingReference}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          t.status === "VALID"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : t.status === "USED"
                            ? "bg-neutral-700 text-neutral-300"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-white/50 text-[11px] font-mono">
                      {t.checkedInAt ? formatDateTime(t.checkedInAt) : "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTicket(t)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="View QR Ticket Pass"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Pass View Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-trailrz-black rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute right-4 top-4 p-1 text-trailrz-grey hover:text-trailrz-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-trailrz-red">
                Verified Admission Pass
              </span>
              <h3 className="font-mono text-base font-extrabold text-trailrz-black">
                {selectedTicket.ticketNumber}
              </h3>
            </div>

            <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border-2 border-trailrz-black flex items-center justify-center">
              {selectedTicket.qrPayload ? (
                <img
                  src={selectedTicket.qrPayload}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-trailrz-grey">QR Code</div>
              )}
            </div>

            <div className="space-y-1 text-center text-xs">
              <div className="font-bold text-sm text-trailrz-black">
                {selectedTicket.attendeeName}
              </div>
              <div className="text-trailrz-grey">{selectedTicket.ticketType?.name}</div>
              <div className="text-trailrz-grey font-semibold">
                {selectedTicket.booking?.event?.title}
              </div>
            </div>

            <div className="pt-2 border-t border-trailrz-grey-border flex justify-between text-xs font-semibold">
              <span className="text-trailrz-grey">Status</span>
              <span className={selectedTicket.status === "VALID" ? "text-emerald-600" : "text-neutral-600"}>
                {selectedTicket.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
