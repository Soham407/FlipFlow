-- Set default to TRUE for new flipbooks
ALTER TABLE public.flipbooks
ALTER COLUMN is_public SET DEFAULT true;

-- Keep NOT NULL constraint (in case it was removed elsewhere)
ALTER TABLE public.flipbooks
ALTER COLUMN is_public SET NOT NULL;

-- Optional: uncomment to backfill all existing to public
-- UPDATE public.flipbooks SET is_public = true WHERE is_public = false;


