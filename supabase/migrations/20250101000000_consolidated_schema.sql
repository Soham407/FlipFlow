-- Create flipbooks table
CREATE TABLE public.flipbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.flipbooks ENABLE ROW LEVEL SECURITY;
-- RLS Policies for flipbooks
CREATE POLICY "Users can view their own flipbooks" ON public.flipbooks FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own flipbooks" ON public.flipbooks FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own flipbooks" ON public.flipbooks FOR DELETE USING (auth.uid() = user_id);
-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_pdfs', 'user_pdfs', false);
-- Storage policies
CREATE POLICY "Users can upload their own PDFs" ON storage.objects FOR
INSERT WITH CHECK (
    bucket_id = 'user_pdfs'
    AND auth.uid()::text = (storage.foldername(name)) [1]
  );
CREATE POLICY "Users can view their own PDFs" ON storage.objects FOR
SELECT USING (
    bucket_id = 'user_pdfs'
    AND auth.uid()::text = (storage.foldername(name)) [1]
  );
CREATE POLICY "Users can delete their own PDFs" ON storage.objects FOR DELETE USING (
  bucket_id = 'user_pdfs'
  AND auth.uid()::text = (storage.foldername(name)) [1]
);
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('free', 'pro');
-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);
-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) $$;
-- Create function to get user's current role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID) RETURNS app_role LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT role
FROM public.user_roles
WHERE user_id = _user_id
ORDER BY CASE
    WHEN role = 'pro' THEN 1
    ELSE 2
  END
LIMIT 1 $$;
-- RLS policies for user_roles
CREATE POLICY "Users can view their own role" ON public.user_roles FOR
SELECT USING (auth.uid() = user_id);
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);
-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Add file_size column to flipbooks
ALTER TABLE public.flipbooks
ADD COLUMN file_size INTEGER DEFAULT 0;
-- Create trigger to assign free role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'free');
RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_role
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
-- Add INSERT policy for user_roles so users can create their own role
CREATE POLICY "Users can insert their own role" ON public.user_roles FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Create trigger to automatically create 'free' role when user signs up
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
-- Add UPDATE policy for subscriptions table
CREATE POLICY "Users can update their own subscription" ON public.subscriptions FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Create a function to check if user can upload a flipbook based on their role and current count
CREATE OR REPLACE FUNCTION public.can_upload_flipbook(_user_id uuid, _file_size integer) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE user_role app_role;
flipbook_count integer;
BEGIN -- Get user's role
SELECT public.get_user_role(_user_id) INTO user_role;
-- Get current flipbook count
SELECT COUNT(*) INTO flipbook_count
FROM public.flipbooks
WHERE user_id = _user_id;
-- Pro users have unlimited uploads and 50MB file size limit
IF user_role = 'pro' THEN RETURN _file_size <= 52428800;
-- 50MB in bytes
END IF;
-- Free users limited to 3 flipbooks and 10MB file size
IF user_role = 'free' THEN RETURN flipbook_count < 3
AND _file_size <= 10485760;
-- 10MB in bytes
END IF;
-- Default: deny
RETURN false;
END;
$$;
-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert their own flipbooks" ON public.flipbooks;
-- Create new insert policy with limits
CREATE POLICY "Users can insert flipbooks with limits" ON public.flipbooks FOR
INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND public.can_upload_flipbook(auth.uid(), COALESCE(file_size, 0))
  );
-- Add storage policy for file size limits (this is informational - actual size limits are set in bucket settings)
-- Create policy to only allow PDF uploads
CREATE POLICY "Only PDFs can be uploaded to user_pdfs" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (
    bucket_id = 'user_pdfs'
    AND (storage.foldername(name)) [1] = auth.uid()::text
    AND (
      LOWER(storage.extension(name)) = 'pdf'
      OR LOWER(storage.extension(name)) = 'PDF'
    )
  );
