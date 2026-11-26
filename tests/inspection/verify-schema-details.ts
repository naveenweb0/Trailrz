import { PrismaClient } from "@prisma/client";

async function verifyDetails() {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error("DIRECT_URL not found");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });

  try {
    console.log("=== ENUM VALUES VERIFICATION ===");
    const enumVals = await prisma.$queryRaw<Array<{ enum_type: string; enum_value: string }>>`
      SELECT t.typname as enum_type, e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `;
    const enumMap: Record<string, string[]> = {};
    for (const row of enumVals) {
      if (!enumMap[row.enum_type]) enumMap[row.enum_type] = [];
      enumMap[row.enum_type].push(row.enum_value);
    }
    for (const [k, v] of Object.entries(enumMap)) {
      console.log(`- ${k}: [${v.join(", ")}]`);
    }

    console.log("\n=== FOREIGN KEYS VERIFICATION ===");
    const fks = await prisma.$queryRaw<Array<{
      table_name: string;
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>>`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `;
    console.log(`Total Foreign Keys: ${fks.length}`);
    for (const fk of fks) {
      console.log(`- ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
    }

    console.log("\n=== UNIQUE CONSTRAINTS VERIFICATION ===");
    const uqs = await prisma.$queryRaw<Array<{
      table_name: string;
      constraint_name: string;
      column_name: string;
    }>>`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `;
    console.log(`Total Unique Constraints: ${uqs.length}`);
    for (const uq of uqs) {
      console.log(`- ${uq.table_name}.${uq.column_name} (${uq.constraint_name})`);
    }

    console.log("\n=== SECONDARY INDEXES VERIFICATION ===");
    const indexes = await prisma.$queryRaw<Array<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }>>`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `;
    console.log(`Total Secondary Indexes: ${indexes.length}`);
    for (const idx of indexes) {
      console.log(`- ${idx.tablename}: ${idx.indexname} -> ${idx.indexdef}`);
    }

  } catch (err: any) {
    console.error("Verification error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDetails();
