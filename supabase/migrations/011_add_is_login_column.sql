-- =====================================
-- Migration: Add is_login column to profiles
-- Issue: 400 error when resetting login - column doesn't exist
-- Solution: Add is_login boolean column for tracking login status
-- =====================================

-- ==========================================
-- 1. ADD is_login COLUMN TO PROFILES
-- ==========================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_login'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_login BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add index for better query performance on login status
CREATE INDEX IF NOT EXISTS idx_profiles_is_login 
ON public.profiles(is_login) WHERE is_login = TRUE;

-- ==========================================
-- 2. RLS POLICIES FOR PROFILE UPDATES
-- ==========================================

-- Student can update their OWN profile (for is_login, status_ujian, last_seen)
DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles;
CREATE POLICY "Students can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin can update login status for students in their school
DROP POLICY IF EXISTS "Admin can reset student login" ON public.profiles;
CREATE POLICY "Admin can reset student login"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles admin_profile
        WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'ADMIN'
        AND admin_profile.school_id = profiles.school_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles admin_profile
        WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'ADMIN'
        AND admin_profile.school_id = profiles.school_id
    )
);

-- ==========================================
-- 3. ADD RLS POLICY FOR ADMIN TO DELETE RESPONSES
-- ==========================================
-- Admin needs to delete responses when resetting student exams

DROP POLICY IF EXISTS "Admin can delete student responses" ON public.responses;
CREATE POLICY "Admin can delete student responses"
ON public.responses FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles admin_profile
        WHERE admin_profile.id = auth.uid()
        AND admin_profile.role = 'ADMIN'
        AND admin_profile.school_id = responses.school_id
    )
);

-- ==========================================
-- 4. DOCUMENTATION
-- ==========================================
COMMENT ON COLUMN public.profiles.is_login IS 
'Tracks whether a student is currently logged in. Used by admin to reset login sessions.';
