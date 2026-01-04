-- Allow public viewing of flipbooks based on the is_public flag
CREATE POLICY "Anyone can view public flipbooks" ON public.flipbooks FOR
SELECT USING (is_public = true);