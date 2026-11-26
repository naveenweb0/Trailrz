-- TRAILRZ Neon Development Database Rollback Script
-- Drops all tables, relations, and enums cleanly in reverse dependency order.

BEGIN;

-- Drop foreign-key dependent tables first
DROP TABLE IF EXISTS "gate_scans" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "tickets" CASCADE;
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "ticket_types" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "customers" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "subscribers" CASCADE;
DROP TABLE IF EXISTS "contact_messages" CASCADE;
DROP TABLE IF EXISTS "webhook_events" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "platform_settings" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Drop custom enums
DROP TYPE IF EXISTS "EventStatus" CASCADE;
DROP TYPE IF EXISTS "BookingStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "TicketStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

COMMIT;
