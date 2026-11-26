import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function newId() {
  return "evt_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

async function seed() {
  console.log("Seeding curated TRAILRZ events...");

  const existing = await prisma.event.count();
  if (existing > 0) {
    console.log(`Already found ${existing} events. Skipping seed.`);
    return;
  }

  const events = [
    {
      slug: "candlelight-jazz-cellar-chandigarh",
      title: "Candlelight Jazz Cellar & Acoustic Baithak",
      category: "Music",
      moods: ["Date Night", "Music Nights"],
      experienceType: "Intimate Concert",
      isOriginal: true,
      city: "Chandigarh",
      venue: "The Heritage Basement, Sector 10",
      address: "Sub-Courtyard A, Cultural Zone, Sector 10, Chandigarh",
      startAt: new Date(Date.now() + 2 * 86400000), // in 2 days
      endAt: new Date(Date.now() + 2 * 86400000 + 3 * 3600000),
      status: "published" as const,
      shortDescription: "An atmospheric cellar lit purely by beeswax tapers, featuring brass horn soloists and classic jazz trios.",
      description: "Step into an subterranean acoustic salon where warm beeswax tapers light the stone walls. Curated specifically for discerning listeners, this evening pairs live brass improvisation with vintage cocktail flights.",
      organizer: "TRAILRZ Originals",
      coverImage: { url: "/img/concert.jpg", alt: "Candlelight Jazz Cellar" },
      gallery: [{ url: "/img/concert.jpg", alt: "Concert" }, { url: "/img/music-nights.jpg", alt: "Music Night" }],
      highlights: ["Hundred Beeswax Tapers", "Acoustic Brass Trio", "Seated Salon", "Welcome Beverage Included"],
      guidelines: ["Arrive 15 minutes prior", "No flash photography"],
      tiers: [
        { name: "Single Patron Pass", price: 149900, capacity: 40, sold: 12, reserved: 2, description: "Unreserved candlelight bench seating + artisanal drink." },
        { name: "Patron Duo Alcove", price: 279900, capacity: 15, sold: 10, reserved: 1, description: "Dedicated two-person table near the brass quadrant." },
      ],
    },
    {
      slug: "artisanal-ceramic-wheel-masterclass",
      title: "Artisanal Studio Ceramic & Potter's Wheel",
      category: "Art & Craft",
      moods: ["Creative Escape", "Slow Evenings"],
      experienceType: "Masterclass",
      isOriginal: false,
      city: "Mohali",
      venue: "Mitti Atelier, Sector 82",
      address: "Plot 42, Industrial Creative Precinct, Sector 82, Mohali",
      startAt: new Date(Date.now() + 4 * 86400000), // in 4 days
      endAt: new Date(Date.now() + 4 * 86400000 + 4 * 3600000),
      status: "published" as const,
      shortDescription: "Centering, throwing, and glazing clay vessels under the gentle tutelage of master studio potters.",
      description: "A slow four-hour tactile escape from screens. Work with local red terracotta and stoneware, explore Japanese pinching traditions, and fire your own keepsake bowl.",
      organizer: "Mitti Collective",
      coverImage: { url: "/img/creative-escape.jpg", alt: "Ceramic Studio" },
      gallery: [{ url: "/img/creative-escape.jpg", alt: "Pottery" }, { url: "/img/slow-evenings.jpg", alt: "Slow Evening" }],
      highlights: ["Individual Kick Wheels", "Bisque & Glaze Included", "Artisanal Tea Service", "Take Home 2 Fired Vessels"],
      guidelines: ["Wear comfortable clothing that can get clay on it"],
      tiers: [
        { name: "Studio Seat", price: 220000, capacity: 12, sold: 8, reserved: 0, description: "Includes personal wheel, clay, trimming tools, and home dispatch of fired pieces." },
      ],
    },
    {
      slug: "twilight-courtyard-supper-club",
      title: "Twilight Courtyard Supper Club",
      category: "Culinary",
      moods: ["Food Lovers", "Date Night"],
      experienceType: "Supper Club",
      isOriginal: true,
      city: "Panchkula",
      venue: "Kothi Baithak, Sector 4",
      address: "Haveli Courtyard, Sector 4, Panchkula",
      startAt: new Date(Date.now() + 5 * 86400000),
      endAt: new Date(Date.now() + 5 * 86400000 + 3 * 3600000),
      status: "published" as const,
      shortDescription: "A six-course seasonal tasting menu celebrating heirloom grains, slow embers, and forgotten Punjab recipes.",
      description: "Gather around communal timber tables under old jacaranda boughs. Chef-led storytelling weaves through each course, pairing local cold-pressed oils with slow-roasted wild greens.",
      organizer: "TRAILRZ Originals",
      coverImage: { url: "/img/food-lovers.jpg", alt: "Supper Club" },
      gallery: [{ url: "/img/food-lovers.jpg", alt: "Food" }, { url: "/img/rooftop.jpg", alt: "Courtyard" }],
      highlights: ["6-Course Tasting Menu", "Communal Oak Table", "Heirloom Ingredients", "Paired Non-Alcoholic Botanicals"],
      guidelines: ["Inform hosts in advance of severe allium or nut allergies"],
      tiers: [
        { name: "Supper Cover", price: 340000, capacity: 24, sold: 18, reserved: 3, description: "Full tasting progression with artisanal cordial pairings." },
      ],
    },
    {
      slug: "courtyard-standup-comedy-salon",
      title: "The Courtyard Stand-Up Comedy Salon",
      category: "Theater",
      moods: ["With Friends"],
      experienceType: "Live Performance",
      isOriginal: false,
      city: "Chandigarh",
      venue: "Open-Air Amphitheatre, Sector 17",
      address: "Under the Colonnades, Sector 17 Plaza, Chandigarh",
      startAt: new Date(Date.now() + 3 * 86400000),
      endAt: new Date(Date.now() + 3 * 86400000 + 2 * 3600000),
      status: "published" as const,
      shortDescription: "Sharp observational wit and unscripted crowd work in an intimate fifty-chair courtyard setting.",
      description: "No stadium cavern acoustics. Just fifty seats, one microphone, and some of the sharpest voices in modern Indian comedy testing fresh tour material.",
      organizer: "Urban Baithak",
      coverImage: { url: "/img/comedy.jpg", alt: "Standup Comedy" },
      gallery: [{ url: "/img/comedy.jpg", alt: "Comedy" }, { url: "/img/with-friends.jpg", alt: "With Friends" }],
      highlights: ["50-Seat Intimate Setting", "Zero Back-Row Distance", "3 Touring Comedians"],
      guidelines: ["Age 16 and above"],
      tiers: [
        { name: "Front Circle Pass", price: 89900, capacity: 25, sold: 24, reserved: 1, description: "Front rows. Be prepared for occasional crowd interaction." },
        { name: "General Admission", price: 69900, capacity: 25, sold: 15, reserved: 0, description: "Terraced amphitheatre seats." },
      ],
    },
    {
      slug: "sufi-strings-heritage-night",
      title: "Sufi Strings & Folk Lore Ensemble",
      category: "Music",
      moods: ["Something Different", "Slow Evenings"],
      experienceType: "Acoustic Recital",
      isOriginal: true,
      city: "Chandigarh",
      venue: "Government Museum Lawn, Sector 10",
      address: "Jan Marg, Sector 10, Chandigarh",
      startAt: new Date(Date.now() + 7 * 86400000),
      endAt: new Date(Date.now() + 7 * 86400000 + 3 * 3600000),
      status: "published" as const,
      shortDescription: "Rare string instruments, meditative poetry, and warm rugs under the autumn stars.",
      description: "Experience the timeless resonance of the rabab, saarangi, and algoza. A transcendent evening of mystic poetry set against Le Corbusier's red brick facades.",
      organizer: "TRAILRZ Originals",
      coverImage: { url: "/img/story.jpg", alt: "Sufi Strings" },
      gallery: [{ url: "/img/story.jpg", alt: "Sufi" }, { url: "/img/hero.jpg", alt: "Hero" }],
      highlights: ["Rabab & Saarangi Master Recital", "Bolster & Carpet Seating", "Warm Kashmiri Kahwa Served"],
      guidelines: ["Outdoor grass lawn: warm shawl recommended"],
      tiers: [
        { name: "Floor Rug Pass", price: 119900, capacity: 50, sold: 20, reserved: 4, description: "Traditional bolster rug seating with warm kehwa." },
      ],
    },
  ];

  for (const ev of events) {
    const { tiers, ...eventData } = ev;
    const id = newId();
    const created = await prisma.event.create({
      data: {
        id,
        ...eventData,
      },
    });

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      await prisma.ticketType.create({
        data: {
          id: `tt_${id}_${i}`,
          eventId: created.id,
          name: t.name,
          price: t.price,
          capacity: t.capacity,
          sold: t.sold,
          reserved: t.reserved,
          description: t.description,
          sort: i,
          active: true,
        },
      });
    }
  }

  console.log(`Successfully seeded ${events.length} curated events!`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
