-- Execute this SQL in Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/mwxpfjedhceujqmbjasy/sql/new

-- IMPORTANT: Run each ALTER TYPE command ONE AT A TIME, clicking "Run" after each one
-- PostgreSQL requires each enum value to be committed before adding the next

-- Step 1a: Add 'starter' to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'starter';

-- Step 1b: Add 'hobby' to app_role enum (run this AFTER step 1a completes)
-- ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'hobby';

-- Step 1c: Add 'business' to app_role enum (run this AFTER step 1b completes)
-- ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'business';

-- Step 2: After all enum values are added, verify the changes
-- SELECT unnest(enum_range(NULL::app_role))::text as app_roles;