-- Allow public viewing of flipbooks based on the is_public flag
CREATE POLICY "Anyone can view public flipbooks" ON public.flipbooks FOR
SELECT USING (is_public = true);
-- Set default to TRUE for new flipbooks
ALTER TABLE public.flipbooks
ALTER COLUMN is_public
SET DEFAULT true;
-- Keep NOT NULL constraint (in case it was removed elsewhere)
ALTER TABLE public.flipbooks
ALTER COLUMN is_public
SET NOT NULL;
-- Optional: uncomment to backfill all existing to public
-- UPDATE public.flipbooks SET is_public = true WHERE is_public = false;
-- Add a URL-friendly slug for human-readable links
-- 1) Column
ALTER TABLE public.flipbooks
ADD COLUMN IF NOT EXISTS slug text;
-- 2) Helper function to slugify text
CREATE OR REPLACE FUNCTION public.slugify(txt text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
SELECT trim(
    both '-'
    from regexp_replace(
        lower(coalesce(txt, '')),
        '[^a-z0-9]+',
        '-',
        'g'
      )
  );
$$;
-- 3) Backfill existing rows
UPDATE public.flipbooks
SET slug = public.slugify(title)
WHERE slug IS NULL;
-- 4) Ensure uniqueness (add suffix for collisions)
DO $$
DECLARE r record;
n int;
base text;
candidate text;
BEGIN FOR r IN
SELECT id,
  slug
FROM public.flipbooks LOOP base := r.slug;
n := 1;
candidate := base;
WHILE EXISTS (
  SELECT 1
  FROM public.flipbooks
  WHERE slug = candidate
    AND id <> r.id
) LOOP n := n + 1;
candidate := base || '-' || n::text;
END LOOP;
IF candidate <> r.slug THEN
UPDATE public.flipbooks
SET slug = candidate
WHERE id = r.id;
END IF;
END LOOP;
END $$;
-- 5) Unique index
CREATE UNIQUE INDEX IF NOT EXISTS flipbooks_slug_key ON public.flipbooks (slug);
-- 6) Trigger to maintain slug on insert/update of title
CREATE OR REPLACE FUNCTION public.set_flipbook_slug() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP = 'INSERT'
  OR (
    TG_OP = 'UPDATE'
    AND NEW.title IS DISTINCT
    FROM OLD.title
  ) THEN NEW.slug := public.slugify(NEW.title);
-- disambiguate if needed
IF EXISTS (
  SELECT 1
  FROM public.flipbooks
  WHERE slug = NEW.slug
    AND id <> COALESCE(NEW.id, gen_random_uuid())
) THEN NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 8);
END IF;
END IF;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_flipbook_slug ON public.flipbooks;
CREATE TRIGGER trg_set_flipbook_slug BEFORE
INSERT
  OR
