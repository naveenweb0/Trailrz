import { PrismaClient } from "@prisma/client";

// Read-only inspection script for Neon development database
// Zero DDL, zero mutations. Only reads metadata from information_schema and row counts.

async function inspect() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error("ERROR: DIRECT_URL is not set in environment or .env.local");
    console.error("Please configure DIRECT_URL in /Users/naveenmaan/Desktop/trailrz-nextjs/.env.local");
    process.exit(1);
  }

  // Ensure password is completely masked
  const maskedUrl = directUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`Connecting read-only via DIRECT_URL to: ${maskedUrl}`);

  const prisma = new PrismaClient({
    datasources: {
      db: { url: directUrl },
    },
  });

  try {
    // 1. Check server & identity details
    const dbInfo = await prisma.$queryRaw<Array<{ db: string; usr: string; ver: string }>>`
      SELECT current_database() as db, current_user as usr, version() as ver;
    `;
    console.log(`\n==================================================`);
    console.log(`  NEON TARGET DATABASE IDENTITY`);
    console.log(`==================================================`);
    console.log(`Database Name:    ${dbInfo[0]?.db}`);
    console.log(`Connected User:   ${dbInfo[0]?.usr}`);
    console.log(`PostgreSQL Engine: ${dbInfo[0]?.ver.split(" on ")[0]}`);

    // Parse host / endpoint ID from masked direct URL
    try {
      const u = new URL(directUrl.replace("postgresql://", "http://"));
      console.log(`Host Endpoint:    ${u.hostname}`);
    } catch {}

    // 2. Query all base tables in public schema
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `;

    // 3. Query all views in public schema
    const views = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name ASC;
    `;

    // 4. Query all custom enum types in public schema
    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
      ORDER BY t.typname ASC;
    `;

    console.log(`\n==================================================`);
    console.log(`  SCHEMA OBJECTS IN 'public' SCHEMA`);
    console.log(`==================================================`);
    console.log(`Base Tables Found:  ${tables.length}`);
    console.log(`Views Found:        ${views.length}`);
    console.log(`Custom Enums Found: ${enums.length}`);

    if (enums.length > 0) {
      console.log(`\nDiscovered Enums:`);
      enums.forEach(e => console.log(`  - ${e.typname}`));
    }

    if (views.length > 0) {
      console.log(`\nDiscovered Views:`);
      views.forEach(v => console.log(`  - ${v.table_name}`));
    }

    if (tables.length === 0) {
      console.log(`\n==================================================`);
      console.log(`  VERIFICATION RESULT: DATABASE IS GENUINELY EMPTY`);
      console.log(`==================================================`);
      console.log(`✓ 0 tables found in 'public' schema.`);
      console.log(`✓ No user data or legacy artifacts present.`);
      console.log(`✓ Target is clean for initial Prisma schema application.`);
      return;
    }

    // 5. If any tables exist, report row count for each
    console.log(`\n==================================================`);
    console.log(`  EXISTING TABLES & ROW COUNTS`);
    console.log(`==================================================`);
    for (const t of tables) {
      const escaped = t.table_name.replace(/"/g, '""');
      const countRes = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::bigint as count FROM "public"."${escaped}";`
      );
      const rowCount = countRes[0]?.count?.toString() || "0";
      console.log(`  - ${t.table_name}: ${rowCount} rows`);
    }

    console.log(`\nATTENTION: Existing tables detected. Halting for user review.`);
  } catch (err: any) {
    console.error("\nDatabase inspection error:", err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
