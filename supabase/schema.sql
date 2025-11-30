-- FlipFlow Database Schema
-- This file documents the current state of the database tables and their relationships.
-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('free', 'pro');
-- 2. TABLES
-- Profiles (User Metadata)
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    full_name text NULL,
    avatar_url text NULL,
    bio text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_user_id_key UNIQUE (user_id),
    CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
-- User Roles (RBAC)
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role public.app_role NOT NULL DEFAULT 'free'::app_role,
    created_at timestamp with time zone NULL DEFAULT now(),
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
-- Flipbooks (Core Content)
CREATE TABLE public.flipbooks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    file_path text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    file_size integer NULL DEFAULT 0,
    is_public boolean NOT NULL DEFAULT true,
    slug text NULL,
    is_locked boolean DEFAULT false,
    -- Added via migration 20251130183000
    lock_reason text NULL,
    -- Added via migration 20251130183000
    CONSTRAINT flipbooks_pkey PRIMARY KEY (id),
    CONSTRAINT flipbooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS flipbooks_slug_key ON public.flipbooks USING btree (slug);
-- Flipbook Views (Analytics)
CREATE TABLE public.flipbook_views (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    flipbook_id uuid NOT NULL,
    user_id uuid NULL,
    viewed_at timestamp with time zone NOT NULL DEFAULT now(),
    ip_address text NULL,
    user_agent text NULL,
    session_id text NULL,
    time_spent_seconds integer NULL,
    CONSTRAINT flipbook_views_pkey PRIMARY KEY (id),
    CONSTRAINT flipbook_views_flipbook_id_fkey FOREIGN KEY (flipbook_id) REFERENCES flipbooks (id) ON DELETE CASCADE,
    CONSTRAINT flipbook_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE
    SET NULL
);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_flipbook_id ON public.flipbook_views USING btree (flipbook_id);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_viewed_at ON public.flipbook_views USING btree (viewed_at);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_user_id ON public.flipbook_views USING btree (user_id);
-- Subscriptions (Payments)
CREATE TABLE public.subscriptions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    razorpay_order_id text NULL,
    razorpay_payment_id text NULL,
    razorpay_signature text NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    amount integer NOT NULL,
    currency text NOT NULL DEFAULT 'INR'::text,
    created_at timestamp with time zone NULL DEFAULT now(),
    expires_at timestamp with time zone NULL,
    plan_id text NULL,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_user_id_key UNIQUE (user_id),
    CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);
-- 3. TRIGGERS & FUNCTIONS (Summary)
-- Profiles: update_updated_at_column
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Flipbooks: enforce_flipbook_limits_trigger
CREATE TRIGGER enforce_flipbook_limits_trigger BEFORE
INSERT ON flipbooks FOR EACH ROW EXECUTE FUNCTION enforce_flipbook_limits();
-- Flipbooks: trg_check_flipbook_limits
CREATE TRIGGER trg_check_flipbook_limits BEFORE
INSERT ON flipbooks FOR EACH ROW EXECUTE FUNCTION check_flipbook_limits();
-- Flipbooks: trg_set_flipbook_slug
CREATE TRIGGER trg_set_flipbook_slug BEFORE
INSERT
    OR
UPDATE OF title ON flipbooks FOR EACH ROW EXECUTE FUNCTION set_flipbook_slug();
-- User Roles: on_plan_change (Soft Lock Logic)
-- Added via migration 20251130183000
-- CREATE TRIGGER on_plan_change AFTER UPDATE OF role ON public.user_roles
-- FOR EACH ROW EXECUTE FUNCTION public.handle_plan_downgrade();