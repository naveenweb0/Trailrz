"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Ticket,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Download,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatEventDate } from "@/lib/utils";

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number; // in paise
  quantityTotal: number;
  quantitySold: number;
  availableQuantity: number;
  maxPerBooking: number;
  minPerBooking: number;
  status: string;
}

interface EventData {
  id: string;
  title: string;
  slug: string;
  city: string;
  venueName: string;
  fullAddress: string;
  eventDate: Date | string;
  startTime: string;
  coverImage: string;
  ticketTypes: TicketType[];
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData;
}

export default function BookingModal({ isOpen, onClose, event }: BookingModalProps) {
  // Step State: 1 = Ticket Selection, 2 = Customer Info, 3 = Order Summary, 4 = Processing, 5 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Ticket quantities map: { [ticketTypeId]: number }
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  // Customer Details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attendeeNames, setAttendeeNames] = useState<string[]>([]);

  // Reservation details from server
  const [reservationToken, setReservationToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600);
  const [orderBreakdown, setOrderBreakdown] = useState<{
    subtotal: number;
    convenienceFee: number;
    taxAmount: number;
    totalAmount: number;
  } | null>(null);

  // Confirmed booking outcome
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [confirmedTickets, setConfirmedTickets] = useState<any[]>([]);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize quantities when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMessage("");
      const initial: Record<string, number> = {};
      event.ticketTypes.forEach((t, idx) => {
        // Select 1 for first available ticket type by default
        initial[t.id] = idx === 0 && t.availableQuantity > 0 ? 1 : 0;
      });
      setQuantities(initial);
    }
  }, [isOpen, event]);

  // Countdown timer for active reservation
  useEffect(() => {
    if (!expiresAt || step >= 5) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setErrorMessage("Your 10-minute reservation has expired. Please select your tickets again.");
        setStep(1);
        setReservationToken(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, step]);

  if (!isOpen) return null;

  // Compute total selected ticket count
  const totalTicketsSelected = Object.values(quantities).reduce((a, b) => a + b, 0);

  // Calculate live subtotal
  const liveSubtotal = Object.entries(quantities).reduce((sum, [tId, qty]) => {
    const t = event.ticketTypes.find((x) => x.id === tId);
    return sum + (t ? t.price * qty : 0);
  }, 0);

  const handleQuantityChange = (ticketTypeId: string, delta: number) => {
    const current = quantities[ticketTypeId] || 0;
    const target = event.ticketTypes.find((t) => t.id === ticketTypeId);
    if (!target) return;

    const nextQty = Math.max(0, current + delta);
    if (nextQty > target.availableQuantity) {
      setErrorMessage(`Only ${target.availableQuantity} tickets remaining for ${target.name}.`);
      return;
    }
    if (nextQty > target.maxPerBooking) {
      setErrorMessage(`Maximum limit is ${target.maxPerBooking} tickets per booking.`);
      return;
    }

    setErrorMessage("");
    setQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: nextQty,
    }));
  };

  // STEP 1 -> STEP 2: Reserve Inventory
  const handleProceedToDetails = async () => {
    if (totalTicketsSelected <= 0) {
      setErrorMessage("Please select at least 1 ticket to continue.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

      const res = await fetch("/api/checkout/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reserve tickets.");
      }

      setReservationToken(data.reservationToken);
      setExpiresAt(new Date(data.expiresAt));
      setOrderBreakdown(data.breakdown);

      // Pre-fill attendee array
      const attendees = Array(totalTicketsSelected).fill("");
      if (fullName) attendees[0] = fullName;
      setAttendeeNames(attendees);

      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reserve inventory.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 -> STEP 3: Validate Customer & View Summary
  const handleProceedToSummary = () => {
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setErrorMessage("Please provide a valid email address.");
      return;
    }
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setErrorMessage("");
    setStep(3);
  };

  // STEP 3 -> STEP 4: Create Order & Trigger Razorpay
  const handlePay = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Create order on server
      const orderRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationToken,
          eventId: event.id,
          customer: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
          attendeeNames,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initialize payment.");
      }

      // If it's a free event with ₹0 amount, confirm directly
      if (orderData.isFree) {
        const verifyRes = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingReference: orderData.bookingReference,
            paymentMethod: "Free Pass",
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Failed to confirm free booking.");
        }
        setConfirmedBooking(verifyData.booking);
        setConfirmedTickets(verifyData.tickets);
        setStep(5);
        return;
      }

      // Check if real Razorpay script is in window, else run simulated checkout
      const isRazorpayScriptLoaded = typeof (window as any).Razorpay !== "undefined";

      if (isRazorpayScriptLoaded && !orderData.isMock) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: "INR",
          name: "TRAILRZ Experiences",
          description: event.title,
          order_id: orderData.orderId,
          prefill: {
            name: fullName,
            email: email,
            contact: phone,
          },
          theme: {
            color: "#E53935",
          },
          handler: async function (response: any) {
            setStep(4);
            try {
              const verifyRes = await fetch("/api/checkout/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  bookingReference: orderData.bookingReference,
                  paymentMethod: "Razorpay",
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || "Verification failed");
              }
              setConfirmedBooking(verifyData.booking);
              setConfirmedTickets(verifyData.tickets);
              setStep(5);
            } catch (vErr: any) {
              setErrorMessage(vErr.message || "Payment verification failed.");
              setStep(3);
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Test / Sandbox simulated payment flow
        setStep(4);
        setTimeout(async () => {
          try {
            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: orderData.orderId,
                paymentId: `pay_sim_${Date.now()}`,
                signature: `sig_mock_${Math.random().toString(36).substring(2)}`,
                bookingReference: orderData.bookingReference,
                paymentMethod: "UPI / Razorpay Test",
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Verification failed");
            }
            setConfirmedBooking(verifyData.booking);
            setConfirmedTickets(verifyData.tickets);
            setStep(5);
          } catch (vErr: any) {
            setErrorMessage(vErr.message || "Simulated payment verification failed.");
            setStep(3);
          }
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Payment initialization failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-trailrz-grey-border overflow-hidden my-6">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-trailrz-black text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-6 h-6 rounded bg-trailrz-red text-white flex items-center justify-center font-bold text-xs">
              T
            </span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-white/60 font-semibold">
                {step === 5 ? "Booking Confirmed" : "Ticket Checkout"}
              </span>
              <span className="text-sm font-bold truncate max-w-xs sm:max-w-md">
                {event.title}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {reservationToken && step < 5 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs font-mono text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(timeLeftSeconds / 60)}:
                  {(timeLeftSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 text-white/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Indicator (Steps 1 to 3) */}
        {step < 5 && (
          <div className="px-6 py-3 bg-trailrz-ivory border-b border-trailrz-grey-border/80 flex items-center justify-between text-xs font-semibold">
            <div className={`flex items-center space-x-1.5 ${step === 1 ? "text-trailrz-red font-bold" : "text-trailrz-black"}`}>
              <span className="w-5 h-5 rounded-full bg-trailrz-red text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Tickets</span>
            </div>
            <span className="text-trailrz-grey">→</span>
            <div className={`flex items-center space-x-1.5 ${step === 2 ? "text-trailrz-red font-bold" : "text-trailrz-grey"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? "bg-trailrz-red text-white" : "bg-trailrz-grey-light text-trailrz-grey"}`}>
                2
              </span>
              <span>Details</span>
            </div>
            <span className="text-trailrz-grey">→</span>
            <div className={`flex items-center space-x-1.5 ${step === 3 ? "text-trailrz-red font-bold" : "text-trailrz-grey"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? "bg-trailrz-red text-white" : "bg-trailrz-grey-light text-trailrz-grey"}`}>
                3
              </span>
              <span>Payment</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-trailrz-red" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: SELECT TICKETS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-trailrz-grey pb-2 border-b border-trailrz-grey-border">
                <span>Select ticket categories</span>
                <span>Max 6 tickets per order</span>
              </div>

              <div className="space-y-3">
                {event.ticketTypes.map((t) => {
                  const qty = quantities[t.id] || 0;
                  const isSoldOut = t.availableQuantity <= 0 || t.status === "SOLD_OUT";

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        qty > 0
                          ? "border-trailrz-red bg-trailrz-red-light/30 shadow-sm"
                          : isSoldOut
                          ? "border-trailrz-grey-border bg-trailrz-grey-light/30 opacity-60"
                          : "border-trailrz-grey-border hover:border-trailrz-grey bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-trailrz-black">
                            {t.name}
                          </span>
                          {isSoldOut ? (
                            <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600 text-[10px] font-bold uppercase">
                              Sold Out
                            </span>
                          ) : t.availableQuantity <= 5 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Only {t.availableQuantity} left!
                            </span>
                          ) : null}
                        </div>
                        {t.description && (
                          <p className="text-xs text-trailrz-grey mt-0.5 max-w-sm">
                            {t.description}
                          </p>
                        )}
                        <div className="text-sm font-extrabold text-trailrz-red mt-1">
                          {t.price > 0 ? formatCurrency(t.price) : "Free Pass"}
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={qty <= 0 || isSoldOut}
                          onClick={() => handleQuantityChange(t.id, -1)}
                          className="w-8 h-8 rounded-full border border-trailrz-grey-border bg-white text-trailrz-black font-bold flex items-center justify-center hover:bg-trailrz-ivory disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-trailrz-black">
                          {qty}
                        </span>
                        <button
                          type="button"
                          disabled={isSoldOut || qty >= t.availableQuantity || qty >= t.maxPerBooking}
                          onClick={() => handleQuantityChange(t.id, 1)}
                          className="w-8 h-8 rounded-full border border-trailrz-grey-border bg-white text-trailrz-black font-bold flex items-center justify-center hover:bg-trailrz-ivory disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 1 Footer */}
              <div className="pt-4 border-t border-trailrz-grey-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-trailrz-grey">Subtotal ({totalTicketsSelected} tickets)</div>
                  <div className="text-lg font-extrabold text-trailrz-black">
                    {formatCurrency(liveSubtotal)}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={totalTicketsSelected <= 0 || loading}
                  onClick={handleProceedToDetails}
                  className="px-6 py-3 rounded-xl bg-trailrz-black text-white font-bold text-sm hover:bg-trailrz-red disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                >
                  <span>{loading ? "Checking Inventory..." : "Continue"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER DETAILS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-trailrz-ivory text-xs text-trailrz-black border border-trailrz-grey-border/80 flex items-center justify-between">
                <span>Inventory temporarily reserved for 10 minutes</span>
                <span className="font-mono font-bold text-trailrz-red">
                  {Math.floor(timeLeftSeconds / 60)}:
                  {(timeLeftSeconds % 60).toString().padStart(2, "0")} remaining
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-trailrz-black mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-trailrz-grey-border text-sm text-trailrz-black focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-trailrz-black mb-1">
                      Email Address * (For Tickets)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="aarav@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-trailrz-grey-border text-sm text-trailrz-black focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-trailrz-black mb-1">
                      Mobile Number * (For WhatsApp Ticket)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-semibold text-trailrz-grey">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-trailrz-grey-border text-sm text-trailrz-black focus:outline-none focus:ring-2 focus:ring-trailrz-red/30 focus:border-trailrz-red"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Attendee Names if multiple tickets */}
                {totalTicketsSelected > 1 && (
                  <div className="pt-2 border-t border-trailrz-grey-border">
                    <span className="text-xs font-bold text-trailrz-grey uppercase tracking-wider block mb-2">
                      Guest Attendee Names (Optional)
                    </span>
                    <div className="space-y-2">
                      {Array.from({ length: totalTicketsSelected - 1 }).map((_, idx) => (
                        <input
                          key={idx}
                          type="text"
                          placeholder={`Guest ${idx + 2} Full Name`}
                          value={attendeeNames[idx + 1] || ""}
                          onChange={(e) => {
                            const updated = [...attendeeNames];
                            updated[idx + 1] = e.target.value;
                            setAttendeeNames(updated);
                          }}
                          className="w-full px-3.5 py-2 rounded-lg border border-trailrz-grey-border text-xs text-trailrz-black focus:outline-none focus:border-trailrz-red"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 Footer */}
              <div className="pt-4 border-t border-trailrz-grey-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-trailrz-grey-border text-xs font-bold text-trailrz-black hover:bg-trailrz-ivory transition-colors flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToSummary}
                  className="px-6 py-3 rounded-xl bg-trailrz-black text-white font-bold text-sm hover:bg-trailrz-red transition-all flex items-center space-x-2"
                >
                  <span>Review Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ORDER SUMMARY & PAYMENT BREAKDOWN */}
          {step === 3 && orderBreakdown && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-trailrz-ivory border border-trailrz-grey-border space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-sm text-trailrz-black pb-2 border-b border-trailrz-grey-border/60">
                  <span>{event.title}</span>
                  <span className="text-trailrz-red font-mono">
                    {totalTicketsSelected} Pass(es)
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-trailrz-grey">
                  <Calendar className="w-3.5 h-3.5 text-trailrz-red" />
                  <span>
                    {formatEventDate(event.eventDate)} at {event.startTime}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-trailrz-grey">
                  <MapPin className="w-3.5 h-3.5 text-trailrz-red" />
                  <span>
                    {event.venueName}, {event.city}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="p-4 rounded-2xl border border-trailrz-grey-border space-y-2.5 text-xs text-trailrz-black">
                <div className="font-bold uppercase tracking-wider text-trailrz-grey text-[10px] pb-1 border-b border-trailrz-grey-border">
                  Payment Summary
                </div>

                <div className="flex justify-between">
                  <span className="text-trailrz-grey">Tickets Subtotal</span>
                  <span className="font-semibold">{formatCurrency(orderBreakdown.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-trailrz-grey">Convenience Fee</span>
                  <span className="font-semibold">
                    {formatCurrency(orderBreakdown.convenienceFee)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-trailrz-grey">GST on Convenience Fee (18%)</span>
                  <span className="font-semibold">{formatCurrency(orderBreakdown.taxAmount)}</span>
                </div>

                <div className="pt-2 border-t border-trailrz-grey-border flex justify-between text-base font-extrabold text-trailrz-black">
                  <span>Total Payable</span>
                  <span className="text-trailrz-red">
                    {formatCurrency(orderBreakdown.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-trailrz-grey">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Encrypted server-side checkout with verified Razorpay payment signature & instant QR issuance.
                </span>
              </div>

              {/* Step 3 Footer */}
              <div className="pt-4 border-t border-trailrz-grey-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-trailrz-grey-border text-xs font-bold text-trailrz-black hover:bg-trailrz-ivory transition-colors flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handlePay}
                  className="px-8 py-3 rounded-xl bg-trailrz-red text-white font-extrabold text-sm hover:bg-trailrz-red-hover shadow-lg shadow-trailrz-red/20 transition-all flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{loading ? "Processing..." : `Pay ${formatCurrency(orderBreakdown.totalAmount)}`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PROCESSING STATE */}
          {step === 4 && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-trailrz-red border-t-transparent animate-spin" />
              <div className="font-bold text-lg text-trailrz-black">
                Confirming Your Experience...
              </div>
              <p className="text-xs text-trailrz-grey max-w-sm mx-auto">
                Verifying bank transaction signature, securing inventory, and generating your unique digital QR tickets. Please do not close this window.
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION ("YOU'RE ON THE LIST!") */}
          {step === 5 && confirmedBooking && (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl font-extrabold text-trailrz-black">
                  You’re on the list!
                </h2>
                <p className="text-xs sm:text-sm text-trailrz-grey">
                  Your booking is verified and confirmed. Digital passes have been generated below and dispatched to your email & WhatsApp.
                </p>
              </div>

              {/* Booking Reference Pill */}
              <div className="p-3 rounded-xl bg-trailrz-ivory border border-trailrz-grey-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-trailrz-grey block text-[10px] uppercase font-bold">
                    Booking Reference
                  </span>
                  <span className="font-mono font-extrabold text-trailrz-black text-sm">
                    {confirmedBooking.reference}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-trailrz-grey block text-[10px] uppercase font-bold">
                    Status
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Confirmed & Paid
                  </span>
                </div>
              </div>

              {/* Digital Tickets Container */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-trailrz-grey">
                  Your Digital Tickets ({confirmedTickets.length})
                </div>

                {confirmedTickets.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="relative bg-white rounded-2xl border-2 border-trailrz-black p-4 overflow-hidden shadow-md flex flex-col sm:flex-row items-center gap-4"
                  >
                    {/* QR Code */}
                    <div className="w-32 h-32 flex-shrink-0 bg-white p-1 rounded-xl border border-trailrz-grey-border flex items-center justify-center">
                      {t.qrPayload ? (
                        <img
                          src={t.qrPayload}
                          alt="Ticket QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-[10px] text-trailrz-grey">QR Code</div>
                      )}
                    </div>

                    {/* Ticket Details */}
                    <div className="space-y-1.5 text-center sm:text-left flex-grow">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-trailrz-red font-bold">
                        {t.ticketNumber}
                      </div>
                      <h4 className="font-bold text-base text-trailrz-black leading-snug">
                        {event.title}
                      </h4>
                      <div className="text-xs text-trailrz-grey">
                        Attendee: <strong className="text-trailrz-black">{t.attendeeName}</strong>
                      </div>
                      <div className="text-xs text-trailrz-grey">
                        Tier: <span className="font-semibold text-trailrz-black">{t.ticketType?.name || "General Pass"}</span>
                      </div>
                      <div className="text-[11px] text-trailrz-grey">
                        {formatEventDate(event.eventDate)} • {event.startTime} • {event.venueName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 rounded-xl border border-trailrz-black text-trailrz-black font-bold text-xs hover:bg-trailrz-ivory transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print Passes</span>
                </button>

                <a
                  href={`/my-tickets?ref=${confirmedBooking.reference}&email=${encodeURIComponent(
                    email
                  )}`}
                  className="flex-1 py-3 rounded-xl bg-trailrz-black text-white font-bold text-xs hover:bg-trailrz-red text-center transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>View in My Tickets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