UPDATE OF title ON public.flipbooks FOR EACH ROW EXECUTE FUNCTION public.set_flipbook_slug();
-- Create function to update timestamps (if it doesn't exist already)
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Create policies
CREATE POLICY "Users can view any profile" ON public.profiles FOR
SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (user_id, full_name, avatar_url)
VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
RETURN NEW;
END;
$$;
-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created_profile
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
-- Add trigger for updated_at timestamp
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Fix the update_updated_at_column function to set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$;
-- Create a secure RPC function to track flipbook views
CREATE OR REPLACE FUNCTION public.track_flipbook_view(
    _flipbook_id UUID,
    _session_id TEXT DEFAULT NULL,
    _user_agent TEXT DEFAULT NULL,
    _ip_address TEXT DEFAULT NULL
  ) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE _view_id UUID;
_user_id UUID;
BEGIN -- Get the current user ID if authenticated
_user_id := auth.uid();
-- Insert the view record
INSERT INTO public.flipbook_views (
    flipbook_id,
    user_id,
    session_id,
    user_agent,
    ip_address,
    viewed_at
  )
VALUES (
    _flipbook_id,
    _user_id,
    _session_id,
    _user_agent,
    _ip_address,
    now()
  )
RETURNING id INTO _view_id;
RETURN _view_id;
END;
$$;
-- Create a secure RPC function to update time spent
CREATE OR REPLACE FUNCTION public.update_view_time_spent(
    _view_id UUID,
    _time_spent_seconds INTEGER
  ) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
UPDATE public.flipbook_views
SET time_spent_seconds = _time_spent_seconds
WHERE id = _view_id;
RETURN FOUND;
END;
$$;
-- Migration: Add 5-tier subscription support
-- Adds new tiers (starter, hobby, business) to app_role enum
-- Adds plan_id column to subscriptions table
-- Step 1: Add new values to app_role enum
ALTER TYPE app_role
ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE app_role
ADD VALUE IF NOT EXISTS 'hobby';
ALTER TYPE app_role
ADD VALUE IF NOT EXISTS 'business';
-- Step 2: Add plan_id column to subscriptions table to track which tier was purchased
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS plan_id TEXT;
-- Step 3: Update existing 'pro' subscriptions to have plan_id set
UPDATE subscriptions
SET plan_id = 'pro'
WHERE status = 'completed'
  AND plan_id IS NULL;
-- Step 4: Add comment for documentation
COMMENT ON COLUMN subscriptions.plan_id IS 'Subscription tier: starter, hobby, business, or pro';
-- Step 5: Update enforce_flipbook_limits trigger function to support all tiers
CREATE OR REPLACE FUNCTION enforce_flipbook_limits() RETURNS TRIGGER AS $$
DECLARE user_role TEXT;
flipbook_count INT;
max_flipbooks INT;
BEGIN -- Get user's role
SELECT role INTO user_role
FROM user_roles
WHERE user_id = NEW.user_id
ORDER BY CASE
    WHEN role = 'pro' THEN 1
    WHEN role = 'business' THEN 2
    WHEN role = 'hobby' THEN 3
    WHEN role = 'starter' THEN 4
    ELSE 5
  END
LIMIT 1;
-- Default to 'free' if no role found
IF user_role IS NULL THEN user_role := 'free';
END IF;
-- Set limits based on tier
CASE
  user_role
  WHEN 'pro' THEN max_flipbooks := 999999;
-- Effectively unlimited
WHEN 'business' THEN max_flipbooks := 20;
WHEN 'hobby' THEN max_flipbooks := 10;
WHEN 'starter' THEN max_flipbooks := 5;
ELSE -- 'free'
max_flipbooks := 1;
END CASE
;
-- Count existing flipbooks
SELECT COUNT(*) INTO flipbook_count
FROM flipbooks
WHERE user_id = NEW.user_id;
-- Enforce limit
IF flipbook_count >= max_flipbooks THEN RAISE EXCEPTION 'Flipbook limit exceeded for % plan. Upgrade to create more flipbooks.',
user_role;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Step 6: Ensure trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS enforce_flipbook_limits_trigger ON flipbooks;
CREATE TRIGGER enforce_flipbook_limits_trigger BEFORE
INSERT ON flipbooks FOR EACH ROW EXECUTE FUNCTION enforce_flipbook_limits();
-- 1. Add columns to store lock status
ALTER TABLE public.flipbooks
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lock_reason text;
-- e.g., 'plan_limit', 'size_limit'
-- 2. Create a function to check limits when a user's plan changes
CREATE OR REPLACE FUNCTION public.handle_plan_downgrade() RETURNS trigger AS $$
DECLARE max_count int;
max_size_mb int;
current_count int;
new_role text;
BEGIN -- Only run if the role changed
IF OLD.role = NEW.role THEN RETURN NEW;
END IF;
new_role := NEW.role::text;
-- Cast enum to text for comparison
-- Define limits based on the NEW role
IF new_role = 'free' THEN max_count := 1;
max_size_mb := 15;
ELSIF new_role = 'pro' THEN max_count := 1000;
-- Unlimited effectively
max_size_mb := 50;
ELSE -- Fallback
max_count := 1;
max_size_mb := 15;
END IF;
-- Step A: Lock files that are too big for the new plan
UPDATE public.flipbooks
SET is_locked = true,
  lock_reason = 'size_limit'
WHERE user_id = NEW.user_id
  AND (file_size / 1024 / 1024) > max_size_mb
  AND is_locked = false;
-- Step B: Check count limit
SELECT count(*) INTO current_count
FROM public.flipbooks
WHERE user_id = NEW.user_id
  AND is_locked = false;
-- If they have too many active flipbooks, lock the newest ones until they fit
IF current_count > max_count THEN
UPDATE public.flipbooks
SET is_locked = true,
  lock_reason = 'plan_limit'
WHERE id IN (
    SELECT id
    FROM public.flipbooks
    WHERE user_id = NEW.user_id
      AND is_locked = false
    ORDER BY created_at DESC
    LIMIT (current_count - max_count)
  );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 3. Attach the trigger to the user_roles table
DROP TRIGGER IF EXISTS on_plan_change ON public.user_roles;
CREATE TRIGGER on_plan_change
AFTER
UPDATE OF role ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.handle_plan_downgrade();
-- 4. Create a function for the User to Toggle Lock status safely
CREATE OR REPLACE FUNCTION public.toggle_flipbook_lock(flipbook_id uuid) RETURNS boolean AS $$
DECLARE target_flipbook record;
user_role_enum public.app_role;
user_role_text text;
max_count int;
max_size_mb int;
current_active int;
BEGIN -- Get the flipbook
SELECT * INTO target_flipbook
FROM public.flipbooks
WHERE id = flipbook_id;
-- Get user's current role from user_roles table
SELECT role INTO user_role_enum
FROM public.user_roles
WHERE user_id = auth.uid();
user_role_text := user_role_enum::text;
-- Set limits
IF user_role_text = 'free' THEN max_count := 1;
max_size_mb := 15;
ELSIF user_role_text = 'pro' THEN max_count := 1000;
max_size_mb := 50;
ELSE max_count := 1;
max_size_mb := 15;
END IF;
-- IF unlocking: Check if we allowed to
IF target_flipbook.is_locked THEN -- Check Size
IF (target_flipbook.file_size / 1024 / 1024) > max_size_mb THEN RAISE EXCEPTION 'This file is too large for your current plan.';
END IF;
-- Check Count
SELECT count(*) INTO current_active
FROM public.flipbooks
WHERE user_id = auth.uid()
  AND is_locked = false;
IF current_active >= max_count THEN RAISE EXCEPTION 'Plan limit reached. Lock another flipbook first.';
END IF;
-- All good? Unlock.
UPDATE public.flipbooks
SET is_locked = false,
  lock_reason = null
WHERE id = flipbook_id;
RETURN true;
ELSE -- IF locking: Always allowed (user wants to free up space)
UPDATE public.flipbooks
SET is_locked = true,
  lock_reason = 'user_locked'
WHERE id = flipbook_id;
RETURN false;
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create flipbook_views table for tracking view analytics
CREATE TABLE IF NOT EXISTS public.flipbook_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flipbook_id UUID REFERENCES public.flipbooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE
  SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    time_spent_seconds INTEGER
);
-- Enable RLS
ALTER TABLE public.flipbook_views ENABLE ROW LEVEL SECURITY;
-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_flipbook_views_flipbook_id ON public.flipbook_views(flipbook_id);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_viewed_at ON public.flipbook_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_user_id ON public.flipbook_views(user_id);
-- RLS Policies
-- Users can view analytics for their own flipbooks
CREATE POLICY "Users can view analytics for their own flipbooks" ON public.flipbook_views FOR
SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.flipbooks
      WHERE flipbooks.id = flipbook_views.flipbook_id
        AND flipbooks.user_id = auth.uid()
    )
  );
