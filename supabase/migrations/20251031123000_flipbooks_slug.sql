-- Add a URL-friendly slug for human-readable links

-- 1) Column
ALTER TABLE public.flipbooks
ADD COLUMN IF NOT EXISTS slug text;

-- 2) Helper function to slugify text
CREATE OR REPLACE FUNCTION public.slugify(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(txt, '')),
                '[^a-z0-9]+', '-', 'g'));
$$;

-- 3) Backfill existing rows
UPDATE public.flipbooks
SET slug = public.slugify(title)
WHERE slug IS NULL;

-- 4) Ensure uniqueness (add suffix for collisions)
DO $$
DECLARE r record; n int; base text; candidate text;
BEGIN
  FOR r IN SELECT id, slug FROM public.flipbooks LOOP
    base := r.slug;
    n := 1;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.flipbooks WHERE slug = candidate AND id <> r.id) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    IF candidate <> r.slug THEN
      UPDATE public.flipbooks SET slug = candidate WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 5) Unique index
CREATE UNIQUE INDEX IF NOT EXISTS flipbooks_slug_key ON public.flipbooks (slug);

-- 6) Trigger to maintain slug on insert/update of title
CREATE OR REPLACE FUNCTION public.set_flipbook_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.title IS DISTINCT FROM OLD.title) THEN
    NEW.slug := public.slugify(NEW.title);
    -- disambiguate if needed
    IF EXISTS (SELECT 1 FROM public.flipbooks WHERE slug = NEW.slug AND id <> COALESCE(NEW.id, gen_random_uuid())) THEN
      NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 8);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_flipbook_slug ON public.flipbooks;
CREATE TRIGGER trg_set_flipbook_slug
BEFORE INSERT OR UPDATE OF title ON public.flipbooks
FOR EACH ROW EXECUTE FUNCTION public.set_flipbook_slug();


