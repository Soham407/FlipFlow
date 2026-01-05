-- Enable users to update their own flipbooks (e.g. rename title)
CREATE POLICY "Users can update their own flipbooks" ON public.flipbooks FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);