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