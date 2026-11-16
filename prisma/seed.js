const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database for TRAILRZ...");

  // 1. Create or update Default Admin User
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || "admin@trailrz.com";
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || "trailrzAdmin2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
      role: "SUPERADMIN",
    },
    create: {
      email: adminEmail,
      name: process.env.ADMIN_DEFAULT_NAME || "Trailrz Master Admin",
      passwordHash,
      role: "SUPERADMIN",
      isActive: true,
    },
  });
  console.log(`✓ Admin user ready: ${admin.email}`);

  // 2. Create or update Platform Settings
  const settings = await prisma.platformSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      platformName: "TRAILRZ",
      tagline: "Life is happening. Go be part of it.",
      supportedCities: JSON.stringify([
        "Chandigarh",
        "Mohali",
        "Panchkula",
        "Delhi NCR",
        "Mumbai",
        "Bengaluru",
      ]),
      eventCategories: JSON.stringify([
        "Music",
        "Food",
        "Comedy",
        "Art & Culture",
        "Workshops",
        "Nightlife",
        "Outdoor",
        "Exclusive",
      ]),
      convenienceFeePercentage: 2.5,
      convenienceFeeFixed: 2000, // ₹20.00 in paise
      taxPercentage: 18.0, // 18% GST on convenience fee
      bookingExpiryMinutes: 10,
      supportEmail: "care@trailrz.com",
      supportPhone: "+91 98765 43210",
      instagramUrl: "https://instagram.com/trailrz",
      whatsappUrl: "https://wa.me/919876543210",
      cancellationPolicyDefault:
        "Free cancellation up to 48 hours before the event start time. 50% refund up to 24 hours before. No refunds within 24 hours of event.",
      termsConditions:
        "1. Entry allowed only with a valid digital ticket QR code.\n2. Gates open 30 minutes prior to the start time.\n3. Outside food and beverages are not allowed inside the venue.\n4. Age restrictions apply as noted on each experience.",
      privacyPolicy:
        "Trailrz protects your personal booking information and strictly uses customer details for ticket verification and vital event updates.",
    },
  });
  console.log(`✓ Platform settings initialized: ${settings.platformName}`);

  // 3. Clear existing events to seed fresh curated experiences
  await prisma.checkIn.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.inventoryReservation.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.eventImage.deleteMany();
  await prisma.eventSession.deleteMany();
  await prisma.event.deleteMany();

  const now = new Date();

    const sampleEvents = [
      {
        title: "Chai & Chords — Sunset Acoustic Sanctuary",
        slug: "chai-and-chords-chandigarh",
        shortDescription:
          "An intimate evening of indie melodies, artisanal Kashmiri Kahwa, and warm storytelling as twilight descends over Sector 10.",
        fullDescription:
          "Chai & Chords is a flagship Trailrz Original designed for those who appreciate soulful acoustic music away from loud, crowded clubs. Gather under amber fairy lights at The Courtyard Cafe in Chandigarh, sip handcrafted herbal and spiced teas brewed live, and immerse yourself in acoustic renditions by emerging northern indie singer-songwriters.\n\nEvery guest is greeted with a warm cup of artisanal Kashmiri Kahwa and warm bakery treats. As the sun sets, our acoustic artists take the stage with acoustic guitars, cajóns, and candid stories behind their compositions.",
        category: "Music",
        subcategory: "Acoustic & Folk",
        tags: JSON.stringify(["acoustic", "chai", "sunset", "indie", "original", "cozy"]),
        eventType: "TRAILRZ_ORIGINAL",
        isFeatured: true,
        isOriginal: true,
        mood: "Date Night",
        coverImage:
          "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
        city: "Chandigarh",
        venueName: "The Courtyard Cafe, Sector 10",
        fullAddress: "SCO 42, Inner Courtyard, Sector 10-D, Chandigarh, 160011",
        googleMapsUrl: "https://maps.google.com/?q=Sector+10+Chandigarh",
        latitude: 30.7512,
        longitude: 76.7865,
        eventDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // in 3 days
        startTime: "05:30 PM",
        endTime: "08:30 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
        ageRestriction: "16+",
        highlights: JSON.stringify([
          "Complimentary artisanal tea tasting & fresh bakery bites",
          "Intimate 3-artist unplugged lineup with storytelling",
          "Curated postcard memory station & open jam finale",
          "Limited to 65 seats for a quiet, cinematic vibe",
        ]),
        whatToExpect:
          "Expect a calming, seated ambiance with rustic wicker chairs, candlelight lanterns, gentle acoustic soundscapes, and welcoming conversation.",
        artistInfo: "Featuring Kabir Dev (Indie-folk), Rhea Mehta (Soul & Ukulele), and percussionist Samar.",
        rules: JSON.stringify([
          "Doors open at 5:00 PM; performances commence sharply at 5:30 PM.",
          "Phones must be kept on silent mode during musical acts.",
          "Parking available in Sector 10 municipal parking area.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Is tea included with the ticket?",
            a: "Yes! Every ticket includes unlimited tastings of our two featured signature blends and a warm bakery companion.",
          },
          {
            q: "Can I bring a camera?",
            a: "Non-flash photography and phone video recordings are welcome from your seats.",
          },
        ]),
        cancellationPolicy: "Full refund if cancelled at least 48 hours prior to start.",
        accessibilityInfo: "Ground floor access with wheelchair ramp at main entrance.",
        entryInstructions: "Present your digital QR ticket at the gate receptionist for instant check-in wristbands.",
        metaTitle: "Chai & Chords Chandigarh — Trailrz Original Acoustic Evening",
        metaDescription: "Join Chai & Chords by Trailrz in Sector 10 Chandigarh for acoustic tunes and artisanal chai.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "Early Bird Single",
            description: "Access for 1 person + artisanal tea & snack platter",
            price: 39900, // ₹399.00
            quantityTotal: 25,
            quantitySold: 12,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "General Admission",
            description: "Standard entry for 1 person + complimentary warm brew",
            price: 54900, // ₹549.00
            quantityTotal: 40,
            quantitySold: 5,
            maxPerBooking: 6,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Couple Pass (Includes Table)",
            description: "Entry for 2 with reserved front-row table & signature dessert",
            price: 99900, // ₹999.00
            quantityTotal: 15,
            quantitySold: 4,
            maxPerBooking: 2,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
      {
        title: "Candlelight Nocturne: Strings Under the Stars",
        slug: "candlelight-nocturne-chandigarh",
        shortDescription:
          "Surround yourself with 1,500 glowing candles as a string quartet performs cinematic anthems and Bollywood classics.",
        fullDescription:
          "Step into a mesmerizing sea of flickering candlelight at the historic amphitheater. Our virtuoso string quartet transforms modern film soundtracks, Coldplay ballads, and legendary A.R. Rahman compositions into breathtaking classical arrangements.\n\nCandlelight Nocturne by Trailrz crafts an ethereal visual and auditory journey, creating unforgettable romantic and introspective moments under open skies.",
        category: "Music",
        subcategory: "Classical & Instrumental",
        tags: JSON.stringify(["candlelight", "strings", "cinematic", "romantic", "exclusive", "original"]),
        eventType: "TRAILRZ_ORIGINAL",
        isFeatured: true,
        isOriginal: true,
        mood: "Date Night",
        coverImage:
          "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80",
        city: "Chandigarh",
        venueName: "The Open Air Amphitheatre, Kalagram",
        fullAddress: "Kalagram Cultural Complex, Railway Station Road, Manimajra, Chandigarh, 160101",
        googleMapsUrl: "https://maps.google.com/?q=Kalagram+Chandigarh",
        latitude: 30.722,
        longitude: 76.8285,
        eventDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // in 5 days
        startTime: "07:30 PM",
        endTime: "09:30 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000),
        ageRestriction: "12+",
        highlights: JSON.stringify([
          "Over 1,500 flameless LED candles illuminating the amphitheatre steps",
          "60-minute curated live acoustic set of timeless melodies",
          "Complimentary spiced warm cider on arrival",
          "Exclusive photo lounge with candlelit backdrop",
        ]),
        whatToExpect:
          "A quiet, romantic, high-aesthetic performance where whispering is encouraged and applause swells naturally between movements.",
        artistInfo: "The Chandigarh Sinfonietta String Quartet featuring guest cellist Ananya Roy.",
        rules: JSON.stringify([
          "No laser pointers or intrusive camera flashes allowed.",
          "Seats are tiered amphitheatre style with cushion seating.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Are real flames used?",
            a: "For guest safety and wind resilience, we utilize high-fidelity flickering LED candles crafted from real wax.",
          },
        ]),
        cancellationPolicy: "Standard Trailrz 48-hour cancellation policy applies.",
        accessibilityInfo: "Wheelchair ramp and accessible seating on lower tier.",
        entryInstructions: "Scan QR code at Gate 2. Ushers will escort you to your booked section.",
        metaTitle: "Candlelight Nocturne: Strings Under the Stars | Trailrz Originals",
        metaDescription: "Experience 1500 candles and string quartet magic in Chandigarh with Trailrz Originals.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "Silver Tier (Rear Steps)",
            description: "Tiered cushion seating with panoramic candlelit view",
            price: 69900, // ₹699.00
            quantityTotal: 50,
            quantitySold: 18,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Gold Tier (Mid Section)",
            description: "Prime acoustic zone with upgraded velvet floor cushions",
            price: 99900, // ₹999.00
            quantityTotal: 60,
            quantitySold: 30,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "VIP Candlelight Lounge",
            description: "Front-row candle table + gourmet dessert box & artisanal drink",
            price: 159900, // ₹1,599.00
            quantityTotal: 20,
            quantitySold: 14,
            maxPerBooking: 2,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
      {
        title: "Artisanal Coffee & Roastery Masterclass",
        slug: "artisanal-coffee-masterclass-mohali",
        shortDescription:
          "Master espresso extraction, pour-over chemistry, and sensory cup tasting with master roasters in Mohali.",
        fullDescription:
          "Are you passionate about specialty coffee? Dive into the third-wave coffee movement in this hands-on 3-hour masterclass. Learn how origin, altitude, and processing methods shape bean flavor profiles.\n\nYou will grind, brew, and taste beans using V60, Aeropress, and manual espresso machines, followed by milk steaming techniques for latte art.",
        category: "Workshops",
        subcategory: "Culinary & Coffee",
        tags: JSON.stringify(["coffee", "workshop", "brewing", "roastery", "weekend"]),
        eventType: "CURATED",
        isFeatured: false,
        isOriginal: false,
        mood: "Something Different",
        coverImage:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
        city: "Mohali",
        venueName: "Bloom & Roast Lab, Phase 8B",
        fullAddress: "Industrial Area Phase 8B, Sector 74, SAS Nagar, Mohali, Punjab 160071",
        googleMapsUrl: "https://maps.google.com/?q=Phase+8B+Mohali",
        latitude: 30.7046,
        longitude: 76.6965,
        eventDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // in 6 days
        startTime: "10:30 AM",
        endTime: "01:30 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000),
        ageRestriction: "15+",
        highlights: JSON.stringify([
          "Tasting flight of 5 single-origin Indian coffees (Araku, Chikmagalur, Wayanad)",
          "Hands-on extraction on commercial La Marzocco espresso machines",
          "Take-home 250g bag of custom-roasted whole beans",
          "Certificate of completion from Bloom & Roast Lab",
        ]),
        whatToExpect:
          "Engaging, interactive, sensory-rich workshop. You will smell, taste, grind, and brew alongside seasoned barista champions.",
        artistInfo: "Led by Q-Grader Certified Roaster Taranjit Singh.",
        rules: JSON.stringify([
          "Please avoid wearing heavy perfumes or colognes as they interfere with sensory aroma notes.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Do I need prior barista experience?",
            a: "No! This workshop is crafted for enthusiastic coffee lovers of all experience levels.",
          },
        ]),
        cancellationPolicy: "Full refund 72 hours prior; 50% refund up to 24 hours.",
        accessibilityInfo: "Fully wheelchair accessible venue with elevators.",
        entryInstructions: "Check-in at the 2nd-floor tasting lab reception.",
        metaTitle: "Artisanal Coffee & Roastery Masterclass Mohali | Trailrz",
        metaDescription: "Learn coffee brewing, pour-overs and espresso extraction in Mohali with Trailrz.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "Single Barista Pass",
            description: "Individual workstation access + take-home roasted beans bag",
            price: 89900, // ₹899.00
            quantityTotal: 18,
            quantitySold: 8,
            maxPerBooking: 3,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Duo Masterclass Pass",
            description: "Pass for 2 attendees sharing an espresso station + two coffee bags",
            price: 159900, // ₹1,599.00
            quantityTotal: 8,
            quantitySold: 3,
            maxPerBooking: 2,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
      {
        title: "Late Night Laughs: Stand-Up Showcase",
        slug: "late-night-laughs-panchkula",
        shortDescription:
          "A riotous 90 minutes of unfiltered comedy, crowd work, and fresh material from top touring comics.",
        fullDescription:
          "Unwind your weekend with gut-busting humor! Late Night Laughs brings 4 hilarious stand-up comedians together in Panchkula for a night of sharp observational comedy, relatable generational banter, and witty crowd interactions.\n\nEnjoy comfortable bistro seating, gourmet snack platters, and craft beverages while laughing till your ribs hurt.",
        category: "Comedy",
        subcategory: "Stand-Up",
        tags: JSON.stringify(["comedy", "standup", "laughs", "weekend", "friends"]),
        eventType: "CURATED",
        isFeatured: false,
        isOriginal: false,
        mood: "Friends Night",
        coverImage:
          "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80",
        city: "Panchkula",
        venueName: "The Laugh Hub, Sector 5",
        fullAddress: "SCO 112, City Center, Sector 5, Panchkula, Haryana 134109",
        googleMapsUrl: "https://maps.google.com/?q=Sector+5+Panchkula",
        latitude: 30.6942,
        longitude: 76.8606,
        eventDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // in 4 days
        startTime: "08:00 PM",
        endTime: "09:45 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
        ageRestriction: "18+",
        highlights: JSON.stringify([
          "Curated lineup of 4 headlining stand-up comedians",
          "Intimate comedy-club style seating with clear stage views",
          "Food & beverages served straight to your seat",
        ]),
        whatToExpect: "High-energy, fast-paced comedy with fresh jokes and friendly crowd work.",
        artistInfo: "Hosted by Gaurav Pathak with headliners Simran Kaur, Sahil Verma, and special guest.",
        rules: JSON.stringify([
          "Strictly 18+. Age verification check may be conducted at entrance.",
          "No audio or video recording allowed during comedian sets.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Is seating on first-come basis?",
            a: "Within each ticket tier, seats are allocated on a first-come, first-served basis upon arrival.",
          },
        ]),
        cancellationPolicy: "Tickets are non-refundable within 24 hours of the show.",
        accessibilityInfo: "Elevator access available to the club on the 1st floor.",
        entryInstructions: "Arrive 20 minutes before showtime to order drinks and find your seats.",
        metaTitle: "Late Night Laughs Panchkula | Trailrz Comedy",
        metaDescription: "Catch the funniest stand-up comics live in Sector 5 Panchkula. Book your tickets on Trailrz.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "Standard Seat",
            description: "General seating + ₹100 F&B voucher redeemable inside",
            price: 34900, // ₹349.00
            quantityTotal: 70,
            quantitySold: 28,
            maxPerBooking: 6,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Front Row VIP",
            description: "Guaranteed front two rows (warning: comics may talk to you!) + snack basket",
            price: 59900, // ₹599.00
            quantityTotal: 20,
            quantitySold: 15,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
      {
        title: "Chef’s Secret Supper Club: Punjabi Heritage Revived",
        slug: "chefs-secret-supper-club-chandigarh",
        shortDescription:
          "A 7-course blind culinary tasting menu celebrating forgotten recipes of undivided Punjab in a private manor.",
        fullDescription:
          "Step through an unmarked wooden doorway in Sector 9 into a candlelit dining room reserved for just 24 guests. Chef Harinder presents an exquisite 7-course degustation menu reviving ancestral recipes from Rawalpindi, Lahore, and Amritsar, reinterpreted with contemporary culinary precision.\n\nEach course is paired with non-alcoholic botanical shrub infusions and accompanied by stories of heritage grains and historic culinary traditions.",
        category: "Food",
        subcategory: "Fine Dining & Tasting",
        tags: JSON.stringify(["food", "supper-club", "fine-dining", "exclusive", "original"]),
        eventType: "TRAILRZ_ORIGINAL",
        isFeatured: true,
        isOriginal: true,
        mood: "Date Night",
        coverImage:
          "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80",
        city: "Chandigarh",
        venueName: "The Heritage Villa (Secret Location)",
        fullAddress: "Revealed 24 hours before event to confirmed ticket holders in Sector 9, Chandigarh",
        googleMapsUrl: "https://maps.google.com/?q=Sector+9+Chandigarh",
        latitude: 30.745,
        longitude: 76.792,
        eventDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // in 7 days
        startTime: "08:00 PM",
        endTime: "11:00 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000),
        ageRestriction: "18+",
        highlights: JSON.stringify([
          "7-course bespoke degustation dinner prepared live by Chef Harinder",
          "Handcrafted botanical cordials and ferment pairings for every dish",
          "Exclusive long communal dining table encouraging genuine connection",
          "Heritage ingredient gift box to take home",
        ]),
        whatToExpect:
          "A quiet, cinematic dining experience with bespoke ambient music, warm communal camaraderie, and storytelling with every course.",
        artistInfo: "Curated and prepared by Chef Harinder Singh (former Michelin-starred kitchen alumnus).",
        rules: JSON.stringify([
          "Dietary restrictions and allergies must be communicated at least 48 hours in advance.",
          "Smart casual or traditional attire encouraged.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Where is the exact location?",
            a: "The secret address in Sector 9 is sent directly via email and WhatsApp to confirmed guests 24 hours prior.",
          },
        ]),
        cancellationPolicy: "Strict 72-hour cancellation policy due to perishable artisan ingredients.",
        accessibilityInfo: "Step-free entrance and accessible private washrooms.",
        entryInstructions: "Ring the brass bell at the entrance and show your digital QR ticket.",
        metaTitle: "Chef’s Secret Supper Club Chandigarh | Trailrz Originals",
        metaDescription: "An exclusive 7-course heritage dining journey in Chandigarh curated by Trailrz Originals.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "7-Course Degustation Seat",
            description: "Complete 7-course menu + all paired botanical drinks & gift jar",
            price: 249900, // ₹2,499.00
            quantityTotal: 16,
            quantitySold: 9,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Couple Pairing Pass",
            description: "Guaranteed paired seating for 2 + Chef's special celebratory course",
            price: 469900, // ₹4,699.00
            quantityTotal: 4,
            quantitySold: 2,
            maxPerBooking: 1,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
      {
        title: "Clay & Wine: Sip & Sculpt Pottery Evening",
        slug: "clay-and-wine-pottery-evening-chandigarh",
        shortDescription:
          "Spin the potter's wheel, mold terracotta clay, and enjoy curated mocktails & artisanal grazing boards.",
        fullDescription:
          "Get your hands happily messy and your mind completely refreshed! In this tactile two-hour workshop, seasoned potters teach you foundational hand-building techniques, coiling, and electric wheel throwing.\n\nWhether you sculpt a ceramic coffee mug, an organic trinket tray, or a rustic planter, your creations will be professionally glazed, fired, and delivered to you within two weeks.",
        category: "Workshops",
        subcategory: "Pottery & Sculpture",
        tags: JSON.stringify(["pottery", "art", "hands-on", "creative", "social"]),
        eventType: "CURATED",
        isFeatured: false,
        isOriginal: false,
        mood: "Creative Minds",
        coverImage:
          "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80",
        city: "Chandigarh",
        venueName: "Mitti Collective Studio, Sector 26",
        fullAddress: "SCF 22, Madhya Marg, Sector 26, Chandigarh, 160019",
        googleMapsUrl: "https://maps.google.com/?q=Sector+26+Chandigarh",
        latitude: 30.728,
        longitude: 76.804,
        eventDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // in 2 days
        startTime: "04:00 PM",
        endTime: "06:30 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000),
        ageRestriction: "14+",
        highlights: JSON.stringify([
          "All clay, tools, glazes, and aprons provided",
          "Dedicated 1-on-1 wheel-throwing time with master potters",
          "Fresh fruit mocktails and gourmet cheese grazing board",
          "Kiln firing and doorstep delivery of your finished pieces",
        ]),
        whatToExpect:
          "Laughter, relaxing background bossa nova music, soft clay between your fingers, and therapeutic artistic expression.",
        artistInfo: "Guided by ceramic artists Divya and Rohan from Mitti Studio.",
        rules: JSON.stringify([
          "Aprons are provided, but we recommend wearing comfortable clothes you don't mind getting clay dust on.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Can I take my pottery home right away?",
            a: "Pottery must dry for 5-7 days before being kiln-fired at 1200°C. We notify you once fired and deliver it safely.",
          },
        ]),
        cancellationPolicy: "Cancel up to 48 hours for 100% refund.",
        accessibilityInfo: "Located on ground floor with spacious studio pathways.",
        entryInstructions: "Show your Trailrz ticket on your phone upon entering the studio.",
        metaTitle: "Clay & Wine: Sip & Sculpt Pottery Evening | Trailrz",
        metaDescription: "Experience hands-on pottery workshops in Sector 26 Chandigarh with Trailrz.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "Single Ceramicist Pass",
            description: "1 ticket + clay + glazing/firing for 2 pieces + mocktail & snack",
            price: 79900, // ₹799.00
            quantityTotal: 20,
            quantitySold: 11,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Duo Creators Pass",
            description: "Pass for 2 friends or couple + shared wheel + 4 fired pieces",
            price: 149900, // ₹1,499.00
            quantityTotal: 10,
            quantitySold: 6,
            maxPerBooking: 2,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
      {
        title: "Rooftop Vinyl Sessions: Funk, Jazz & Sunsets",
        slug: "rooftop-vinyl-sessions-chandigarh",
        shortDescription:
          "Pure analog sound. Rare vinyl records spinning funk, bossa nova, and vintage soul against the Shivalik hill skyline.",
        fullDescription:
          "Experience the timeless warmth of spinning needle-on-wax vinyl on an expansive rooftop overlooking the city and the Shivalik hills. Our resident vinyl crate diggers spin rare 1970s jazz funk, Japanese city pop, and retro soul through audiophile tube amplifiers and vintage speakers.\n\nPair the warm crackle of vinyl with wood-fired pizzas, artisanal spritzers, and a golden sunset view.",
        category: "Nightlife",
        subcategory: "Vinyl & Sunset Social",
        tags: JSON.stringify(["vinyl", "rooftop", "jazz", "sunset", "exclusive", "original"]),
        eventType: "TRAILRZ_ORIGINAL",
        isFeatured: true,
        isOriginal: true,
        mood: "Weekend Plans",
        coverImage:
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
        city: "Chandigarh",
        venueName: "The Sky Deck, Sector 17",
        fullAddress: "7th Floor Terrace, City Centre Mall, Sector 17-C, Chandigarh, 160017",
        googleMapsUrl: "https://maps.google.com/?q=Sector+17+Chandigarh",
        latitude: 30.7398,
        longitude: 76.7827,
        eventDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // in 8 days
        startTime: "05:00 PM",
        endTime: "10:00 PM",
        bookingOpensAt: new Date(),
        bookingClosesAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000),
        ageRestriction: "18+",
        highlights: JSON.stringify([
          "All-vinyl DJ sets with high-end analog tube sound system",
          "Panoramic sunset view of the Shivalik mountain foothills",
          "Wood-fired sourdough pizza & craft non-alcoholic spritzer bar",
          "Vinyl swap & album listening nook",
        ]),
        whatToExpect: "Chill, sophisticated social vibes, golden-hour light, analog music lovers, and easy conversations.",
        artistInfo: "Curated by DJ CrateDigga (Delhi) and Analog Collective Chandigarh.",
        rules: JSON.stringify([
          "Dress code: Smart relaxed. Please bring a light jacket as rooftop breeze picks up after sunset.",
        ]),
        faqs: JSON.stringify([
          {
            q: "Can I bring my own vinyl to play?",
            a: "We have an open listening booth where you can play and showcase your favorite records during the first hour!",
          },
        ]),
        cancellationPolicy: "Full refund up to 48 hours prior to start.",
        accessibilityInfo: "High-speed elevator directly to the rooftop terrace.",
        entryInstructions: "Take Elevator B to Level 7. Scan QR code at the rooftop reception desk.",
        metaTitle: "Rooftop Vinyl Sessions Chandigarh | Trailrz Originals",
        metaDescription: "Golden hour sunset, analog vinyl tunes and woodfired pizzas in Sector 17 Chandigarh.",
        status: "PUBLISHED",
        ticketTypes: [
          {
            name: "Sunset Entry Pass",
            description: "Entry + 1 artisan craft beverage",
            price: 49900, // ₹499.00
            quantityTotal: 60,
            quantitySold: 25,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Pizza & Vinyl Combo",
            description: "Entry + artisan wood-fired personal pizza + signature craft drink",
            price: 89900, // ₹899.00
            quantityTotal: 40,
            quantitySold: 20,
            maxPerBooking: 4,
            minPerBooking: 1,
            status: "ACTIVE",
          },
          {
            name: "Lounge Table (Group of 4)",
            description: "Reserved sofa booth for 4 + 2 pizzas + 4 artisan drinks",
            price: 320000, // ₹3,200.00
            quantityTotal: 10,
            quantitySold: 4,
            maxPerBooking: 2,
            minPerBooking: 1,
            status: "ACTIVE",
          },
        ],
      },
    ];

    for (const item of sampleEvents) {
      const { ticketTypes, ...eventData } = item;
      const createdEvent = await prisma.event.create({
        data: {
          ...eventData,
          images: {
            create: [
              { url: eventData.coverImage, caption: eventData.title, sortOrder: 0 },
            ],
          },
          ticketTypes: {
            create: ticketTypes,
          },
        },
      });
      console.log(`✓ Event created: ${createdEvent.title} (${createdEvent.slug})`);
    }

  console.log("Seeding complete! TRAILRZ database is ready.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
