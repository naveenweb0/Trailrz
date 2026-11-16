"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  MapPin,
  Ticket,
  Copy,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatEventDate } from "@/lib/utils";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionMessage, setActionMessage] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (cityFilter !== "All") params.set("city", cityFilter);
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/events?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to load admin events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [cityFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  // Status toggle (PUBLISHED <-> DRAFT or CANCELLED)
  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Event status updated to ${newStatus}`);
        setTimeout(() => setActionMessage(""), 3000);
        fetchEvents();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  // Duplicate Event
  const handleDuplicate = async (eventId: string) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage("Event duplicated successfully as draft.");
        setTimeout(() => setActionMessage(""), 3000);
        fetchEvents();
      }
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  // Delete / Archive Event
  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete or archive this event?")) return;
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message || "Event processed successfully.");
        setTimeout(() => setActionMessage(""), 3000);
        fetchEvents();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & New Event Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
            Experience Catalog & Curation
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Create, publish, price, and control the lifecycle of all live experiences.
          </p>
        </div>

        <a
          href="/admin/events/new"
          className="px-4 py-2.5 rounded-xl bg-trailrz-red hover:bg-trailrz-red-hover text-white text-xs font-bold transition-colors inline-flex items-center space-x-1.5 shadow-lg shadow-trailrz-red/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Curate New Event</span>
        </a>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title, venue, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-trailrz-red"
          />
        </form>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs font-semibold text-white focus:outline-none"
          >
            <option value="All">All Cities</option>
            <option value="Chandigarh">Chandigarh</option>
            <option value="Mohali">Mohali</option>
            <option value="Panchkula">Panchkula</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs font-semibold text-white focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="SOLD_OUT">Sold Out</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Event Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">City / Venue</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Sold / Capacity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    Loading events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    No experiences found matching filters.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0">
                          <Image
                            src={ev.coverImage}
                            alt={ev.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate max-w-[220px]">
                          <div className="font-bold text-white truncate flex items-center space-x-1.5">
                            <span>{ev.title}</span>
                            {ev.isOriginal && (
                              <Sparkles className="w-3 h-3 text-trailrz-red flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 truncate">
                            /{ev.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-bold text-white/80">
                        {ev.category}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-white font-semibold">{ev.city}</div>
                      <div className="text-white/40 text-[11px] truncate max-w-[140px]">
                        {ev.venueName}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="text-white">{formatEventDate(ev.eventDate)}</div>
                      <div className="text-white/40 text-[11px]">{ev.startTime}</div>
                    </td>

                    <td className="py-4 px-4 font-mono">
                      <span className="font-bold text-white">{ev.totalSold}</span>
                      <span className="text-white/40"> / {ev.totalCapacity}</span>
                      <div className="text-[10px] text-emerald-400">
                        {ev.confirmedBookingsCount} bookings
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ev.status === "PUBLISHED"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : ev.status === "DRAFT"
                            ? "bg-neutral-700 text-neutral-300"
                            : ev.status === "SOLD_OUT"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <a
                          href={`/events/${ev.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          title="Preview Live Page"
                        >
                          <Eye className="w-4 h-4" />
                        </a>

                        <a
                          href={`/admin/events/${ev.id}`}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => handleDuplicate(ev.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          title="Duplicate Event"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {ev.status === "PUBLISHED" ? (
                          <button
                            onClick={() => handleStatusChange(ev.id, "DRAFT")}
                            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-white/60 hover:text-amber-400 transition-colors"
                            title="Unpublish (Set to Draft)"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(ev.id, "PUBLISHED")}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-white/60 hover:text-emerald-400 transition-colors"
                            title="Publish Event"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(ev.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-trailrz-red transition-colors"
                          title="Delete / Archive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
