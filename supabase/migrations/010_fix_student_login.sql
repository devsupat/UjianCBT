-- =====================================
-- Migration: Fix Student Login
-- Issue: 406 error when querying profiles with schools!inner join
-- Solution: Add username column and create RPC for login lookup
-- =====================================

-- ==========================================
-- 1. ADD USERNAME COLUMN TO PROFILES
-- ==========================================

-- Add username column (unique per school)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    END IF;
END $$;

-- Populate username from full_name for existing records (temporary)
UPDATE public.profiles 
SET username = LOWER(REPLACE(full_name, ' ', ''))
WHERE username IS NULL;

-- Create unique index (username unique per school)
DROP INDEX IF EXISTS idx_profiles_username_school;
CREATE UNIQUE INDEX idx_profiles_username_school 
ON public.profiles(school_id, username);

-- ==========================================
-- 2. CREATE LOGIN LOOKUP RPC FUNCTION
-- ==========================================
-- SECURITY DEFINER allows unauthenticated lookup during login
-- Without this, RLS blocks the query causing 406 error

CREATE OR REPLACE FUNCTION public.lookup_user_for_login(
    p_username TEXT
)
RETURNS TABLE (
    user_id UUID,
    school_id UUID,
    full_name TEXT,
    class_group TEXT,
    status_ujian TEXT,
    waktu_mulai TIMESTAMPTZ,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.school_id,
        p.full_name,
        p.class_group,
        p.status_ujian,
        p.waktu_mulai,
        p.role
    FROM public.profiles p
    WHERE LOWER(p.username) = LOWER(p_username)
       OR LOWER(p.full_name) = LOWER(p_username)  -- Fallback to full_name
    LIMIT 1;
END;
$$;

-- Grant execute to anonymous (for login before auth)
GRANT EXECUTE ON FUNCTION public.lookup_user_for_login(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_user_for_login(TEXT) TO authenticated;

-- ==========================================
-- 3. UPDATE PROFILE CREATION TRIGGER
-- ==========================================
-- Include username from metadata when creating profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, username, school_id, role, class_group)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(
            new.raw_user_meta_data->>'username',
            LOWER(REPLACE(COALESCE(new.raw_user_meta_data->>'full_name', 'user'), ' ', ''))
        ),
        (new.raw_user_meta_data->>'school_id')::uuid,
        COALESCE(new.raw_user_meta_data->>'role', 'STUDENT'),
        new.raw_user_meta_data->>'class_group'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. POLICY FOR ANONYMOUS LOGIN LOOKUP
-- ==========================================
-- Note: The RPC function handles this, but adding for clarity

-- Allow profiles to be read via RPC (function handles filtering)
-- No direct SELECT access for anon - only through RPC

COMMENT ON FUNCTION public.lookup_user_for_login IS 
'Secure login lookup. Returns user profile for login validation. 
Uses SECURITY DEFINER to bypass RLS during unauthenticated login.';
