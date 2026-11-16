import React from "react";
import { Instagram, Mail, Phone, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-trailrz-black text-white pt-16 pb-12 border-t border-trailrz-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-trailrz-red text-white flex items-center justify-center font-bold text-lg tracking-wider">
                T
              </span>
              <span className="font-extrabold text-2xl tracking-[0.2em] text-white font-editorial">
                TRAILRZ
              </span>
            </div>
            <p className="text-sm text-white/70 max-w-sm leading-relaxed">
              Not just another plan. A better story. Discover handpicked concerts, candlelight
              acoustics, secret culinary tastings, and exclusive Trailrz Originals across India.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <a
                href="https://instagram.com/trailrz"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-trailrz-red flex items-center justify-center transition-colors text-white"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-600 flex items-center justify-center transition-colors text-white"
                title="WhatsApp Concierge"
              >
                <Phone className="w-4 h-4" />
              </a>
              <a
                href="mailto:care@trailrz.com"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-trailrz-red flex items-center justify-center transition-colors text-white"
                title="Email Support"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Discover */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-trailrz-red">
              Experiences
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/discover?original=true" className="hover:text-white transition-colors flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-trailrz-red" />
                  <span>Trailrz Originals</span>
                </a>
              </li>
              <li>
                <a href="/discover?category=Music" className="hover:text-white transition-colors">
                  Live Music & Acoustic
                </a>
              </li>
              <li>
                <a href="/discover?category=Food" className="hover:text-white transition-colors">
                  Supper Clubs & Food
                </a>
              </li>
              <li>
                <a href="/discover?category=Comedy" className="hover:text-white transition-colors">
                  Stand-Up Comedy
                </a>
              </li>
              <li>
                <a href="/discover?category=Workshops" className="hover:text-white transition-colors">
                  Pottery & Workshops
                </a>
              </li>
              <li>
                <a href="/discover?category=Nightlife" className="hover:text-white transition-colors">
                  Rooftop & Vinyl
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Cities */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-white/90">
              Cities
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/discover?city=Chandigarh" className="hover:text-white transition-colors">
                  Chandigarh
                </a>
              </li>
              <li>
                <a href="/discover?city=Mohali" className="hover:text-white transition-colors">
                  Mohali
                </a>
              </li>
              <li>
                <a href="/discover?city=Panchkula" className="hover:text-white transition-colors">
                  Panchkula
                </a>
              </li>
              <li>
                <a href="/discover?city=Delhi+NCR" className="hover:text-white transition-colors">
                  Delhi NCR
                </a>
              </li>
              <li>
                <a href="/discover?city=Mumbai" className="hover:text-white transition-colors">
                  Mumbai
                </a>
              </li>
              <li>
                <a href="/discover?city=Bengaluru" className="hover:text-white transition-colors">
                  Bengaluru
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Support */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-white/90">
              Help & Policies
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="/my-tickets" className="hover:text-white transition-colors font-medium text-white">
                  My Tickets Lookup
                </a>
              </li>
              <li>
                <a href="/policies#cancellation" className="hover:text-white transition-colors">
                  Cancellation & Refunds
                </a>
              </li>
              <li>
                <a href="/policies#terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="/policies#privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="mailto:care@trailrz.com" className="hover:text-white transition-colors">
                  Contact Concierge
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>100% Verified Bookings & Instant Digital Tickets. Official Razorpay Partner.</span>
          </div>
          <div>
            © {new Date().getFullYear()} Trailrz Experiences Pvt. Ltd. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
