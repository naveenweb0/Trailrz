import React from "react";
import Image from "next/image";
import Link from "next/navigation";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import EventCard from "@/components/public/EventCard";
import {
  Sparkles,
  ArrowRight,
  Search,
  Music,
  Utensils,
  Laugh,
  Palette,
  Heart,
  Users,
  Compass,
  Flame,
  ShieldCheck,
  CheckCircle,
  MapPin,
} from "lucide-react";

export const revalidate = 60; // Revalidate every minute

async function getHomepageData() {
  const now = new Date();

  // 1. Curated Experiences (Featured or high priority)
  const curatedEvents = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      eventDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    take: 6,
    orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
    include: {
      ticketTypes: {
        where: { status: "ACTIVE" },
        orderBy: { price: "asc" },
      },
    },
  });

  // 2. Trailrz Originals
  const originals = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ isOriginal: true }, { eventType: "TRAILRZ_ORIGINAL" }],
    },
    take: 4,
    orderBy: { eventDate: "asc" },
    include: {
      ticketTypes: {
        where: { status: "ACTIVE" },
        orderBy: { price: "asc" },
      },
    },
  });

  // 3. Trending (by actual booking counts)
  const trendingEvents = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      eventDate: { gte: now },
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: {
      ticketTypes: {
        where: { status: "ACTIVE" },
        orderBy: { price: "asc" },
      },
    },
  });

  // Format events with starting price
  const formatList = (events: typeof curatedEvents) =>
    events.map((ev) => ({
      ...ev,
      minPrice: ev.ticketTypes.length > 0 ? ev.ticketTypes[0].price : 0,
    }));

  return {
    curated: formatList(curatedEvents),
    originals: formatList(originals),
    trending: formatList(trendingEvents),
  };
}

