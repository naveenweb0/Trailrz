"use client";

import React from "react";
import Image from "next/image";
import { Calendar, MapPin, Sparkles, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatEventDate } from "@/lib/utils";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    category: string;
    eventType?: string;
    isFeatured?: boolean;
    isOriginal?: boolean;
    coverImage: string;
    city: string;
    venueName: string;
    eventDate: Date | string;
    startTime: string;
    minPrice: number; // in paise
    mood?: string | null;
  };
  priority?: boolean;
}

export default function EventCard({ event, priority = false }: EventCardProps) {
  const isOriginal = event.isOriginal || event.eventType === "TRAILRZ_ORIGINAL";

  return (
    <a
      href={`/events/${event.slug}`}
      className="group block relative bg-white rounded-2xl overflow-hidden border border-trailrz-grey-border/80 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-trailrz-ivory-dark">
        <Image
          src={event.coverImage}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex flex-wrap gap-1.5">
            {isOriginal ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-red text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Trailrz Original</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                {event.category}
              </span>
            )}

            {event.isFeatured && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                Featured
              </span>
            )}
          </div>

          {event.mood && (
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-trailrz-black text-[10px] font-bold">
              {event.mood}
            </span>
          )}
        </div>

        {/* Bottom image overlay metadata */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-trailrz-red" />
            <span className="font-medium">{formatEventDate(event.eventDate)}</span>
          </div>

          <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md">
            <span className="text-white/80 font-normal">From</span>
            <span className="font-bold text-white">
              {event.minPrice > 0 ? formatCurrency(event.minPrice) : "Free"}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-grow">
        <div>
          {/* Location / Venue */}
          <div className="flex items-center space-x-1 text-trailrz-grey text-xs mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-trailrz-red flex-shrink-0" />
            <span className="truncate font-medium">
              {event.venueName}, {event.city}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base sm:text-lg text-trailrz-black line-clamp-2 group-hover:text-trailrz-red transition-colors leading-snug">
            {event.title}
          </h3>
        </div>

        {/* Card Footer */}
        <div className="pt-4 mt-3 border-t border-trailrz-grey-border/60 flex items-center justify-between text-xs">
          <span className="text-trailrz-grey font-medium">
            Starts at {event.startTime}
          </span>
          <span className="inline-flex items-center font-bold text-trailrz-black group-hover:text-trailrz-red transition-colors">
            <span>Book Tickets</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </a>
  );
}
