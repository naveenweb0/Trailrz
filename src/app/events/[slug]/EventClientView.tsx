"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Info,
  ExternalLink,
  Users,
  CheckCircle2,
  Ticket,
} from "lucide-react";
import { formatCurrency, formatEventDate } from "@/lib/utils";
import BookingModal from "@/components/public/BookingModal";

interface EventClientViewProps {
  event: any;
}

export default function EventClientView({ event }: EventClientViewProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const minPrice = event.ticketTypes.length > 0 ? event.ticketTypes[0].price : 0;
  const isOriginal = event.isOriginal || event.eventType === "TRAILRZ_ORIGINAL";

  return (
    <>
      {/* EVENT HERO SECTION */}
      <div className="relative bg-trailrz-black text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-7 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {isOriginal && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-trailrz-red text-white text-xs font-extrabold uppercase tracking-widest shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Trailrz Original</span>
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
                  {event.category}
                </span>
                {event.mood && (
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                    {event.mood}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-editorial text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                {event.title}
              </h1>

              {/* Short Description */}
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                {event.shortDescription}
              </p>

              {/* Key Quick Metadata */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-white/90">
                <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-trailrz-red" />
                  <span className="font-semibold">{formatEventDate(event.eventDate)}</span>
                </div>

                <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                  <Clock className="w-4 h-4 text-trailrz-red" />
                  <span className="font-semibold">
                    {event.startTime} {event.endTime ? `– ${event.endTime}` : ""}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
                  <MapPin className="w-4 h-4 text-trailrz-red" />
                  <span className="font-semibold">
                    {event.venueName}, {event.city}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Large Cover Photo */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-neutral-900">
                <Image
                  src={event.coverImage}
                  alt={event.title}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT & STICKY BOOKING PANEL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Comprehensive Event Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-10">
            {/* Highlights Section */}
            {event.highlights && event.highlights.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-trailrz-grey-border shadow-sm space-y-4">
                <h3 className="font-editorial text-xl font-bold text-trailrz-black">
                  Experience Highlights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.highlights.map((h: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs sm:text-sm text-trailrz-black">
                      <CheckCircle2 className="w-4 h-4 text-trailrz-red flex-shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About / Full Description */}
            <div className="space-y-4">
              <h3 className="font-editorial text-2xl font-bold text-trailrz-black">
                About This Experience
              </h3>
              <div className="prose prose-sm text-trailrz-black/80 leading-relaxed whitespace-pre-line text-sm sm:text-base font-normal">
                {event.fullDescription}
              </div>
            </div>

            {/* What to Expect */}
            {event.whatToExpect && (
              <div className="space-y-3 p-6 rounded-3xl bg-trailrz-ivory-dark/40 border border-trailrz-grey-border">
                <h4 className="font-editorial text-lg font-bold text-trailrz-black">
                  What to Expect
                </h4>
                <p className="text-xs sm:text-sm text-trailrz-black/80 leading-relaxed">
                  {event.whatToExpect}
                </p>
              </div>
            )}

            {/* Artist Info */}
            {event.artistInfo && (
              <div className="space-y-3 p-6 rounded-3xl bg-white border border-trailrz-grey-border shadow-sm">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-trailrz-red" />
                  <h4 className="font-editorial text-lg font-bold text-trailrz-black">
                    Featured Artists & Curators
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-trailrz-black/80 leading-relaxed">
                  {event.artistInfo}
                </p>
              </div>
            )}

            {/* Venue & Location Link */}
            <div className="space-y-4 p-6 rounded-3xl bg-white border border-trailrz-grey-border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-editorial text-lg font-bold text-trailrz-black">
                    Venue & Location
                  </h4>
                  <p className="text-xs text-trailrz-grey mt-0.5">{event.venueName}</p>
                </div>
                {event.googleMapsUrl && (
                  <a
                    href={event.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-trailrz-ivory text-trailrz-black text-xs font-bold hover:bg-trailrz-red hover:text-white transition-colors"
                  >
                    <span>Open in Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="text-xs sm:text-sm text-trailrz-black/80">{event.fullAddress}</p>
              {event.entryInstructions && (
                <div className="pt-3 border-t border-trailrz-grey-border text-xs text-trailrz-grey">
                  <strong>Entry Instructions:</strong> {event.entryInstructions}
                </div>
              )}
            </div>

            {/* Additional Guidelines: Age restriction, Rules, Accessibility */}
            <div className="space-y-4">
              <h4 className="font-editorial text-xl font-bold text-trailrz-black">
                Important Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-trailrz-grey-border">
                  <div className="font-bold text-trailrz-black mb-1">Age Restriction</div>
                  <p className="text-trailrz-grey">{event.ageRestriction} audience recommended</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-trailrz-grey-border">
                  <div className="font-bold text-trailrz-black mb-1">Accessibility</div>
                  <p className="text-trailrz-grey">
                    {event.accessibilityInfo || "Standard venue accessibility available."}
                  </p>
                </div>
              </div>

              {event.cancellationPolicy && (
                <div className="p-4 rounded-2xl bg-white border border-trailrz-grey-border text-xs">
                  <div className="font-bold text-trailrz-black mb-1">Cancellation Policy</div>
                  <p className="text-trailrz-grey leading-relaxed">{event.cancellationPolicy}</p>
                </div>
              )}
            </div>

            {/* FAQs Accordion */}
            {event.faqs && event.faqs.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-trailrz-grey-border">
                <h4 className="font-editorial text-xl font-bold text-trailrz-black">
                  Frequently Asked Questions
                </h4>
                <div className="space-y-3">
                  {event.faqs.map((faq: any, idx: number) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-trailrz-grey-border bg-white overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full p-4 text-left font-bold text-xs sm:text-sm text-trailrz-black flex items-center justify-between hover:bg-trailrz-ivory/50 transition-colors"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-trailrz-grey transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 text-xs text-trailrz-grey leading-relaxed border-t border-trailrz-grey-border/40">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Booking Card (Desktop) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 bg-white rounded-3xl border border-trailrz-grey-border p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-trailrz-grey-border">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-trailrz-grey block">
                    Starting From
                  </span>
                  <div className="text-2xl font-extrabold text-trailrz-red">
                    {minPrice > 0 ? formatCurrency(minPrice) : "Free Admission"}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-trailrz-grey block">
                    Availability
                  </span>
                  <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Booking Open</span>
                  </span>
                </div>
              </div>

              {/* Ticket Category Preview */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-trailrz-grey block">
                  Available Passes ({event.ticketTypes.length})
                </span>

                <div className="space-y-2">
                  {event.ticketTypes.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-trailrz-ivory border border-trailrz-grey-border flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-trailrz-black">{t.name}</div>
                        {t.description && (
                          <div className="text-[11px] text-trailrz-grey line-clamp-1">
                            {t.description}
                          </div>
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-trailrz-black">
                        {t.price > 0 ? formatCurrency(t.price) : "Free"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant Action CTA */}
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full py-4 rounded-2xl bg-trailrz-red hover:bg-trailrz-red-hover text-white font-extrabold text-base transition-all shadow-lg shadow-trailrz-red/20 flex items-center justify-center space-x-2"
              >
                <Ticket className="w-5 h-5" />
                <span>Select Tickets & Book</span>
              </button>

              <div className="space-y-2 pt-2 text-[11px] text-trailrz-grey">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>No account creation needed. 100% verified digital tickets.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span>Instant confirmation delivered to Email & WhatsApp.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Mobile Booking Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-trailrz-grey-border p-4 shadow-2xl flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-trailrz-grey block">From</span>
          <span className="text-lg font-extrabold text-trailrz-black">
            {minPrice > 0 ? formatCurrency(minPrice) : "Free"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsBookingModalOpen(true)}
          className="px-6 py-3 rounded-xl bg-trailrz-red text-white font-extrabold text-xs hover:bg-trailrz-red-hover transition-colors shadow-md shadow-trailrz-red/20 flex items-center space-x-1.5"
        >
          <Ticket className="w-4 h-4" />
          <span>Book Passes</span>
        </button>
      </div>

      {/* Booking Checkout Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        event={event}
      />
    </>
  );
}