export default async function HomePage() {
  const { curated, originals, trending } = await getHomepageData();

  const moods = [
    { title: "Date Night", query: "Date Night", icon: Heart, image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80" },
    { title: "Friends Night", query: "Friends Night", icon: Users, image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=600&q=80" },
    { title: "Something Different", query: "Something Different", icon: Compass, image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80" },
    { title: "Music & Rhythm", query: "Music & Rhythm", icon: Music, image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80" },
    { title: "Food Lovers", query: "Food Lovers", icon: Utensils, image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80" },
    { title: "Creative Minds", query: "Creative Minds", icon: Palette, image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80" },
  ];

  const categories = [
    { name: "Live Music", count: "Acoustic, Jazz & Classical", query: "Music", icon: Music },
    { name: "Food & Tasting", count: "Supper Clubs & Brews", query: "Food", icon: Utensils },
    { name: "Stand-Up Comedy", count: "Headlining Comics", query: "Comedy", icon: Laugh },
    { name: "Art & Workshops", count: "Pottery & Masterclasses", query: "Workshops", icon: Palette },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-trailrz-ivory">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-trailrz-black text-white pt-16 pb-24 lg:pt-24 lg:pb-36">
          {/* Background Lifestyle Image with Cinematic Wash */}
          <div className="absolute inset-0 z-0 opacity-30 mix-blend-luminosity">
            <Image
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=80"
              alt="Live concert and atmospheric evening crowd"
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-trailrz-black via-trailrz-black/60 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              {/* Top Tagline Pill */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-white mb-6">
                <span className="w-2 h-2 rounded-full bg-trailrz-red animate-pulse" />
                <span className="tracking-wide">CURATED FOR CHANDIGARH, MOHALI & PANCHKULA</span>
              </div>

              {/* Main Headline */}
              <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
                Life is happening. <br />
                <span className="italic font-normal text-trailrz-ivory">Go be part of it.</span>
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-xl text-white/80 font-normal leading-relaxed max-w-2xl mb-10">
                Discover extraordinary live experiences, secret supper clubs, acoustic nights,
                and exclusive Trailrz Originals around you.
              </p>

              {/* Hero Search & Quick Action Box */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl max-w-xl">
                <form action="/discover" method="GET" className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="search"
                      placeholder="Search live music, candlelight, comedy..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-trailrz-red"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-trailrz-red hover:bg-trailrz-red-hover text-white font-extrabold text-sm transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-trailrz-red/30"
                  >
                    <span>Explore Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: CURATED FOR YOU */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-trailrz-grey-border">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-trailrz-red block mb-1">
                Handpicked Experiences
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-trailrz-black">
                Curated for You
              </h2>
            </div>
            <a
              href="/discover"
              className="mt-3 sm:mt-0 inline-flex items-center space-x-1.5 text-xs font-extrabold text-trailrz-black hover:text-trailrz-red transition-colors"
            >
              <span>View All Experiences</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {curated.map((event, idx) => (
              <EventCard key={event.id} event={event} priority={idx < 3} />
            ))}
          </div>
        </section>

        {/* SECTION 2: TRAILRZ ORIGINALS (THE CORE BRAND DIFFERENTIATOR) */}
        <section className="py-20 bg-trailrz-black text-white relative overflow-hidden">
          {/* Subtle background film strip accents */}
          <div className="absolute inset-0 bg-grain-pattern opacity-5" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 pb-6 border-b border-white/10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-trailrz-red/20 text-trailrz-red border border-trailrz-red/40 text-xs font-extrabold uppercase tracking-widest mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Trailrz Originals</span>
                </div>
                <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                  Experiences Born From Our Own Curation.
                </h2>
                <p className="text-sm sm:text-base text-white/70 mt-3 max-w-xl">
                  Not sourced from generic aggregators. Every Trailrz Original is crafted in-house
                  with bespoke artists, intimate venue settings, and unforgettable stories.
                </p>
              </div>

              <a
                href="/discover?original=true"
                className="mt-6 lg:mt-0 inline-flex items-center space-x-2 px-5 py-2.5 rounded-full border border-white/30 text-xs font-bold text-white hover:bg-white hover:text-trailrz-black transition-all"
              >
                <span>Explore All Originals</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Originals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {originals.map((event) => (
                <div
                  key={event.id}
                  className="group relative bg-white/5 rounded-3xl overflow-hidden border border-white/15 hover:border-trailrz-red/50 transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={event.coverImage}
                      alt={event.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-trailrz-black via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-trailrz-red text-white text-[11px] font-extrabold uppercase tracking-widest">
                        Original Production
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col justify-between flex-grow">
                    <div>
                      <div className="flex items-center space-x-2 text-xs text-white/60 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-trailrz-red" />
                        <span>
                          {event.venueName}, {event.city}
                        </span>
                      </div>
                      <h3 className="font-editorial text-2xl font-bold text-white group-hover:text-trailrz-red transition-colors mb-2">
                        {event.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/70 line-clamp-2 leading-relaxed">
                        {event.shortDescription}
                      </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 block">
                          Tickets From
                        </span>
                        <span className="text-lg font-extrabold text-white">
                          ₹{(event.minPrice / 100).toFixed(0)}
                        </span>
                      </div>

                      <a
                        href={`/events/${event.slug}`}
                        className="px-5 py-2.5 rounded-xl bg-white text-trailrz-black font-extrabold text-xs hover:bg-trailrz-red hover:text-white transition-colors"
                      >
                        Reserve Passes
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: DISCOVER BY MOOD */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-trailrz-red block mb-1">
              Curated Vibe
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-trailrz-black">
              Discover by Mood
            </h2>
            <p className="text-xs sm:text-sm text-trailrz-grey mt-2">
              Whether you’re planning a quiet candlelit date, a laughing night with friends, or solo creative time.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {moods.map((m) => {
              const Icon = m.icon;
              return (
                <a
                  key={m.title}
                  href={`/discover?mood=${encodeURIComponent(m.query)}`}
                  className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-trailrz-black flex flex-col justify-end p-4 border border-trailrz-grey-border shadow-sm hover:shadow-lg transition-all"
                >
                  <Image
                    src={m.image}
                    alt={m.title}
                    fill
                    className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative z-10 text-white">
                    <Icon className="w-5 h-5 text-trailrz-red mb-1 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm block leading-tight">{m.title}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: EXPLORE CATEGORIES */}
        <section className="py-16 bg-trailrz-ivory-dark/50 border-y border-trailrz-grey-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-trailrz-red block mb-1">
                  Browse Collections
                </span>
                <h2 className="font-editorial text-3xl font-extrabold text-trailrz-black">
                  Explore Categories
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((c) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.name}
                    href={`/discover?category=${encodeURIComponent(c.query)}`}
                    className="group p-6 rounded-2xl bg-white border border-trailrz-grey-border hover:border-trailrz-red hover:shadow-md transition-all flex items-start space-x-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-trailrz-red-light text-trailrz-red flex items-center justify-center flex-shrink-0 group-hover:bg-trailrz-red group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-trailrz-black group-hover:text-trailrz-red transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-xs text-trailrz-grey mt-0.5">{c.count}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 5: WHY TRAILRZ? */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-trailrz-black rounded-3xl p-8 sm:p-14 text-white relative overflow-hidden">
            <div className="max-w-2xl relative z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-trailrz-red block mb-2">
                Our Philosophy
              </span>
              <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
                Not just another plan. <br />
                <span className="italic font-normal text-trailrz-ivory">A better story.</span>
              </h2>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-8">
                We believe your evenings shouldn’t be spent endlessly scrolling through restaurants
                or noisy crowded clubs. Trailrz handpicks cultural, musical, and culinary discoveries
                that leave you inspired.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span className="text-white/90">Curated & Original Productions</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span className="text-white/90">No Account Needed to Book</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span className="text-white/90">Instant Digital QR Tickets</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span className="text-white/90">Razorpay Verified Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
