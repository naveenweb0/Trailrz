import React from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { ShieldCheck, RefreshCw, FileText } from "lucide-react";

export default function PoliciesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-trailrz-ivory">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="space-y-12 bg-white rounded-3xl border border-trailrz-grey-border p-8 sm:p-12 shadow-sm">
          {/* Header */}
          <div className="border-b border-trailrz-grey-border pb-6">
            <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold text-trailrz-black">
              Policies & Customer Terms
            </h1>
            <p className="text-xs sm:text-sm text-trailrz-grey mt-2">
              Transparent ticketing guidelines for all TRAILRZ curated experiences across India.
            </p>
          </div>

          {/* Cancellation & Refund Policy */}
          <section id="cancellation" className="space-y-4">
            <div className="flex items-center space-x-2 text-trailrz-red">
              <RefreshCw className="w-5 h-5" />
              <h2 className="font-editorial text-2xl font-bold text-trailrz-black">
                Cancellation & Refund Policy
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-trailrz-black/80 space-y-3 leading-relaxed">
              <p>
                At TRAILRZ, we want your ticket booking journey to be seamless and flexible. Because our curated experiences have strictly capped seating and artisanal ingredients prepared in advance:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-trailrz-grey">
                <li>
                  <strong>48+ Hours Before Event:</strong> 100% full refund back to original payment method.
                </li>
                <li>
                  <strong>24 to 48 Hours Before Event:</strong> 50% refund.
                </li>
                <li>
                  <strong>Within 24 Hours of Event:</strong> Non-refundable, as venue seating and artist arrangements are finalized.
                </li>
                <li>
                  <strong>Event Rescheduled or Cancelled by Organizer:</strong> 100% automatic refund or priority pass to the rescheduled date.
                </li>
              </ul>
              <p>
                Refunds initiated through Razorpay typically reflect in your bank account or UPI source within 5–7 business days.
              </p>
            </div>
          </section>

          {/* Terms & Conditions */}
          <section id="terms" className="space-y-4 pt-6 border-t border-trailrz-grey-border">
            <div className="flex items-center space-x-2 text-trailrz-red">
              <FileText className="w-5 h-5" />
              <h2 className="font-editorial text-2xl font-bold text-trailrz-black">
                Terms & Conditions
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-trailrz-black/80 space-y-3 leading-relaxed">
              <p>
                1. <strong>Digital Passes:</strong> Entry is strictly granted upon scanning a valid TRAILRZ QR ticket pass. Duplicate or tampered QR codes will be rejected by our gate check-in systems.
              </p>
              <p>
                2. <strong>Admission & Conduct:</strong> The organizer and venue hold the right of admission. Unruly behavior or breach of age limits will result in entry denial without refund.
              </p>
              <p>
                3. <strong>Timings:</strong> Venue gates open 30 minutes before the listed start time. To avoid disturbing acoustic and intimate candlelight performances, late entries may be held until an intermission.
              </p>
            </div>
          </section>

          {/* Privacy Policy */}
          <section id="privacy" className="space-y-4 pt-6 border-t border-trailrz-grey-border">
            <div className="flex items-center space-x-2 text-trailrz-red">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-editorial text-2xl font-bold text-trailrz-black">
                Privacy Policy
              </h2>
            </div>
            <div className="text-xs sm:text-sm text-trailrz-black/80 space-y-3 leading-relaxed">
              <p>
                TRAILRZ values your privacy. We never require customer account registrations to purchase tickets. We collect only your Name, Email, and Phone solely for ticket delivery, verification, and critical updates regarding your booked experience.
              </p>
              <p>
                Payment processing is handled directly via Razorpay’s PCI-DSS compliant infrastructure. TRAILRZ never stores your credit card, debit card, or UPI PIN credentials.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