-- Anyone can insert views (for public tracking)
CREATE POLICY "Anyone can track views" ON public.flipbook_views FOR
INSERT WITH CHECK (true);
-- Users can delete their own view records (optional, for privacy)
CREATE POLICY "Users can delete views for their own flipbooks" ON public.flipbook_views FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM public.flipbooks
    WHERE flipbooks.id = flipbook_views.flipbook_id
      AND flipbooks.user_id = auth.uid()
  )
);
-- Revoke user access to manipulate roles and subscriptions directly
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
-- Users should only be able to VIEW their own data
-- (The SELECT policies created in previous migrations remain active)
-- Enable users to update their own flipbooks (e.g. rename title)
CREATE POLICY "Users can update their own flipbooks" ON public.flipbooks FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Migration: Synchronize Plan Limits across all DB functions
-- Consolidates triggers and ensures consistent limits with constants.ts
-- 1. Update get_user_role to support all tiers in correct priority
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID) RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT role
FROM public.user_roles
WHERE user_id = _user_id
ORDER BY CASE
    WHEN role = 'pro' THEN 1
    WHEN role = 'business' THEN 2
    WHEN role = 'hobby' THEN 3
    WHEN role = 'starter' THEN 4
    ELSE 5
  END
LIMIT 1 $$;
-- 2. Update can_upload_flipbook to support all tiers and match constants.ts
CREATE OR REPLACE FUNCTION public.can_upload_flipbook(_user_id uuid, _file_size integer) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
DECLARE u_role public.app_role;
active_count integer;
max_count integer;
max_size bigint;
BEGIN -- Get user's role
SELECT public.get_user_role(_user_id) INTO u_role;
-- Set limits based on tier
CASE
  u_role::text
  WHEN 'pro' THEN max_count := 999999;
