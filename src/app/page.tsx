import React from "react";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import EventCard from "@/components/public/EventCard";
import { Spotlight } from "@/components/ui/spotlight";
import { FlipWords } from "@/components/ui/flip-words";
import { BorderBeam } from "@/components/ui/border-beam";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Meteors } from "@/components/ui/meteors";
import { LampContainer } from "@/components/ui/lamp";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
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
  CheckCircle,
  MapPin,
  Calendar,
  Ticket,
} from "lucide-react";

export const revalidate = 60; // Revalidate every minute

async function getHomepageData() {
  const now = new Date();

  // 1. Curated Experiences
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

  const experienceFlipWords = [
    "Candlelight Concerts",
    "Secret Supper Clubs",
    "Acoustic Nights",
    "Creative Workshops",
    "Founders Meetups",
    "Rooftop Vinyl Evenings",
  ];

  const moodItems = [
    {
      title: "Date Night",
      description: "Intimate vibes & candles",
      link: "/discover?mood=Date+Night",
      iconName: "Heart",
      image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Friends Night",
      description: "Laughter & brews",
      link: "/discover?mood=Friends+Night",
      iconName: "Users",
      image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Something Different",
      description: "Unusual local discoveries",
      link: "/discover?mood=Something+Different",
      iconName: "Compass",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Music & Rhythm",
      description: "Live jazz & indie folk",
      link: "/discover?mood=Music+%26+Rhythm",
      iconName: "Music",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Food Lovers",
      description: "Chefs tables & tastings",
      link: "/discover?mood=Food+Lovers",
      iconName: "Utensils",
      image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Creative Minds",
      description: "Pottery & startup mixers",
      link: "/discover?mood=Creative+Minds",
      iconName: "Palette",
      image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const attendeeTestimonials = [
    {
      quote: "Chai & Chords in Sector 17 was hands down the most atmospheric acoustic concert I've attended in North India.",
      name: "Simran Kaur",
      title: "Attended Chai & Chords, Chandigarh",
      tag: "Verified Attendee",
    },
    {
      quote: "No account required, booked passes in 10 seconds, and the gate QR scanner verified us instantly. Fever meets Apple vibes.",
      name: "Karan Singhania",
      title: "Attended Rooftop Vinyl Session, Mohali",
      tag: "Instant Digital Pass",
    },
    {
      quote: "The Founder Connect was electric. Met three early customers and two potential co-founders over artisan coffee.",
      name: "Amanjot Singh",
      title: "Attended The Founder Connect, Sector 17 C",
      tag: "Trailrz Original",
    },
    {
      quote: "Candlelight Nocturne gave me chills. The string quartet in a heritage courtyard felt like another world.",
      name: "Dr. Tanya Sharma",
      title: "Attended Candlelight Classics, Panchkula",
      tag: "Sold Out Experience",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-trailrz-ivory overflow-x-hidden">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION WITH ACETERNITY SPOTLIGHT & MAGIC UI BORDER BEAM */}
        <section className="relative overflow-hidden bg-trailrz-black text-white pt-20 pb-28 lg:pt-28 lg:pb-40">
          {/* Dual Spotlights */}
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="#E53935"
          />
          <Spotlight
            className="top-10 left-full md:left-80 h-[80vh] w-[50vw]"
            fill="#FFFFFF"
          />

          {/* Background Ambient Texture */}
          <div className="absolute inset-0 z-0 opacity-25 mix-blend-luminosity">
            <Image
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2000&q=80"
              alt="Live concert atmosphere"
              fill
              priority
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-trailrz-black via-trailrz-black/75 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              {/* Animated Live Pill */}
              <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-xs font-bold text-white mb-8 shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trailrz-red opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-trailrz-red"></span>
                </span>
                <span className="tracking-widest uppercase text-[11px]">
                  CHANDIGARH • MOHALI • PANCHKULA
                </span>
              </div>

              {/* Main Headline with Editorial Serif & FlipWords */}
              <h1 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6">
                Life is happening. <br />
                <span className="italic font-normal text-trailrz-ivory">Experience</span>
                <FlipWords
                  words={experienceFlipWords}
                  className="font-editorial italic font-normal text-trailrz-red"
                />
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-xl text-white/80 font-normal leading-relaxed max-w-2xl mb-10">
                Discover intimate candlelight sessions, secret food tastings, stand-up comedy,
                and exclusive Trailrz Originals crafted to give you a better story.
              </p>

              {/* Search Box with Magic UI Border Beam */}
              <div className="relative p-2.5 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-white/15 shadow-2xl max-w-xl overflow-hidden">
                <BorderBeam size={180} duration={8} colorFrom="#E53935" colorTo="#FFA000" />
                <form action="/discover" method="GET" className="relative z-10 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      name="search"
                      placeholder="Search live music, candlelight, comedy..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-trailrz-red/50"
                    />
                  </div>
                  <ShimmerButton
                    type="submit"
                    className="shadow-lg shadow-trailrz-red/30"
                  >
                    <span className="flex items-center space-x-2 font-extrabold text-sm tracking-wide">
                      <span>Explore Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </ShimmerButton>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE BUZZ TICKER (ACETERNITY INFINITE MOVING CARDS) */}
        <div className="py-6 bg-neutral-950 border-y border-white/10 overflow-hidden">
          <InfiniteMovingCards
            items={attendeeTestimonials}
            direction="left"
            speed="slow"
          />
        </div>

        {/* SECTION 1: CURATED FOR YOU */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {curated.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {curated.map((event, idx) => (
                <EventCard key={event.id} event={event} priority={idx < 3} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-trailrz-grey-border p-12 text-center max-w-2xl mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-full bg-trailrz-red/10 text-trailrz-red mx-auto flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-trailrz-black mb-2">
                Curating the Next Experiences
              </h3>
              <p className="text-sm text-trailrz-grey mb-6">
                Our team is busy preparing fresh, handpicked gatherings. Upload your first experience from the admin dashboard to showcase it right here.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <a
                  href="/admin/events/new"
                  className="px-5 py-2.5 rounded-full bg-trailrz-red text-white font-bold text-xs hover:bg-trailrz-red-hover transition-colors"
                >
                  Create Event in Admin
                </a>
                <a
                  href="/discover"
                  className="px-5 py-2.5 rounded-full border border-trailrz-black text-trailrz-black font-bold text-xs hover:bg-trailrz-black hover:text-white transition-colors"
                >
                  Browse Directory
                </a>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: TRAILRZ ORIGINALS (WITH MAGIC UI BORDER BEAM & METEORS) */}
        <section className="py-24 bg-trailrz-black text-white relative overflow-hidden">
          <Meteors number={25} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 pb-6 border-b border-white/10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-trailrz-red/20 text-trailrz-red border border-trailrz-red/40 text-xs font-extrabold uppercase tracking-widest mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Flagship Productions</span>
                </div>
                <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-white leading-tight">
                  Trailrz Originals
                </h2>
                <p className="text-sm sm:text-base text-white/70 mt-3 max-w-xl">
                  Not sourced from generic ticket aggregators. Every Trailrz Original is crafted in-house
                  with curated artists, candlelit ambiance, and unrepeatable memories.
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
            {originals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {originals.map((event) => (
                  <div
                    key={event.id}
                    className="group relative bg-neutral-900 rounded-3xl overflow-hidden border border-white/15 hover:border-trailrz-red/50 transition-all duration-300 flex flex-col shadow-2xl"
                  >
                    <BorderBeam size={220} duration={10} colorFrom="#E53935" colorTo="#FFA000" />
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image
                        src={event.coverImage}
                        alt={event.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-trailrz-red text-white text-[11px] font-extrabold uppercase tracking-widest shadow-md">
                          Original Production
                        </span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow">
                      <div>
                        <div className="flex items-center space-x-2 text-xs text-white/60 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-trailrz-red" />
                          <span>
                            {event.venueName}, {event.city}
                          </span>
                        </div>
                        <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-white group-hover:text-trailrz-red transition-colors mb-2">
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
                          <span className="text-xl font-extrabold text-white">
                            ₹{(event.minPrice / 100).toFixed(0)}
                          </span>
                        </div>

                        <a
                          href={`/events/${event.slug}`}
                          className="px-6 py-2.5 rounded-xl bg-white text-trailrz-black font-extrabold text-xs hover:bg-trailrz-red hover:text-white transition-colors shadow-lg"
                        >
                          Reserve Passes
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-12 text-center max-w-xl mx-auto">
                <Sparkles className="w-8 h-8 text-trailrz-red mx-auto mb-3" />
                <h3 className="font-editorial text-xl font-bold text-white mb-2">
                  Bespoke Originals Coming Soon
                </h3>
                <p className="text-xs sm:text-sm text-white/60 mb-6">
                  Chai & Chords, Candlelight Evenings, and Unplugged Rooftop Sessions are in production.
                </p>
                <a
                  href="/admin/events/new"
                  className="inline-block px-5 py-2.5 rounded-full bg-trailrz-red text-white text-xs font-bold hover:bg-trailrz-red-hover transition-colors"
                >
                  Create an Original
                </a>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: DISCOVER BY MOOD (WITH ACETERNITY HOVER EFFECT) */}
        <section className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center max-w-2xl mx-auto">
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

          <HoverEffect items={moodItems} />
        </section>

        {/* SECTION 4: EXPLORE CATEGORIES (ACETERNITY BENTO GRID) */}
        <section className="py-20 bg-trailrz-ivory-dark/40 border-y border-trailrz-grey-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-trailrz-red block mb-1">
                Browse Collections
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-trailrz-black">
                Explore Categories
              </h2>
            </div>

            <BentoGrid className="max-w-6xl mx-auto">
              <BentoGridItem
                className="md:col-span-2 bg-gradient-to-br from-neutral-900 to-black text-white border-white/10"
                title={<span className="text-white text-xl font-bold font-editorial">Live Music & Candlelight</span>}
                description="Intimate acoustic folk, jazz ensembles, and heritage courtyards lit by hundreds of candles."
                header={
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-2">
                    <Image
                      src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
                      alt="Live acoustic performance"
                      fill
                      className="object-cover opacity-80"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-trailrz-red text-white text-[10px] font-bold">
                      Most Popular
                    </div>
                  </div>
                }
                icon={<Music className="h-6 w-6 text-trailrz-red" />}
              />

              <BentoGridItem
                className="bg-white border-trailrz-grey-border"
                title="Food & Supper Clubs"
                description="Secret chefs tables, curated tasting flights, and artisan coffee brews."
                header={
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-2">
                    <Image
                      src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80"
                      alt="Food tasting experience"
                      fill
                      className="object-cover"
                    />
                  </div>
                }
                icon={<Utensils className="h-6 w-6 text-trailrz-red" />}
              />

              <BentoGridItem
                className="bg-white border-trailrz-grey-border"
                title="Stand-Up Comedy"
                description="Unfiltered punchlines from headliners and handpicked indie comics."
                header={
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-2">
                    <Image
                      src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80"
                      alt="Comedy club"
                      fill
                      className="object-cover"
                    />
                  </div>
                }
                icon={<Laugh className="h-6 w-6 text-trailrz-red" />}
              />

              <BentoGridItem
                className="md:col-span-2 bg-gradient-to-br from-white to-neutral-50 border-trailrz-grey-border"
                title="Workshops & Masterclasses"
                description="Hands-on pottery, mixology, visual arts, and founder networking sessions."
                header={
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-2">
                    <Image
                      src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80"
                      alt="Creative pottery workshop"
                      fill
                      className="object-cover"
                    />
                  </div>
                }
                icon={<Palette className="h-6 w-6 text-trailrz-red" />}
              />
            </BentoGrid>
          </div>
        </section>

        {/* SECTION 5: WHY TRAILRZ? (ACETERNITY LAMP CONTAINER EFFECT) */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LampContainer>
            <div className="text-center max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-widest text-trailrz-red block mb-2">
                Our Philosophy
              </span>
              <h2 className="font-editorial text-3xl sm:text-5xl font-extrabold text-white leading-tight mb-6">
                Not just another plan. <br />
                <span className="italic font-normal text-trailrz-ivory">A better story.</span>
              </h2>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-8 max-w-xl mx-auto">
                We believe your evenings shouldn’t be spent endlessly scrolling through noisy restaurants.
                Trailrz produces intimate, memorable gatherings that leave you inspired.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-white/90">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/15">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span>Curated & Original Productions</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/15">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span>No Account Needed to Book</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/15">
                  <CheckCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
                  <span>Instant QR Code Passes</span>
                </div>
              </div>
            </div>
          </LampContainer>
        </section>
      </main>

      <Footer />
    </div>
  );
}
