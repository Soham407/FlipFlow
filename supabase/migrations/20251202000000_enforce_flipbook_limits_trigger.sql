-- Additional security layer: Database trigger to enforce flipbook limits
-- This works alongside the RLS policy to prevent limit bypasses
-- Even if someone bypasses the frontend or RLS, this trigger will catch it

-- Create trigger function to check limits before insert
CREATE OR REPLACE FUNCTION public.check_flipbook_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  flipbook_count integer;
BEGIN
  -- Get user's role
  SELECT public.get_user_role(NEW.user_id) INTO user_role;
  
  -- Get current flipbook count (BEFORE insert, so we check existing records)
  SELECT COUNT(*) INTO flipbook_count
  FROM public.flipbooks
  WHERE user_id = NEW.user_id;
  
  -- Pro users have unlimited uploads
  IF user_role = 'pro' THEN
    RETURN NEW;
  END IF;
  
  -- Free users limited to 3 flipbooks
  IF user_role = 'free' THEN
    IF flipbook_count >= 3 THEN
      RAISE EXCEPTION 'Free users are limited to 3 flipbooks. Please upgrade to Pro for unlimited uploads.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  -- Default: allow
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trg_check_flipbook_limits ON public.flipbooks;

-- Create trigger that fires BEFORE INSERT
CREATE TRIGGER trg_check_flipbook_limits
BEFORE INSERT ON public.flipbooks
FOR EACH ROW
EXECUTE FUNCTION public.check_flipbook_limits();

-- Add comment explaining the security layer
COMMENT ON FUNCTION public.check_flipbook_limits() IS 
'Enforces flipbook limits at the database level. Free users are limited to 3 flipbooks. 
This is a security measure to prevent limit bypasses even if frontend validation or RLS policies are circumvented.';

