# TRAILRZ — Curated Experiences & Live Event Discovery Platform

> **"Life is happening. Go be part of it."**

TRAILRZ is an India-focused curated experiences platform inspired by Fever, featuring a signature warm ivory, deep black, and cinematic red editorial identity. The platform connects discovery seekers with intimate acoustic sessions, candlelight concerts, secret supper clubs, stand-up comedy, and exclusive in-house **Trailrz Originals**.

---

## Architecture Overview

TRAILRZ is built with **exactly two major interfaces connected to ONE central database and backend**:

1. **Public Website:** For customers to discover experiences, filter by mood/city/date/category, reserve passes, and checkout seamlessly without needing to create an account.
2. **Admin Portal (`/admin`):** Complete operations hub for the Trailrz team to curate events, manage ticket categories and inventory, monitor bookings, process gateway refunds, dispatch notifications, run gate check-in scanners, and analyze net collections.

---

## Technology Stack

- **Framework:** Next.js (App Router, Server Actions, Dynamic Route Handlers)
- **Language:** TypeScript
- **Styling & Design System:** Tailwind CSS, Framer Motion, Lucide Icons, Warm Ivory (`#F7F3EB`), Deep Black (`#111111`), Cinematic Red (`#E53935`)
- **Database & ORM:** PostgreSQL schema with Prisma ORM (SQLite zero-config local development included)
- **Payment Gateway:** Razorpay (Server-side HMAC-SHA256 signature verification & webhooks)
- **Email Notifications:** Resend transactional HTML email dispatch
- **WhatsApp Integration:** Meta WhatsApp Business Cloud API
- **Digital Ticketing & QR Validation:** Cryptographic verification tokens, QR code generation, gate scanner with duplicate entry prevention

---

## Core Capabilities & Feature Set

### 1. Public Experience Website
- **Homepage (`/`):**
  - Editorial hero with dynamic city selector, search field, and explore CTA.
  - **Curated for You:** Selected experiences in premium cards.
  - **Trending Near You:** Live popularity derived from actual booking activity.
  - **Trailrz Originals:** In-house flagship productions (*Chai & Chords*, *Candlelight Nocturne*, *Chef's Secret Supper Club*, *Rooftop Vinyl Sessions*).
  - **Discover by Mood:** Date Night, Friends Night, Something Different, Music & Rhythm, Food Lovers, Creative Minds, Weekend Plans.
  - **Explore Categories:** Live Music, Food & Tasting, Stand-Up Comedy, Creative Workshops, Nightlife.
  - **Why Trailrz:** Our philosophy on local discovery and authentic stories.
- **Discovery Engine (`/discover`):**
  - Multi-parameter search across event title, artist, venue, and keywords.
  - Live filters: City, Category, Date (Today, Tomorrow, This Weekend, This Week), Price brackets, Mood, and Trailrz Originals toggle.
  - Active filter chips, one-click reset, result counts, and sort options.
- **Event Detail Page (`/events/[slug]`):**
  - High-res cover and gallery photography.
  - Experience highlights, what to expect, artist info, venue Google Maps link.
  - Rules, age restrictions, accessibility, cancellation policy, and interactive FAQs.
  - **Sticky desktop booking panel & fixed mobile booking CTA** with real-time remaining availability.
  - Google Schema.org JSON-LD Event structured data.
- **Customer My Tickets Lookup (`/my-tickets`):**
  - Account-free secure lookup via Booking Reference + verified Email or Phone.
  - Tabbed view: Upcoming vs Past Experiences.
  - Live QR code admission pass display and printable PDF tickets.

### 2. High-Integrity Booking Engine
- **No Customer Registration Required:** Customers purchase seamlessly in under 60 seconds.
- **Temporary Inventory Reservations:** Prevents overselling by holding selected tickets for 10 minutes. Automatically releases inventory if payment is not completed or the hold expires.
- **Transparent Pricing:** Automatic calculation of subtotal, configurable convenience fee, and 18% GST.
- **Razorpay Server-Side Verification:** Cryptographic HMAC signature check ensures no unverified payment is ever marked as confirmed.
- **Idempotency Guard:** Delayed or duplicate webhook calls never double-issue tickets or duplicate revenue.

### 3. Digital QR Tickets & Gate Admission Scanner
- **Unique Ticket Numbers:** Formatted as `TRZ-2026-XXXXXX`.
- **Signed Verification Tokens:** Unpredictable token encoded inside QR payload; no sensitive customer PII leaked in the QR code.
- **Gate Scanner (`/admin/scanner`):**
  - Mobile camera and manual barcode/ticket ID validation.
  - Instant audio feedback (success chime vs error buzz).
  - Prominent visual alerts: **GREEN ACCESS GRANTED** vs **RED DUPLICATE ENTRY DETECTED** (with previous scan timestamp and gate scanner identity).

### 4. Comprehensive Admin Operations Portal (`/admin`)
- **Dashboard Overview (`/admin`):** Live KPIs (Revenue, Bookings, Tickets, Upcoming Events, Occupancy rates, Category breakdown, and Recent Activity).
- **Event Management (`/admin/events`, `/new`, `/[id]`):** Create, edit, duplicate, publish, unpublish, and archive events. Full control over ticket tiers and capacities.
- **Booking Management (`/admin/bookings`):** Search by customer, view breakdown, cancel bookings, process eligible refunds, and resend confirmations.
- **Ticket Registry (`/admin/tickets`):** Filter and search all issued gate passes.
- **Customer Database (`/admin/customers`):** Automatic CRM tracking lifetime spend, total passes, and order history.
- **Payment Ledger (`/admin/payments`):** Razorpay order and transaction tracking.
- **Notification Audit (`/admin/notifications`):** Email and WhatsApp delivery tracking with retry capabilities.
- **Analytics & CSV Export (`/admin/analytics`):** Financial audit distinguishing gross collections, refunds, and net profit.
- **Settings (`/admin/settings`):** Live platform settings (fees, tax, hold window, credentials, legal copy).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup & Seeding
```bash
# Push database schema (creates SQLite database dev.db locally)
npm run db:push

# Seed with default admin user and curated events
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```

Visit the application at:
- **Public Discovery Website:** [http://localhost:3000](http://localhost:3000)
- **Admin Operations Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)

### Default Admin Credentials:
- **Email:** `admin@trailrz.com`
- **Password:** `trailrzAdmin2026!`

---

## Automated Verification Suite

Run the 20-point production verification test:
```bash
node scripts/test-platform.js
```

All 20 tests pass against real database transactions, verifying authentication, event publishing, search, inventory reservation, Razorpay signatures, digital ticket generation, gate check-in, duplicate prevention, and refund handling.

---

## Production Deployment to Vercel with PostgreSQL

1. In `prisma/schema.prisma`, switch datasource to `postgresql` (or use `prisma/schema.postgresql.prisma`):
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set environment variables on Vercel:
   - `DATABASE_URL`: Your managed PostgreSQL connection string (Supabase / Neon / RDS)
   - `JWT_SECRET`: Random 64-character secret
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Live Razorpay merchant keys
   - `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook secret
   - `RESEND_API_KEY`: Resend API key for transactional emails
   - `WHATSAPP_API_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`: Meta Cloud API credentials
3. Deploy directly to Vercel:
   ```bash
   vercel
   ```
