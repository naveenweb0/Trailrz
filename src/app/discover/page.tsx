"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import EventCard from "@/components/public/EventCard";
import {
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  MapPin,
  Calendar,
  Filter,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";

const CITIES = [
  "All Cities",
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
];

const CATEGORIES = [
  "All Categories",
  "Music",
  "Food",
  "Comedy",
  "Art & Culture",
  "Workshops",
  "Nightlife",
  "Outdoor",
];

const DATE_OPTIONS = [
  { label: "Any Time", value: "" },
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Weekend", value: "this_weekend" },
  { label: "This Week", value: "this_week" },
];

const PRICE_BRACKETS = [
  { label: "All Prices", min: null, max: null },
  { label: "Under ₹499", min: 0, max: 49900 },
  { label: "₹500 – ₹999", min: 50000, max: 99900 },
  { label: "₹1,000+", min: 100000, max: null },
];

const MOODS = [
  "All Moods",
  "Date Night",
  "Friends Night",
  "Something Different",
  "Music & Rhythm",
  "Food Lovers",
  "Creative Minds",
  "Weekend Plans",
];

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [city, setCity] = useState(searchParams.get("city") || "All Cities");
  const [category, setCategory] = useState(searchParams.get("category") || "All Categories");
  const [dateRange, setDateRange] = useState(searchParams.get("dateRange") || "");
  const [priceBracket, setPriceBracket] = useState<number | null>(null);
  const [mood, setMood] = useState(searchParams.get("mood") || "All Moods");
  const [isOriginal, setIsOriginal] = useState(searchParams.get("original") === "true");
  const [sort, setSort] = useState(searchParams.get("sort") || "recommended");

  // Mobile Filter Drawer State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Events list & loading
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events when filters change
  const fetchFilteredEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (city && city !== "All Cities") params.set("city", city);
      if (category && category !== "All Categories") params.set("category", category);
      if (dateRange) params.set("dateRange", dateRange);
      if (mood && mood !== "All Moods") params.set("mood", mood);
      if (isOriginal) params.set("original", "true");
      if (sort) params.set("sort", sort);

      if (priceBracket !== null) {
        const bracket = PRICE_BRACKETS[priceBracket];
        if (bracket.min !== null) params.set("priceMin", bracket.min.toString());
        if (bracket.max !== null) params.set("priceMax", bracket.max.toString());
      }

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredEvents();
  }, [city, category, dateRange, priceBracket, mood, isOriginal, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredEvents();
  };

  const clearAllFilters = () => {
    setSearch("");
    setCity("All Cities");
    setCategory("All Categories");
    setDateRange("");
    setPriceBracket(null);
    setMood("All Moods");
    setIsOriginal(false);
    setSort("recommended");
  };

  // Active filter count
  const hasActiveFilters =
    Boolean(search) ||
    city !== "All Cities" ||
    category !== "All Categories" ||
    Boolean(dateRange) ||
    priceBracket !== null ||
    mood !== "All Moods" ||
    isOriginal;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Header & Search Bar */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-trailrz-black">
              Discover Experiences
            </h1>
            <p className="text-xs sm:text-sm text-trailrz-grey mt-1">
              Curated live music, secret suppers, and cultural events across India.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none pl-8 pr-8 py-2 rounded-xl bg-white border border-trailrz-grey-border text-xs font-semibold text-trailrz-black focus:outline-none"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="newest">Sort: Newest Added</option>
                <option value="date">Sort: Upcoming Date</option>
                <option value="price_low">Sort: Price (Low to High)</option>
                <option value="price_high">Sort: Price (High to Low)</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-trailrz-grey absolute left-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-trailrz-black text-white text-xs font-bold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
          <Search className="w-4 h-4 text-trailrz-grey absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by event title, artist, venue, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-24 py-3 rounded-2xl bg-white border border-trailrz-grey-border text-sm text-trailrz-black placeholder:text-trailrz-grey focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 px-4 py-1.5 rounded-xl bg-trailrz-black text-white text-xs font-bold hover:bg-trailrz-red transition-colors"
          >
            Search
          </button>
        </form>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-trailrz-grey">
              Active:
            </span>

            {city !== "All Cities" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-ivory-dark text-trailrz-black text-xs font-semibold">
                <span>{city}</span>
                <button onClick={() => setCity("All Cities")}><X className="w-3 h-3" /></button>
              </span>
            )}

            {category !== "All Categories" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-ivory-dark text-trailrz-black text-xs font-semibold">
                <span>{category}</span>
                <button onClick={() => setCategory("All Categories")}><X className="w-3 h-3" /></button>
              </span>
            )}

            {dateRange && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-ivory-dark text-trailrz-black text-xs font-semibold">
                <span>{DATE_OPTIONS.find((d) => d.value === dateRange)?.label}</span>
                <button onClick={() => setDateRange("")}><X className="w-3 h-3" /></button>
              </span>
            )}

            {isOriginal && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-red text-white text-xs font-bold">
                <Sparkles className="w-3 h-3" />
                <span>Trailrz Originals</span>
                <button onClick={() => setIsOriginal(false)}><X className="w-3 h-3" /></button>
              </span>
            )}

            {mood !== "All Moods" && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-ivory-dark text-trailrz-black text-xs font-semibold">
                <span>{mood}</span>
                <button onClick={() => setMood("All Moods")}><X className="w-3 h-3" /></button>
              </span>
            )}

            {priceBracket !== null && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-trailrz-ivory-dark text-trailrz-black text-xs font-semibold">
                <span>{PRICE_BRACKETS[priceBracket].label}</span>
                <button onClick={() => setPriceBracket(null)}><X className="w-3 h-3" /></button>
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs font-bold text-trailrz-red hover:underline ml-2"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Left Filters Sidebar (Desktop) + Right Event Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block space-y-6 bg-white p-6 rounded-3xl border border-trailrz-grey-border shadow-sm h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-trailrz-grey-border">
            <span className="text-sm font-bold uppercase tracking-wider text-trailrz-black flex items-center space-x-1.5">
              <Filter className="w-4 h-4 text-trailrz-red" />
              <span>Filters</span>
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-trailrz-red hover:underline font-semibold"
              >
                Reset
              </button>
            )}
          </div>

          {/* Filter 1: Trailrz Originals Toggle */}
          <div>
            <button
              onClick={() => setIsOriginal(!isOriginal)}
              className={`w-full p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                isOriginal
                  ? "border-trailrz-red bg-trailrz-red-light text-trailrz-red"
                  : "border-trailrz-grey-border hover:border-trailrz-grey text-trailrz-black"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-trailrz-red" />
                <span>Trailrz Originals Only</span>
              </span>
              <span className={`w-3 h-3 rounded-full ${isOriginal ? "bg-trailrz-red" : "bg-neutral-300"}`} />
            </button>
          </div>

          {/* Filter 2: Location */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-trailrz-black block">Location</label>
            <div className="space-y-1">
              {CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    city === c
                      ? "bg-trailrz-ivory-dark font-bold text-trailrz-black"
                      : "text-trailrz-grey hover:text-trailrz-black"
                  }`}
                >
                  <span>{c}</span>
                  {city === c && <span className="w-1.5 h-1.5 rounded-full bg-trailrz-red" />}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 3: Category */}
          <div className="space-y-2 pt-3 border-t border-trailrz-grey-border">
            <label className="text-xs font-bold text-trailrz-black block">Category</label>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    category === cat
                      ? "bg-trailrz-ivory-dark font-bold text-trailrz-black"
                      : "text-trailrz-grey hover:text-trailrz-black"
                  }`}
                >
                  <span>{cat}</span>
                  {category === cat && <span className="w-1.5 h-1.5 rounded-full bg-trailrz-red" />}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 4: Date */}
          <div className="space-y-2 pt-3 border-t border-trailrz-grey-border">
            <label className="text-xs font-bold text-trailrz-black block">When</label>
            <div className="space-y-1">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setDateRange(opt.value)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    dateRange === opt.value
                      ? "bg-trailrz-ivory-dark font-bold text-trailrz-black"
                      : "text-trailrz-grey hover:text-trailrz-black"
                  }`}
                >
                  <span>{opt.label}</span>
                  {dateRange === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-trailrz-red" />}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 5: Price */}
          <div className="space-y-2 pt-3 border-t border-trailrz-grey-border">
            <label className="text-xs font-bold text-trailrz-black block">Price</label>
            <div className="space-y-1">
              {PRICE_BRACKETS.map((pb, idx) => (
                <button
                  key={pb.label}
                  onClick={() => setPriceBracket(priceBracket === idx ? null : idx)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    priceBracket === idx
                      ? "bg-trailrz-ivory-dark font-bold text-trailrz-black"
                      : "text-trailrz-grey hover:text-trailrz-black"
                  }`}
                >
                  <span>{pb.label}</span>
                  {priceBracket === idx && <span className="w-1.5 h-1.5 rounded-full bg-trailrz-red" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Event Grid Results */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-trailrz-grey">
              {loading ? "Searching experiences..." : `${events.length} experiences found`}
            </span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-trailrz-red border-t-transparent animate-spin" />
              <p className="text-xs text-trailrz-grey">Loading curated events...</p>
            </div>
          ) : events.length === 0 ? (
            /* Beautiful Empty State */
            <div className="py-20 px-6 rounded-3xl bg-white border border-trailrz-grey-border text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-trailrz-ivory-dark text-trailrz-grey mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-trailrz-black">
                No experiences match your criteria
              </h3>
              <p className="text-xs sm:text-sm text-trailrz-grey max-w-sm mx-auto leading-relaxed">
                Try widening your search terms, changing the city selector, or clearing active filters.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-6 py-2.5 rounded-xl bg-trailrz-black text-white text-xs font-bold hover:bg-trailrz-red transition-colors inline-flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <div className="min-h-screen flex flex-col bg-trailrz-ivory">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
          <DiscoverContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
