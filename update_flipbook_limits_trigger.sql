-- Execute this in Supabase Dashboard SQL Editor AFTER adding all enum values
-- This updates the enforce_flipbook_limits trigger to support all 5 tiers

CREATE OR REPLACE FUNCTION enforce_flipbook_limits()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  flipbook_count INT;
  max_flipbooks INT;
BEGIN
  -- Get user's role
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
  IF user_role IS NULL THEN
    user_role := 'free';
  END IF;

  -- Set limits based on tier
  CASE user_role
    WHEN 'pro' THEN
      max_flipbooks := 999999; -- Effectively unlimited
    WHEN 'business' THEN
      max_flipbooks := 20;
    WHEN 'hobby' THEN
      max_flipbooks := 10;
    WHEN 'starter' THEN
      max_flipbooks := 5;
    ELSE -- 'free'
      max_flipbooks := 1;
  END CASE;

  -- Count existing flipbooks
  SELECT COUNT(*) INTO flipbook_count
  FROM flipbooks
  WHERE user_id = NEW.user_id;

  -- Enforce limit
  IF flipbook_count >= max_flipbooks THEN
    RAISE EXCEPTION 'Flipbook limit exceeded for % plan. Upgrade to create more flipbooks.', user_role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS enforce_flipbook_limits_trigger ON flipbooks;
CREATE TRIGGER enforce_flipbook_limits_trigger
  BEFORE INSERT ON flipbooks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_flipbook_limits();

-- Verify trigger exists
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'enforce_flipbook_limits_trigger';
