-- =====================================
-- Fix Profiles RLS - Avoid Infinite Recursion
-- Created: 2026-02-08
-- =====================================

-- The previous RLS policy caused infinite recursion because
-- it tried to SELECT from profiles while querying profiles.
-- Solution: Use a SECURITY DEFINER function to get school_id.

-- ==========================================
-- HELPER FUNCTION: Get current user's school_id
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;

-- ==========================================
-- HELPER FUNCTION: Check if current user is admin
-- ==========================================

CREATE OR REPLACE FUNCTION public.am_i_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.am_i_admin() TO authenticated;

-- ==========================================
-- PROFILES TABLE: Drop ALL existing policies
-- ==========================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view their school profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in their school" ON public.profiles;

-- ==========================================
-- PROFILES TABLE: Create new RLS policies using helper functions
-- ==========================================

-- Policy: Users can view profiles in their school
-- Uses helper function to avoid recursion
CREATE POLICY "Users can view school profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  school_id = public.get_my_school_id()
);

-- Policy: Admins can INSERT new profiles to their school
CREATE POLICY "Admins can insert to their school"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  public.am_i_admin() AND school_id = public.get_my_school_id()
);

-- Policy: Admins can UPDATE profiles in their school (not their own role)
CREATE POLICY "Admins can update their school profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  public.am_i_admin() AND school_id = public.get_my_school_id()
);

-- Policy: Admins can DELETE profiles in their school (not themselves)
CREATE POLICY "Admins can delete their school profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
  public.am_i_admin() 
  AND school_id = public.get_my_school_id()
  AND id != auth.uid()  -- Cannot delete yourself
);

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Test the helper functions:
-- SELECT public.get_my_school_id();
-- SELECT public.am_i_admin();
-- 
-- Then test profile visibility:
-- SELECT * FROM public.profiles;
