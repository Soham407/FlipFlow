-- Public sharing for flipbooks

-- 1) Add a column to mark public flipbooks
ALTER TABLE public.flipbooks
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 2) Allow anonymous users to read only public flipbooks
CREATE POLICY IF NOT EXISTS "Public can view public flipbooks"
ON public.flipbooks
FOR SELECT
TO anon
USING (is_public = true);


