-- Create a function to check if user can upload a flipbook based on their role and current count
CREATE OR REPLACE FUNCTION public.can_upload_flipbook(_user_id uuid, _file_size integer)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  flipbook_count integer;
BEGIN
  -- Get user's role
  SELECT public.get_user_role(_user_id) INTO user_role;
  
  -- Get current flipbook count
  SELECT COUNT(*) INTO flipbook_count
  FROM public.flipbooks
  WHERE user_id = _user_id;
  
  -- Pro users have unlimited uploads and 50MB file size limit
  IF user_role = 'pro' THEN
    RETURN _file_size <= 52428800; -- 50MB in bytes
  END IF;
  
  -- Free users limited to 3 flipbooks and 10MB file size
  IF user_role = 'free' THEN
    RETURN flipbook_count < 3 AND _file_size <= 10485760; -- 10MB in bytes
  END IF;
  
  -- Default: deny
  RETURN false;
END;
$$;

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert their own flipbooks" ON public.flipbooks;

-- Create new insert policy with limits
CREATE POLICY "Users can insert flipbooks with limits"
ON public.flipbooks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  public.can_upload_flipbook(auth.uid(), COALESCE(file_size, 0))
);

-- Add storage policy for file size limits (this is informational - actual size limits are set in bucket settings)
-- Create policy to only allow PDF uploads
CREATE POLICY "Only PDFs can be uploaded to user_pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  (
    LOWER(storage.extension(name)) = 'pdf' OR
    LOWER(storage.extension(name)) = 'PDF'
  )
);