"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import CloudinaryImageUpload from "@/components/admin/CloudinaryImageUpload";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
  const [highlightsInput, setHighlightsInput] = useState(
    "Intimate acoustic performance\nWelcome artisan brew included\nSeated candlelight ambiance"
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    "Free cancellation up to 48 hours before the event start time."
  );
  const [entryInstructions, setEntryInstructions] = useState(
    "Present your digital QR ticket at the gate for instant wristband check-in."
  );

  // Status
  const [status, setStatus] = useState("PUBLISHED");

  // Dynamic Ticket Types
  const [ticketTypes, setTicketTypes] = useState([
    {
      name: "General Admission",
      description: "Standard Entry Pass",
      priceRupees: 499,
      quantityTotal: 50,
      maxPerBooking: 6,
    },
    {
      name: "VIP Pass",
      description: "Front-row seating & welcome beverage",
      priceRupees: 899,
      quantityTotal: 20,
      maxPerBooking: 4,
    },
  ]);

  const handleAddTicketType = () => {
    setTicketTypes((prev) => [
      ...prev,
      {
        name: "Custom Pass",
        description: "",
        priceRupees: 599,
        quantityTotal: 30,
        maxPerBooking: 4,
      },
    ]);
  };

  const handleRemoveTicketType = (index: number) => {
    setTicketTypes((prev) => prev.filter((_, i) => i !== index));
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
    setLoading(true);
    setErrorMessage("");

    try {
      if (!title || !shortDescription || !fullDescription || !venueName || !fullAddress || !eventDate) {
        throw new Error("Please fill in all required fields marked with *");
      }

      const highlights = highlightsInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedTicketTypes = ticketTypes.map((t) => ({
        name: t.name,
        description: t.description,
        price: Math.round(Number(t.priceRupees) * 100), // convert to paise
        quantityTotal: Number(t.quantityTotal),
        maxPerBooking: Number(t.maxPerBooking),
        status: "ACTIVE",
      }));

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || undefined,
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
        throw new Error(data.error || "Failed to create event.");
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
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
              Curate New Experience
            </h1>
            <p className="text-xs text-white/50">
              Configure event details, ticket tiers, venue, and live publishing status.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-trailrz-red flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-8 bg-neutral-900 border border-white/10 p-6 sm:p-8 rounded-3xl">
        {/* Section 1: Basic Information */}
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
              placeholder="e.g. Chai & Chords — Sunset Acoustic Sanctuary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Custom URL Slug (Optional)
              </label>
              <input
                type="text"
                placeholder="auto-generated-from-title"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-trailrz-red"
              />
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => {
                  setEventType(e.target.value);
                  if (e.target.value === "TRAILRZ_ORIGINAL") setIsOriginal(true);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              >
                <option value="TRAILRZ_ORIGINAL">Trailrz Original</option>
                <option value="CURATED">Curated Experience</option>
                <option value="PARTNER">Partner Event</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Mood / Vibe
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              >
                <option value="Date Night">Date Night</option>
                <option value="Friends Night">Friends Night</option>
                <option value="Something Different">Something Different</option>
                <option value="Music & Rhythm">Music & Rhythm</option>
                <option value="Food Lovers">Food Lovers</option>
                <option value="Creative Minds">Creative Minds</option>
                <option value="Weekend Plans">Weekend Plans</option>
              </select>
            </div>

            <div className="flex items-center space-x-4 pt-6">
              <label className="flex items-center space-x-2 text-xs font-bold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded bg-neutral-800 border-white/20 text-trailrz-red focus:ring-0"
                />
                <span>Featured Event</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-bold text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOriginal}
                  onChange={(e) => setIsOriginal(e.target.checked)}
                  className="rounded bg-neutral-800 border-white/20 text-trailrz-red focus:ring-0"
                />
                <span>Original Badge</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Short Description * (Max 2 sentences)
            </label>
            <input
              type="text"
              required
              placeholder="An intimate evening of indie melodies, artisanal Kashmiri Kahwa, and warm storytelling..."
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
              placeholder="Detailed description of the experience..."
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

        {/* Section 2: Location & Schedule */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            2. Location & Schedule
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
                placeholder="The Courtyard Cafe, Sector 10"
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
              placeholder="SCO 42, Inner Courtyard, Sector 10-D, Chandigarh, 160011"
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
                placeholder="07:00 PM"
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
                placeholder="10:00 PM"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Ticket Types Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h3 className="font-editorial text-lg font-bold text-white">
                3. Ticket Types & Inventory
              </h3>
              <p className="text-[11px] text-white/50">
                Configure multiple ticket categories. Inventory is strictly tracked to prevent overselling.
              </p>
            </div>

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
                key={idx}
                className="p-4 rounded-2xl bg-neutral-800/80 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-trailrz-red uppercase tracking-wider">
                    Tier #{idx + 1}
                  </span>
                  {ticketTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTicketType(idx)}
                      className="text-white/40 hover:text-trailrz-red transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                      Tier Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Early Bird"
                      value={t.name}
                      onChange={(e) => handleTicketTypeChange(idx, "name", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                      Price (₹ INR) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="499"
                      value={t.priceRupees}
                      onChange={(e) => handleTicketTypeChange(idx, "priceRupees", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                      Total Inventory *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="50"
                      value={t.quantityTotal}
                      onChange={(e) => handleTicketTypeChange(idx, "quantityTotal", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-white/60 mb-1">
                    Description / Perks
                  </label>
                  <input
                    type="text"
                    placeholder="Includes 1 complimentary artisan brew and table access"
                    value={t.description}
                    onChange={(e) => handleTicketTypeChange(idx, "description", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Highlights & Rules */}
        <div className="space-y-4">
          <h3 className="font-editorial text-lg font-bold text-white border-b border-white/10 pb-2">
            4. Details, Artists & Highlights
          </h3>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Experience Highlights (One bullet per line)
            </label>
            <textarea
              rows={3}
              value={highlightsInput}
              onChange={(e) => setHighlightsInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Featured Artists / Curators
              </label>
              <input
                type="text"
                placeholder="Kabir Dev (Indie-folk) and Rhea Mehta"
                value={artistInfo}
                onChange={(e) => setArtistInfo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                Age Restriction
              </label>
              <input
                type="text"
                placeholder="16+"
                value={ageRestriction}
                onChange={(e) => setAgeRestriction(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white focus:outline-none focus:border-trailrz-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">
              Publishing Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-sm text-white focus:outline-none focus:border-trailrz-red font-bold"
            >
              <option value="PUBLISHED">Published (Immediately live for bookings)</option>
              <option value="DRAFT">Draft (Saved privately)</option>
            </select>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <a
            href="/admin/events"
            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/80 hover:bg-white/5 transition-colors"
          >
            Cancel
          </a>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-trailrz-red hover:bg-trailrz-red-hover text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-lg shadow-trailrz-red/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Saving Experience..." : "Publish Experience"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
