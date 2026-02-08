-- =====================================
-- Migration: Strict Packet Isolation RPC
-- SECURITY FIX: Prevents packet cross-access
-- =====================================

-- DROP existing function if exists
DROP FUNCTION IF EXISTS get_school_questions(UUID);
DROP FUNCTION IF EXISTS get_school_questions(UUID, TEXT);

-- ==========================================
-- STRICT PACKET ISOLATION RPC
-- ==========================================
-- SECURITY: If packet is NULL or empty, return NOTHING (not all questions)
-- This prevents students from bypassing packet filter

CREATE OR REPLACE FUNCTION get_school_questions(
    p_school_id UUID,
    p_paket TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    school_id UUID,
    nomor_urut INTEGER,
    tipe VARCHAR,
    pertanyaan TEXT,
    gambar_url TEXT,
    options JSONB,
    correct_answer_config JSONB,
    bobot DECIMAL,
    kategori VARCHAR,
    paket VARCHAR,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- ADMIN MODE: If no packet specified, return ALL questions for the school
    -- This is used by admin/questions page (bank soal management)
    IF p_paket IS NULL OR TRIM(p_paket) = '' THEN
        RAISE NOTICE 'ADMIN MODE: Returning all questions for school (no packet filter)';
        RETURN QUERY
        SELECT 
            q.id,
            q.school_id,
            q.nomor_urut,
            q.tipe,
            q.pertanyaan,
            q.gambar_url,
            q.options,
            q.correct_answer_config,
            q.bobot,
            q.kategori,
            q.paket,
            q.created_at,
            q.updated_at
        FROM public.questions q
        WHERE q.school_id = p_school_id
        ORDER BY q.paket NULLS FIRST, q.nomor_urut ASC;
        RETURN;
    END IF;
    
    -- Return only questions matching the specified packet
    RETURN QUERY
    SELECT 
        q.id,
        q.school_id,
        q.nomor_urut,
        q.tipe,
        q.pertanyaan,
        q.gambar_url,
        q.options,
        q.correct_answer_config,
        q.bobot,
        q.kategori,
        q.paket,
        q.created_at,
        q.updated_at
    FROM public.questions q
    WHERE q.school_id = p_school_id
      AND q.paket = p_paket
    ORDER BY q.nomor_urut ASC;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_school_questions(UUID, TEXT) TO authenticated;

-- ==========================================
-- COMMENT: Security Notes
-- ==========================================
-- 1. NULL packet = Empty result (not "all questions")
-- 2. SECURITY DEFINER ensures RLS bypass for reading
-- 3. Packet must exactly match - no wildcards
-- ==========================================
