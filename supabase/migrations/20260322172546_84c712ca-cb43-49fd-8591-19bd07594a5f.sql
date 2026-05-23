
-- Create security definer function to get user's current role and approved status
-- This avoids infinite recursion in RLS policies on the profiles table
CREATE OR REPLACE FUNCTION public.get_own_profile_role_approved(_user_id uuid)
RETURNS TABLE(role text, approved boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role, p.approved
  FROM public.profiles p
  WHERE p.id = _user_id
  LIMIT 1
$$;

-- Drop the potentially recursive policy
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;

-- Recreate with security definer function to prevent infinite recursion
CREATE POLICY "Users can update own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT r.role FROM public.get_own_profile_role_approved(auth.uid()) r)
  AND approved = (SELECT r.approved FROM public.get_own_profile_role_approved(auth.uid()) r)
);
