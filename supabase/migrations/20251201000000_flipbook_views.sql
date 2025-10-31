-- Create flipbook_views table for tracking view analytics

CREATE TABLE IF NOT EXISTS public.flipbook_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flipbook_id UUID REFERENCES public.flipbooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  time_spent_seconds INTEGER
);

-- Enable RLS
ALTER TABLE public.flipbook_views ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_flipbook_views_flipbook_id ON public.flipbook_views(flipbook_id);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_viewed_at ON public.flipbook_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_flipbook_views_user_id ON public.flipbook_views(user_id);

-- RLS Policies

-- Users can view analytics for their own flipbooks
CREATE POLICY "Users can view analytics for their own flipbooks"
  ON public.flipbook_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flipbooks
      WHERE flipbooks.id = flipbook_views.flipbook_id
      AND flipbooks.user_id = auth.uid()
    )
  );

-- Anyone can insert views (for public tracking)
CREATE POLICY "Anyone can track views"
  ON public.flipbook_views
  FOR INSERT
  WITH CHECK (true);

-- Users can delete their own view records (optional, for privacy)
CREATE POLICY "Users can delete views for their own flipbooks"
  ON public.flipbook_views
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.flipbooks
      WHERE flipbooks.id = flipbook_views.flipbook_id
      AND flipbooks.user_id = auth.uid()
    )
  );