max_size := 50 * 1024 * 1024;
WHEN 'business' THEN max_count := 20;
max_size := 25 * 1024 * 1024;
WHEN 'hobby' THEN max_count := 10;
max_size := 10 * 1024 * 1024;
WHEN 'starter' THEN max_count := 5;
max_size := 5 * 1024 * 1024;
ELSE max_count := 1;
max_size := 2 * 1024 * 1024;
-- free
END CASE
;
-- Get current ACTIVE flipbook count
SELECT COUNT(*) INTO active_count
FROM public.flipbooks
WHERE user_id = _user_id
  AND (
    is_locked IS FALSE
    OR is_locked IS NULL
  );
RETURN active_count < max_count
AND _file_size <= max_size;
END;
$$;
-- 3. Consolidate and update enforce_flipbook_limits trigger function
CREATE OR REPLACE FUNCTION public.enforce_flipbook_limits() RETURNS TRIGGER AS $$
DECLARE u_role TEXT;
active_flipbook_count INT;
max_count INT;
BEGIN -- Get user's role (cast to text)
u_role := public.get_user_role(NEW.user_id)::TEXT;
-- Set limits based on tier
CASE
  u_role
  WHEN 'pro' THEN max_count := 999999;
WHEN 'business' THEN max_count := 20;
WHEN 'hobby' THEN max_count := 10;
WHEN 'starter' THEN max_count := 5;
ELSE max_count := 1;
-- free
END CASE
;
-- Count existing ACTIVE flipbooks
SELECT COUNT(*) INTO active_flipbook_count
FROM public.flipbooks
WHERE user_id = NEW.user_id
  AND (
    is_locked IS FALSE
    OR is_locked IS NULL
  );
-- Enforce limit
IF active_flipbook_count >= max_count THEN RAISE EXCEPTION 'Flipbook limit reached for % plan (Limit: % active flipbooks). Please lock/delete existing ones or upgrade.',
u_role,
max_count;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Cleanup redundant triggers and ensure one clean trigger on flipbooks
DROP TRIGGER IF EXISTS trg_check_flipbook_limits ON public.flipbooks;
DROP TRIGGER IF EXISTS enforce_flipbook_limits_trigger ON public.flipbooks;
CREATE TRIGGER enforce_flipbook_limits_trigger BEFORE
INSERT ON public.flipbooks FOR EACH ROW EXECUTE FUNCTION public.enforce_flipbook_limits();
-- 4. Update handle_plan_downgrade to handle all tiers
CREATE OR REPLACE FUNCTION public.handle_plan_downgrade() RETURNS trigger AS $$
DECLARE max_count int;
max_size_bytes bigint;
current_active_count int;
new_role_text text;
BEGIN -- Only run if the role changed
IF OLD.role = NEW.role THEN RETURN NEW;
END IF;
new_role_text := NEW.role::text;
-- Define limits based on the NEW role
CASE
  new_role_text
  WHEN 'pro' THEN max_count := 999999;
max_size_bytes := 50 * 1024 * 1024;
WHEN 'business' THEN max_count := 20;
max_size_bytes := 25 * 1024 * 1024;
WHEN 'hobby' THEN max_count := 10;
max_size_bytes := 10 * 1024 * 1024;
WHEN 'starter' THEN max_count := 5;
max_size_bytes := 5 * 1024 * 1024;
ELSE max_count := 1;
max_size_bytes := 2 * 1024 * 1024;
-- free
END CASE
;
-- Step A: Lock files that are too big for the new plan
UPDATE public.flipbooks
SET is_locked = true,
  lock_reason = 'size_limit'
