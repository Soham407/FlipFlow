-- Create flipbooks table
CREATE TABLE public.flipbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flipbooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flipbooks
CREATE POLICY "Users can view their own flipbooks"
  ON public.flipbooks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flipbooks"
  ON public.flipbooks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flipbooks"
  ON public.flipbooks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_pdfs', 'user_pdfs', false);

-- Storage policies
CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user_pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own PDFs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user_pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user_pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );