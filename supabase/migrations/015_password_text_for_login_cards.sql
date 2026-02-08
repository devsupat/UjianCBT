-- =====================================
-- FIX MIGRATION: Add password_text & Login Card View
-- =====================================

-- 1. Add password_text column to profiles (jika belum ada)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_text TEXT;

-- 2. Add username column (jika belum ada)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- 3. Add Comments
COMMENT ON COLUMN public.profiles.password_text IS 
'Plain text password stored for printing login cards. Updated on create/reset.';

-- 4. Create View for Login Cards (CORRECTED COLUMN NAME)
CREATE OR REPLACE VIEW public.student_login_cards AS
SELECT 
    p.id,
    p.full_name,
    p.username,
    p.password_text,
    p.class_group,
    p.school_id,
    s.name as school_name  -- <--- SAYA UBAH DARI s.school_name JADI s.name
FROM public.profiles p
LEFT JOIN public.schools s ON p.school_id = s.id
WHERE p.role = 'STUDENT';

-- 5. Grant Access
GRANT SELECT ON public.student_login_cards TO authenticated;