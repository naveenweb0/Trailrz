"use client";

import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Search, Menu, X, Ticket, MapPin, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { EASE } from "@/components/motion/Motion";
import { Scramble } from "@/components/motion/Crazy";
import { Logo } from "@/components/brand/Logo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMeta } from "@/components/public/MetaContext";

const LINKS = [
  { to: "/discover", label: "Discover" },
  { to: "/originals", label: "TRAILRZ Originals" },
  { to: "/about", label: "About" },
];

function SearchDialog({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    onOpenChange(false);
    nav(`/discover?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-parchment border-linen p-8">
        <DialogTitle className="eyebrow">Search experiences</DialogTitle>
        <form onSubmit={submit} className="flex items-end gap-3 border-b border-ink pb-2">
          <input data-testid="search-dialog-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by title, venue, city or category"
            placeholder="Jazz, pottery, a venue…" className="flex-1 bg-transparent font-display text-3xl sm:text-4xl outline-none placeholder:text-[#b8ad9c]" />
          <button data-testid="search-dialog-submit" className="btn-ink h-10 px-4 text-sm">Search</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CityMenu() {
  const { meta } = useMeta();
  const nav = useNavigate();
  const cities = meta?.supported_cities || [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="nav-city-selector" className="inline-flex items-center gap-1.5 text-sm hover:text-mineral transition-colors">
        <MapPin className="h-4 w-4" aria-hidden /> City <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-surface border-linen min-w-[200px]">
        <DropdownMenuItem data-testid="nav-city-all" onSelect={() => nav("/discover")}>All cities</DropdownMenuItem>
        {cities.map((c) => (
          <DropdownMenuItem key={c} data-testid={`nav-city-${c.toLowerCase()}`} onSelect={() => nav(`/discover?city=${encodeURIComponent(c)}`)}>
            {c} {!meta?.cities_with_events?.includes(c) && <span className="ml-auto text-xs text-mineral">no listings yet</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ExperiencesMenu() {
  const { meta } = useMeta();
  const nav = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="nav-experiences" className="inline-flex items-center gap-1 text-sm link-u">
        Experiences <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-surface border-linen min-w-[220px]">
        {(meta?.categories || []).map((c) => (
          <DropdownMenuItem key={c} data-testid={`nav-category-${c}`} onSelect={() => nav(`/discover?category=${encodeURIComponent(c)}`)}>{c}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Nav() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > 240 && y > last + 4 ? true : y < last - 4 ? false : (h) => h);
      last = y;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);
  return (
    <motion.header animate={{ y: hidden && !searchOpen && !menuOpen ? "-100%" : "0%" }} transition={{ duration: 0.45, ease: EASE }}
      initial={{ y: "-100%" }} className={`sticky top-0 z-40 transition-[border-color,background-color,color] duration-500 border-b ${loc.pathname === "/" && !scrolled ? "bg-black text-parchment border-transparent dark-zone" : `bg-parchment/95 ${scrolled ? "border-linen" : "border-transparent"}`} no-print`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 bg-ink text-parchment px-3 py-2 z-50">Skip to content</a>
      <nav className="wrap flex items-center h-[72px] gap-8" aria-label="Primary">
        <Link to="/" data-testid="nav-logo-link" aria-label="TRAILRZ home"><Logo className="h-8 sm:h-9" plate /></Link>
        <div className="hidden lg:flex items-center gap-7 ml-4">
          <NavLink to="/discover" data-testid="nav-discover" className="text-sm link-u"><Scramble text="Discover" /></NavLink>
          <ExperiencesMenu />
          <NavLink to="/originals" data-testid="nav-originals" className="text-sm link-u"><Scramble text="TRAILRZ Originals" /></NavLink>
          <NavLink to="/about" data-testid="nav-about" className="text-sm link-u"><Scramble text="About" /></NavLink>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <div className="hidden md:block"><CityMenu /></div>
          <button data-testid="nav-search-button" onClick={() => setSearchOpen(true)} aria-label="Search" className="p-1 hover:text-mineral transition-colors"><Search className="h-5 w-5" /></button>
          <Link to="/my-tickets" data-testid="nav-my-passes" className="hidden sm:inline-flex items-center gap-2 text-sm border border-current px-4 h-10 hover:bg-beam hover:text-ink hover:border-beam transition-colors">
            <Ticket className="h-4 w-4" aria-hidden /> My Passes
          </Link>
          <button data-testid="nav-mobile-menu-button" className="lg:hidden p-1" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu className="h-6 w-6" /></button>
        </div>
      </nav>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </motion.header>
  );
}

function MobileMenu({ open, onOpenChange }) {
  const { meta } = useMeta();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-parchment w-full sm:max-w-md p-0 border-linen [&>button]:hidden">
        <div className="flex items-center justify-between px-6 h-[72px] border-b hairline">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Logo className="h-7" plate />
          <button data-testid="mobile-menu-close" aria-label="Close menu" onClick={() => onOpenChange(false)}><X className="h-6 w-6" /></button>
        </div>
        <div className="px-6 py-8 flex flex-col gap-1">
          {[...LINKS, { to: "/my-tickets", label: "My Passes" }].map((l, i) => (
            <motion.div key={l.to} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.07 }}>
              <Link to={l.to} data-testid={`mobile-nav-${l.label.toLowerCase().replace(/\s/g, "-")}`} className="font-display text-5xl py-2 block hover:italic hover:translate-x-2 transition-transform">{l.label}</Link>
            </motion.div>
          ))}
          <p className="eyebrow mt-10 mb-3">Cities</p>
          <div className="flex flex-wrap gap-2">
            {(meta?.supported_cities || []).map((c) => (
              <Link key={c} to={`/discover?city=${encodeURIComponent(c)}`} data-testid={`mobile-city-${c.toLowerCase()}`} className="border hairline px-3 py-2 text-sm">{c}</Link>
            ))}
          </div>
          <p className="eyebrow mt-8 mb-3">Experiences</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {(meta?.categories || []).map((c) => (
              <Link key={c} to={`/discover?category=${encodeURIComponent(c)}`} className="link-u">{c}</Link>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
