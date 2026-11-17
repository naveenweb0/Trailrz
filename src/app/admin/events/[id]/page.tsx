"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import CloudinaryImageUpload from "@/components/admin/CloudinaryImageUpload";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye,
} from "lucide-react";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [category, setCategory] = useState("Music");
  const [subcategory, setSubcategory] = useState("");
  const [eventType, setEventType] = useState("CURATED");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isOriginal, setIsOriginal] = useState(false);
  const [mood, setMood] = useState("Date Night");
  const [coverImage, setCoverImage] = useState("");

  // Location
  const [city, setCity] = useState("Chandigarh");
  const [venueName, setVenueName] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  // Schedule
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("07:00 PM");
  const [endTime, setEndTime] = useState("10:00 PM");

  // Details
  const [ageRestriction, setAgeRestriction] = useState("16+");
  const [artistInfo, setArtistInfo] = useState("");
  const [whatToExpect, setWhatToExpect] = useState("");
  const [highlightsInput, setHighlightsInput] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [entryInstructions, setEntryInstructions] = useState("");

  // Status
  const [status, setStatus] = useState("PUBLISHED");

  // Dynamic Ticket Types
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/admin/events/${eventId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Event not found");
        }

        const ev = data.event;
        setTitle(ev.title || "");
        setSlug(ev.slug || "");
        setShortDescription(ev.shortDescription || "");
        setFullDescription(ev.fullDescription || "");
        setCategory(ev.category || "Music");
        setSubcategory(ev.subcategory || "");
        setEventType(ev.eventType || "CURATED");
        setIsFeatured(Boolean(ev.isFeatured));
        setIsOriginal(Boolean(ev.isOriginal));
        setMood(ev.mood || "Date Night");
        setCoverImage(ev.coverImage || "");

        setCity(ev.city || "Chandigarh");
        setVenueName(ev.venueName || "");
        setFullAddress(ev.fullAddress || "");
        setGoogleMapsUrl(ev.googleMapsUrl || "");

        if (ev.eventDate) {
          setEventDate(new Date(ev.eventDate).toISOString().split("T")[0]);
        }
        setStartTime(ev.startTime || "");
        setEndTime(ev.endTime || "");

        setAgeRestriction(ev.ageRestriction || "16+");
        setArtistInfo(ev.artistInfo || "");
        setWhatToExpect(ev.whatToExpect || "");
        setCancellationPolicy(ev.cancellationPolicy || "");
        setEntryInstructions(ev.entryInstructions || "");
        setStatus(ev.status || "PUBLISHED");

        try {
          const parsedHighlights = JSON.parse(ev.highlights || "[]");
          setHighlightsInput(parsedHighlights.join("\n"));
        } catch {
          setHighlightsInput(ev.highlights || "");
        }

        setTicketTypes(
          ev.ticketTypes?.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description || "",
            priceRupees: Math.round(t.price / 100),
            quantityTotal: t.quantityTotal,
            quantitySold: t.quantitySold,
            maxPerBooking: t.maxPerBooking || 6,
            status: t.status,
          })) || []
        );
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load event.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleAddTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        name: "Custom Pass",
        description: "",
        priceRupees: 599,
        quantityTotal: 30,
        quantitySold: 0,
        maxPerBooking: 4,
        status: "ACTIVE",
      },
    ]);
  };

  const handleTicketTypeChange = (index: number, field: string, val: any) => {
    setTicketTypes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const highlights = highlightsInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedTicketTypes = ticketTypes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        price: Math.round(Number(t.priceRupees) * 100),
        quantityTotal: Number(t.quantityTotal),
        status: t.status || "ACTIVE",
      }));

      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortDescription,
          fullDescription,
          category,
          subcategory,
          eventType,
          isFeatured,
          isOriginal: isOriginal || eventType === "TRAILRZ_ORIGINAL",
          mood,
          coverImage,
          city,
          venueName,
          fullAddress,
          googleMapsUrl,
          eventDate,
          startTime,
          endTime,
          ageRestriction,
          highlights,
          whatToExpect,
          artistInfo,
          cancellationPolicy,
          entryInstructions,
          status,
          ticketTypes: formattedTicketTypes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update event.");
      }

      setSuccessMessage("Experience updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save event updates.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 rounded-full border-4 border-trailrz-red border-t-transparent animate-spin mx-auto mb-2" />
        <p className="text-xs text-white/50">Loading experience details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a
            href="/admin/events"
            className="p-2 rounded-xl bg-neutral-900 border border-white/10 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="font-editorial text-2xl font-bold text-white">
              Edit Experience: {title}
            </h1>
            <p className="text-xs text-white/50 font-mono">/{slug}</p>
          </div>
        </div>

        {slug && (
          <a
            href={`/events/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center space-x-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Public Page</span>
          </a>
        )}
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-neutral-900 border border-white/10 p-6 sm:p-8 rounded-3xl">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            1. Basic Information
          </h3>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              >
                <option value="Music">Music</option>
                <option value="Food">Food & Tasting</option>
                <option value="Comedy">Comedy</option>
                <option value="Art & Culture">Art & Culture</option>
                <option value="Workshops">Workshops</option>
                <option value="Nightlife">Nightlife</option>
                <option value="Outdoor">Outdoor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              >
                <option value="TRAILRZ_ORIGINAL">Trailrz Original</option>
                <option value="CURATED">Curated Experience</option>
                <option value="PARTNER">Partner Event</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 text-xs font-bold text-white cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded bg-neutral-800 border-white/20 text-trailrz-red focus:ring-0"
              />
              <span>Featured Experience</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-bold text-white cursor-pointer">
              <input
                type="checkbox"
                checked={isOriginal}
                onChange={(e) => setIsOriginal(e.target.checked)}
                className="rounded bg-neutral-800 border-white/20 text-trailrz-red focus:ring-0"
              />
              <span>Trailrz Original Production</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Short Description *
            </label>
            <input
              type="text"
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Full Description *
            </label>
            <textarea
              required
              rows={5}
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>

          <CloudinaryImageUpload
            value={coverImage}
            onChange={setCoverImage}
            label="Event Cover Image"
            required
          />
        </div>

        {/* Location & Schedule */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            2. Location & Timings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                City *
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              >
                <option value="Chandigarh">Chandigarh</option>
                <option value="Mohali">Mohali</option>
                <option value="Panchkula">Panchkula</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Bengaluru">Bengaluru</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Venue Name *
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Full Address *
            </label>
            <input
              type="text"
              required
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Event Date *
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Start Time *
              </label>
              <input
                type="text"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                End Time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>
        </div>

        {/* Ticket Types */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-editorial text-lg font-bold text-white">
              3. Ticket Types & Allocation
            </h3>
            <button
              type="button"
              onClick={handleAddTicketType}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tier</span>
            </button>
          </div>

          <div className="space-y-3">
            {ticketTypes.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-4 rounded-2xl bg-neutral-800/80 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-trailrz-red uppercase tracking-wider">
                    Tier: {t.name} (Sold: {t.quantitySold || 0})
                  </span>
                  <select
                    value={t.status}
                    onChange={(e) => handleTicketTypeChange(idx, "status", e.target.value)}
                    className="px-2 py-1 rounded-lg bg-neutral-900 text-[10px] font-bold text-white focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SOLD_OUT">SOLD OUT</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                      Tier Name
                    </label>
                    <input
                      type="text"
                      required
                      value={t.name}
                      onChange={(e) => handleTicketTypeChange(idx, "name", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                      Price (₹ INR)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={t.priceRupees}
                      onChange={(e) => handleTicketTypeChange(idx, "priceRupees", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                      Total Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={t.quantitySold || 1}
                      value={t.quantityTotal}
                      onChange={(e) => handleTicketTypeChange(idx, "quantityTotal", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                    Perks & Details
                  </label>
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) => handleTicketTypeChange(idx, "description", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-white/80 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white font-bold focus:outline-none focus:border-trailrz-red"
          >
            <option value="PUBLISHED">PUBLISHED (Live)</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SOLD_OUT">SOLD OUT</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <a
            href="/admin/events"
            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-trailrz-red hover:bg-trailrz-red-hover text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-lg shadow-trailrz-red/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Update Experience"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
