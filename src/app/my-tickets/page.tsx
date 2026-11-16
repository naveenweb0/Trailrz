"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import {
  Ticket,
  Search,
  Calendar,
  Clock,
  MapPin,
  Download,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatEventDate } from "@/lib/utils";

function MyTicketsContent() {
  const searchParams = useSearchParams();

  const [bookingRef, setBookingRef] = useState(searchParams.get("ref") || "");
  const [emailOrPhone, setEmailOrPhone] = useState(searchParams.get("email") || "");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchTickets = async (ref: string, contact: string) => {
    if (!ref.trim() && !contact.trim()) {
      setErrorMessage("Please enter your Booking Reference and verified Email or Mobile number.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams();
      if (ref.trim()) params.set("ref", ref.trim());
      if (contact.includes("@")) {
        params.set("email", contact.trim());
      } else if (contact.trim()) {
        params.set("phone", contact.trim());
      }

      const res = await fetch(`/api/my-tickets?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No bookings found matching your information.");
      }

      setUpcomingBookings(data.upcoming || []);
      setPastBookings(data.past || []);
      setHasSearched(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve tickets.");
      setUpcomingBookings([]);
      setPastBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialRef = searchParams.get("ref");
    const initialEmail = searchParams.get("email");
    if (initialRef && initialEmail) {
      setBookingRef(initialRef);
      setEmailOrPhone(initialEmail);
      fetchTickets(initialRef, initialEmail);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets(bookingRef, emailOrPhone);
  };

  const displayedBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="w-12 h-12 rounded-2xl bg-trailrz-black text-white flex items-center justify-center mx-auto mb-3 shadow-md">
          <Ticket className="w-6 h-6 text-trailrz-red" />
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-trailrz-black">
          Access Your Passes
        </h1>
        <p className="text-xs sm:text-sm text-trailrz-grey mt-2">
          No login needed. Retrieve your verified digital tickets and QR gate passes instantly.
        </p>
      </div>

      {/* Lookup Card */}
      <div className="bg-white rounded-3xl border border-trailrz-grey-border p-6 sm:p-8 shadow-xl max-w-2xl mx-auto mb-12">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-trailrz-black mb-1.5">
                Booking Reference *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TRZ-BK-2026-12345"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-trailrz-grey-border text-sm text-trailrz-black font-mono focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-trailrz-black mb-1.5">
                Verified Email or Phone *
              </label>
              <input
                type="text"
                required
                placeholder="Email or 10-digit mobile"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-trailrz-grey-border text-sm text-trailrz-black focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-trailrz-black text-white font-extrabold text-sm hover:bg-trailrz-red transition-colors flex items-center justify-center space-x-2 shadow-md shadow-black/10 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? "Verifying Records..." : "Retrieve My Tickets"}</span>
          </button>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* RESULTS DISPLAY */}
      {hasSearched && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex items-center space-x-3 border-b border-trailrz-grey-border pb-3">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === "upcoming"
                  ? "bg-trailrz-black text-white"
                  : "bg-trailrz-ivory text-trailrz-grey hover:text-trailrz-black"
              }`}
            >
              <span>Upcoming Experiences</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {upcomingBookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("past")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
                activeTab === "past"
                  ? "bg-trailrz-black text-white"
                  : "bg-trailrz-ivory text-trailrz-grey hover:text-trailrz-black"
              }`}
            >
              <span>Past Experiences</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {pastBookings.length}
              </span>
            </button>
          </div>

          {/* Bookings List */}
          {displayedBookings.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-3xl border border-trailrz-grey-border p-8">
              <Ticket className="w-10 h-10 text-trailrz-grey mx-auto mb-2" />
              <h3 className="font-bold text-base text-trailrz-black">
                No {activeTab} bookings found
              </h3>
              <p className="text-xs text-trailrz-grey mt-1">
                Looking for other events? Browse the discover catalog.
              </p>
              <a
                href="/discover"
                className="mt-4 inline-flex items-center space-x-1 text-xs font-bold text-trailrz-red hover:underline"
              >
                <span>Discover Experiences</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              {displayedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl border border-trailrz-grey-border shadow-md overflow-hidden"
                >
                  {/* Booking Header Banner */}
                  <div className="p-5 bg-trailrz-black text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-trailrz-red">
                          Confirmed Booking
                        </span>
                        <span className="text-white/40">•</span>
                        <span className="font-mono text-xs text-white/80 font-bold">
                          {booking.bookingReference}
                        </span>
                      </div>
                      <h3 className="font-editorial text-lg font-bold text-white">
                        {booking.event.title}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white hover:text-trailrz-black text-xs font-bold text-white transition-all flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Print Passes</span>
                      </button>
                    </div>
                  </div>

                  {/* Booking Metadata Bar */}
                  <div className="px-6 py-3 bg-trailrz-ivory border-b border-trailrz-grey-border flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-4 text-trailrz-black">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-trailrz-red" />
                        <span className="font-medium">{formatEventDate(booking.event.eventDate)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-trailrz-red" />
                        <span className="font-medium">{booking.event.startTime}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-trailrz-red" />
                        <span className="font-medium">{booking.event.venueName}, {booking.event.city}</span>
                      </div>
                    </div>

                    <div className="font-mono font-bold text-trailrz-black">
                      Total Paid: {formatCurrency(booking.totalAmount)}
                    </div>
                  </div>

                  {/* Digital Tickets Grid */}
                  <div className="p-6 space-y-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-trailrz-grey">
                      Gate Passes ({booking.tickets.length})
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {booking.tickets.map((t: any) => (
                        <div
                          key={t.id}
                          className="relative p-4 rounded-2xl border-2 border-trailrz-black bg-white shadow-sm flex items-center gap-4 overflow-hidden"
                        >
                          {/* QR Code */}
                          <div className="w-28 h-28 flex-shrink-0 bg-white p-1 rounded-xl border border-trailrz-grey-border flex items-center justify-center">
                            {t.qrPayload ? (
                              <img
                                src={t.qrPayload}
                                alt="Gate Pass QR"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="text-[10px] text-trailrz-grey">QR Pass</div>
                            )}
                          </div>

                          {/* Ticket Information */}
                          <div className="space-y-1 flex-grow">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase text-trailrz-red">
                                {t.ticketNumber}
                              </span>
                              {t.isCheckedIn ? (
                                <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 text-[9px] font-bold uppercase">
                                  Checked In
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">
                                  Valid Pass
                                </span>
                              )}
                            </div>

                            <div className="font-bold text-sm text-trailrz-black truncate">
                              {t.attendeeName}
                            </div>
                            <div className="text-xs text-trailrz-grey">
                              {t.ticketTypeName}
                            </div>
                            <div className="text-[10px] text-trailrz-grey">
                              Show this QR at the venue entrance.
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {booking.event.googleMapsUrl && (
                      <div className="pt-2 flex justify-end">
                        <a
                          href={booking.event.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-trailrz-red hover:underline flex items-center space-x-1"
                        >
                          <span>Get Venue Directions on Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-trailrz-ivory">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
          <MyTicketsContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
