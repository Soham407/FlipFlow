-- Create a secure RPC function to track flipbook views
CREATE OR REPLACE FUNCTION public.track_flipbook_view(
  _flipbook_id UUID,
  _session_id TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _view_id UUID;
  _user_id UUID;
BEGIN
  -- Get the current user ID if authenticated
  _user_id := auth.uid();
  
  -- Insert the view record
  INSERT INTO public.flipbook_views (
    flipbook_id,
    user_id,
    session_id,
    user_agent,
    ip_address,
    viewed_at
  ) VALUES (
    _flipbook_id,
    _user_id,
    _session_id,
    _user_agent,
    _ip_address,
    now()
  )
  RETURNING id INTO _view_id;
  
  RETURN _view_id;
END;
$$;

-- Create a secure RPC function to update time spent
CREATE OR REPLACE FUNCTION public.update_view_time_spent(
  _view_id UUID,
  _time_spent_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.flipbook_views
  SET time_spent_seconds = _time_spent_seconds
  WHERE id = _view_id;
  
  RETURN FOUND;
END;
$$;