WHERE user_id = NEW.user_id
  AND file_size > max_size_bytes
  AND (
    is_locked IS FALSE
    OR is_locked IS NULL
  );
-- Step B: Check count limit of active flipbooks
SELECT count(*) INTO current_active_count
FROM public.flipbooks
WHERE user_id = NEW.user_id
  AND (
    is_locked IS FALSE
    OR is_locked IS NULL
  );
-- If they still have too many active flipbooks, lock the newest ones until they fit
IF current_active_count > max_count THEN
UPDATE public.flipbooks
SET is_locked = true,
  lock_reason = 'plan_limit'
WHERE id IN (
    SELECT id
    FROM public.flipbooks
    WHERE user_id = NEW.user_id
      AND (
        is_locked IS FALSE
        OR is_locked IS NULL
      )
    ORDER BY created_at DESC
    LIMIT (current_active_count - max_count)
  );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 5. Update toggle_flipbook_lock to handle all tiers
CREATE OR REPLACE FUNCTION public.toggle_flipbook_lock(flipbook_id uuid) RETURNS boolean AS $$
DECLARE target_flipbook record;
u_role_text text;
max_count int;
max_size_bytes bigint;
current_active_count int;
BEGIN -- Get the flipbook
SELECT * INTO target_flipbook
FROM public.flipbooks
WHERE id = flipbook_id;
-- Security check: Ensure user owns the flipbook
IF target_flipbook.user_id != auth.uid() THEN RAISE EXCEPTION 'Unauthorized';
END IF;
-- Get user's current role
u_role_text := public.get_user_role(auth.uid())::TEXT;
-- Set limits based on tier
CASE
  u_role_text
  WHEN 'pro' THEN max_count := 999999;
max_size_bytes := 50 * 1024 * 1024;
WHEN 'business' THEN max_count := 20;
max_size_bytes := 25 * 1024 * 1024;
WHEN 'hobby' THEN max_count := 10;
max_size_bytes := 10 * 1024 * 1024;
WHEN 'starter' THEN max_count := 5;
max_size_bytes := 5 * 1024 * 1024;
ELSE max_count := 1;
max_size_bytes := 2 * 1024 * 1024;
-- free
END CASE
;
-- IF unlocking: Check if allowed
IF target_flipbook.is_locked THEN -- Permanent Lock Check: Plan Limit or Size Limit locks cannot be manually reversed on the current plan
IF target_flipbook.lock_reason = 'size_limit' THEN RAISE EXCEPTION 'This file is too large for your current plan limit. Upgrade to unlock.';
END IF;
IF target_flipbook.lock_reason = 'plan_limit' THEN RAISE EXCEPTION 'This flipbook was locked due to a plan downgrade. Upgrade to unlock this book.';
END IF;
-- Check Count (for user_locked or legacy locks)
SELECT count(*) INTO current_active_count
FROM public.flipbooks
WHERE user_id = auth.uid()
  AND (
    is_locked IS FALSE
    OR is_locked IS NULL
  );
IF current_active_count >= max_count THEN RAISE EXCEPTION 'Plan limit reached (% active flipbooks). Lock another flipbook first or upgrade.',
max_count;
END IF;
-- All good? Unlock.
UPDATE public.flipbooks
SET is_locked = false,
  lock_reason = null
WHERE id = flipbook_id;
RETURN true;
ELSE -- IF locking: Always allowed (user wants to free up space)
UPDATE public.flipbooks
SET is_locked = true,
  lock_reason = 'user_locked'
WHERE id = flipbook_id;
RETURN false;
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. Refine RLS for viewing flipbooks: Don't show locked flipbooks to the public
DROP POLICY IF EXISTS "Anyone can view public flipbooks" ON public.flipbooks;
CREATE POLICY "Anyone can view public flipbooks" ON public.flipbooks FOR
SELECT USING (
    is_public = true
    AND (
      is_locked IS FALSE
      OR is_locked IS NULL
    )
  );