"use client";

import React, { useState, useEffect } from "react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import {
  MapPin,
  Search,
  Ticket,
  Menu,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";

const CITIES = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedCity, setSelectedCity] = useState("Chandigarh");
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/discover?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setIsCityDropdownOpen(false);
    router.push(`/discover?city=${encodeURIComponent(city)}`);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? "bg-trailrz-ivory/95 backdrop-blur-md border-b border-trailrz-grey-border shadow-sm py-3"
            : "bg-trailrz-ivory py-4 border-b border-trailrz-grey-border/60"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Left: TRAILRZ Logo */}
            <div className="flex items-center space-x-6">
              <a href="/" className="group flex items-center space-x-2">
                <span className="w-8 h-8 rounded-lg bg-trailrz-black text-white flex items-center justify-center font-bold text-lg tracking-wider border border-trailrz-red/30 group-hover:bg-trailrz-red transition-colors">
                  T
                </span>
                <div className="flex flex-col">
                  <span className="font-extrabold text-2xl tracking-[0.2em] text-trailrz-black font-editorial">
                    TRAILRZ
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-trailrz-grey font-semibold -mt-1">
                    Curated Experiences
                  </span>
                </div>
              </a>

              {/* City Selector Pill */}
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-trailrz-ivory-dark hover:bg-trailrz-grey-light text-xs font-semibold text-trailrz-black border border-trailrz-grey-border transition-all"
                >
                  <MapPin className="w-3.5 h-3.5 text-trailrz-red" />
                  <span>{selectedCity}</span>
                  <ChevronDown className="w-3 h-3 text-trailrz-grey" />
                </button>

                {isCityDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-44 rounded-xl bg-white shadow-xl border border-trailrz-grey-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase text-trailrz-grey tracking-wider">
                      Select City
                    </div>
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleCitySelect(c)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between ${
                          selectedCity === c
                            ? "bg-trailrz-red-light text-trailrz-red font-semibold"
                            : "hover:bg-trailrz-ivory text-trailrz-black"
                        }`}
                      >
                        <span>{c}</span>
                        {selectedCity === c && (
                          <span className="w-1.5 h-1.5 rounded-full bg-trailrz-red" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center: Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-8">
              <a
                href="/discover"
                className={`text-sm font-semibold transition-colors hover:text-trailrz-red ${
                  pathname === "/discover" ? "text-trailrz-red" : "text-trailrz-black"
                }`}
              >
                Discover
              </a>
              <a
                href="/discover?original=true"
                className="text-sm font-semibold flex items-center space-x-1 text-trailrz-black hover:text-trailrz-red transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-trailrz-red" />
                <span>Trailrz Originals</span>
              </a>
              <a
                href="/discover?category=Music"
                className="text-sm font-semibold text-trailrz-black hover:text-trailrz-red transition-colors"
              >
                Live Music
              </a>
              <a
                href="/discover?category=Food"
                className="text-sm font-semibold text-trailrz-black hover:text-trailrz-red transition-colors"
              >
                Food & Tasting
              </a>
              <a
                href="/discover?category=Comedy"
                className="text-sm font-semibold text-trailrz-black hover:text-trailrz-red transition-colors"
              >
                Comedy
              </a>
            </nav>

            {/* Right: Search, My Tickets, Mobile Menu Toggle */}
            <div className="flex items-center space-x-3">
              {/* Search Toggle */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 rounded-full hover:bg-trailrz-ivory-dark text-trailrz-black transition-colors"
                title="Search experiences"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* My Tickets Button */}
              <a
                href="/my-tickets"
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border border-trailrz-black text-trailrz-black hover:bg-trailrz-black hover:text-white transition-all text-xs font-bold"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Tickets</span>
              </a>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 lg:hidden rounded-lg hover:bg-trailrz-ivory-dark text-trailrz-black transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Expandable Search Bar */}
          {isSearchOpen && (
            <div className="pt-3 pb-1 border-t border-trailrz-grey-border/50 mt-3 animate-in fade-in duration-200">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search live music, candlelight, comedy, secret suppers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-white border border-trailrz-grey-border text-sm text-trailrz-black placeholder:text-trailrz-grey focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red"
                />
                <Search className="w-4 h-4 text-trailrz-grey absolute left-3.5 top-3" />
                <button
                  type="submit"
                  className="absolute right-2 top-1.5 px-4 py-1.5 rounded-lg bg-trailrz-black text-white text-xs font-bold hover:bg-trailrz-red transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Mobile Slide-down Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-trailrz-ivory border-b border-trailrz-grey-border px-4 py-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-trailrz-grey-border">
              <span className="text-xs font-bold uppercase text-trailrz-grey">Location</span>
              <select
                value={selectedCity}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="bg-white border border-trailrz-grey-border rounded-lg px-2.5 py-1 text-xs font-semibold text-trailrz-black focus:outline-none"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <nav className="flex flex-col space-y-3">
              <a
                href="/discover"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-black hover:text-trailrz-red"
              >
                Discover All Events
              </a>
              <a
                href="/discover?original=true"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-black flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-trailrz-red" />
                <span>Trailrz Originals</span>
              </a>
              <a
                href="/discover?category=Music"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-black"
              >
                Live Music & Acoustic
              </a>
              <a
                href="/discover?category=Food"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-black"
              >
                Food & Tasting Experiences
              </a>
              <a
                href="/discover?category=Comedy"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-black"
              >
                Stand-Up Comedy
              </a>
              <a
                href="/discover?category=Workshops"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-black"
              >
                Creative Workshops
              </a>
              <a
                href="/my-tickets"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-semibold text-trailrz-red pt-2 border-t border-trailrz-grey-border flex items-center space-x-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Find My Tickets</span>
              </a>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
