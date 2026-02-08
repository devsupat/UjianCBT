-- ============================================================================
-- SUPABASE MIGRATION 004: Fix RLS Policies (v3 - Fix Profiles 500 Error)
-- Generated: 2026-02-08
-- ============================================================================


-- ############################################################################
-- SECTION 1: DROP ALL POLICIES FIRST
-- ############################################################################

-- Drop Questions policies
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_insert_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_update_policy" ON public.questions;
DROP POLICY IF EXISTS "questions_delete_policy" ON public.questions;
DROP POLICY IF EXISTS "Users can view their school's questions" ON public.questions;
DROP POLICY IF EXISTS "Admin can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Admin can update questions" ON public.questions;
DROP POLICY IF EXISTS "Admin can delete questions" ON public.questions;

-- Drop Schools policies
DROP POLICY IF EXISTS "schools_select_policy" ON public.schools;
DROP POLICY IF EXISTS "schools_insert_policy" ON public.schools;
DROP POLICY IF EXISTS "schools_update_policy" ON public.schools;
DROP POLICY IF EXISTS "schools_delete_policy" ON public.schools;
DROP POLICY IF EXISTS "Users can view their own school data" ON public.schools;
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
DROP POLICY IF EXISTS "Admins can view their school" ON public.schools;
DROP POLICY IF EXISTS "Admins can view their own school" ON public.schools;
DROP POLICY IF EXISTS "Admin can update their school data" ON public.schools;
DROP POLICY IF EXISTS "Admins can update their school" ON public.schools;
DROP POLICY IF EXISTS "Admins can update their school's exam_config" ON public.schools;

-- Drop Responses policies (if exists)
DROP POLICY IF EXISTS "Users can view own responses" ON public.responses;
DROP POLICY IF EXISTS "Admin can view school responses" ON public.responses;
DROP POLICY IF EXISTS "System can insert responses" ON public.responses;
DROP POLICY IF EXISTS "Students can insert responses" ON public.responses;

-- Drop ALL Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view school profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;


-- ############################################################################
-- SECTION 2: RECREATE FUNCTION
-- ############################################################################

DROP FUNCTION IF EXISTS public.get_my_school_id();

CREATE OR REPLACE FUNCTION public.get_my_school_id()
RETURNS UUID AS $$
  SELECT school_id 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_my_school_id() TO authenticated;


-- ############################################################################
-- SECTION 3: PROFILES POLICIES (SIMPLIFIED - NO CIRCULAR REFERENCE)
-- ############################################################################

-- Policy: User can SELECT their own profile (simple, direct auth.uid() check)
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: User can UPDATE their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Allow INSERT for new profiles (during signup)
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());


-- ############################################################################
-- SECTION 4: SCHOOLS POLICIES
-- ############################################################################

CREATE POLICY "schools_select"
ON public.schools FOR SELECT
TO authenticated
USING (id = public.get_my_school_id());

CREATE POLICY "schools_update"
ON public.schools FOR UPDATE
TO authenticated
USING (id = public.get_my_school_id())
WITH CHECK (id = public.get_my_school_id());


-- ############################################################################
-- SECTION 5: QUESTIONS POLICIES
-- ############################################################################

CREATE POLICY "questions_select"
ON public.questions FOR SELECT
TO authenticated
USING (school_id = public.get_my_school_id());

CREATE POLICY "questions_insert"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_my_school_id());

CREATE POLICY "questions_update"
ON public.questions FOR UPDATE
TO authenticated
USING (school_id = public.get_my_school_id())
WITH CHECK (school_id = public.get_my_school_id());

CREATE POLICY "questions_delete"
ON public.questions FOR DELETE
TO authenticated
USING (school_id = public.get_my_school_id());


-- ############################################################################
-- SECTION 6: RESPONSES POLICIES (if table exists)
-- ############################################################################

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'responses') THEN
    EXECUTE 'CREATE POLICY "responses_select_own"
      ON public.responses FOR SELECT TO authenticated
      USING (student_id = auth.uid())';

    EXECUTE 'CREATE POLICY "responses_insert"
      ON public.responses FOR INSERT TO authenticated
      WITH CHECK (student_id = auth.uid() AND school_id = public.get_my_school_id())';
  END IF;
END $$;


-- ############################################################################
-- VERIFICATION - Run these after migration
-- ############################################################################

-- 1. Test get_my_school_id function:
-- SELECT public.get_my_school_id();

-- 2. Test profiles (should return your profile):
-- SELECT * FROM public.profiles WHERE id = auth.uid();

-- 3. Test questions (should return your school's questions):
-- SELECT COUNT(*) FROM public.questions;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
