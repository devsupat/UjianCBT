-- =====================================
-- Smart Exam Features Migration
-- Token management, packet activation, class levels
-- =====================================

-- ==========================================
-- SCHOOLS TABLE: Add exam control columns
-- ==========================================

-- Add exam token (6 chars, readable format)
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS exam_token TEXT DEFAULT NULL;

-- Add active packets (JSONB with lowercase keys)
-- Structure: {"paket_a": false, "paket_b": false, "paket_c": false}
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS active_packets JSONB DEFAULT '{"paket_a": false, "paket_b": false, "paket_c": false}'::jsonb;

-- ==========================================
-- QUESTIONS TABLE: Add packet and class columns
-- ==========================================

-- Add packet type (A=SD, B=SMP, C=SMA)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS packet_type TEXT CHECK (packet_type IN ('A', 'B', 'C'));

-- Add class level (1-6=SD, 7-9=SMP, 10-12=SMA)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS class_level TEXT;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_questions_packet ON public.questions(packet_type);
CREATE INDEX IF NOT EXISTS idx_questions_class ON public.questions(class_level);

-- ==========================================
-- STORAGE BUCKET: question-images
-- ==========================================

-- Create bucket via Supabase Dashboard or API
-- Bucket name: question-images
-- Public: false (RLS controlled)

-- Storage policies must be created via Supabase Dashboard:
-- 1. SELECT (public): Allow authenticated users to view images
-- 2. INSERT: Admin can upload to their school folder (school_id/filename)
-- 3. UPDATE/DELETE: Admin can modify only their school's images

-- NOTE: Storage policies cannot be created via SQL directly.
-- You must create them in Supabase Dashboard > Storage > Policies

-- ==========================================
-- FUNCTION: Validate packet activation
-- ==========================================

-- Check if a packet is active for a school
CREATE OR REPLACE FUNCTION public.is_packet_active(
    p_school_id UUID,
    p_packet_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_packets JSONB;
    v_key TEXT;
BEGIN
    -- Get active packets for school
    SELECT active_packets INTO v_active_packets
    FROM public.schools
    WHERE id = p_school_id;
    
    IF v_active_packets IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Map packet type to lowercase key
    v_key := 'paket_' || lower(p_packet_type);
    
    RETURN COALESCE((v_active_packets->>v_key)::boolean, FALSE);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_packet_active(UUID, TEXT) TO authenticated;

-- ==========================================
-- RLS POLICIES: Schools exam settings
-- ==========================================

-- Drop old policies if exist (prevent conflicts)
DROP POLICY IF EXISTS "Admin can update exam settings" ON public.schools;

-- Policy: Admin can update their school's exam settings
CREATE POLICY "Admin can update exam settings"
ON public.schools FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.school_id = schools.id
        AND profiles.role = 'ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.school_id = schools.id
        AND profiles.role = 'ADMIN'
    )
);

-- ==========================================
-- UPDATE EXISTING DATA (if any)
-- ==========================================

-- Set default active_packets for existing schools without it
UPDATE public.schools 
SET active_packets = '{"paket_a": false, "paket_b": false, "paket_c": false}'::jsonb
WHERE active_packets IS NULL;

-- ==========================================
-- VERIFICATION QUERIES (run manually)
-- ==========================================

-- Check schools table structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'schools';

-- Check questions table structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'questions';

-- Test packet activation function:
-- SELECT is_packet_active('your-school-id', 'A');
