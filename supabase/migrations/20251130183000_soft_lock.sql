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