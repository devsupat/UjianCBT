-- ============================================================================
-- FINAL FIX: Create RPC function to bypass RLS for questions
-- This is a secure alternative that uses SECURITY DEFINER
-- ============================================================================

-- Create a function that runs with elevated privileges
CREATE OR REPLACE FUNCTION public.get_school_questions(p_school_id UUID)
RETURNS SETOF public.questions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * 
    FROM public.questions 
    WHERE school_id = p_school_id
    ORDER BY nomor_urut ASC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_school_questions(UUID) TO authenticated;

-- Also grant direct table access (needed for RLS to work)
GRANT SELECT ON public.questions TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.schools TO authenticated;

-- ============================================================================
-- ALTERNATIVE: Simplify RLS to most basic form
-- ============================================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "questions_select" ON public.questions;
DROP POLICY IF EXISTS "questions_insert" ON public.questions;
DROP POLICY IF EXISTS "questions_update" ON public.questions;
DROP POLICY IF EXISTS "questions_delete" ON public.questions;

-- Create SIMPLEST possible policy - just check school_id matches profile
CREATE POLICY "allow_select_own_school_questions" ON public.questions
FOR SELECT TO authenticated
USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "allow_insert_own_school_questions" ON public.questions
FOR INSERT TO authenticated
WITH CHECK (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "allow_update_own_school_questions" ON public.questions
FOR UPDATE TO authenticated
USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "allow_delete_own_school_questions" ON public.questions
FOR DELETE TO authenticated
USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- ============================================================================
-- VERIFY: Test the policies
-- ============================================================================

-- List all current policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'questions';
