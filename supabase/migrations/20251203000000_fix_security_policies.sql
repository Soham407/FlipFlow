-- Revoke user access to manipulate roles and subscriptions directly
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
-- Users should only be able to VIEW their own data
-- (The SELECT policies created in previous migrations remain active)