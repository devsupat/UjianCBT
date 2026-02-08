-- ============================================================================
-- DIAGNOSTIC & FIX: Check why questions return 0
-- Run this in Supabase SQL Editor step by step
-- ============================================================================

-- ############################################################################
-- STEP 1: CHECK IF THERE IS ANY DATA (bypass RLS with service role)
-- ############################################################################

-- Check total questions in database (run this first)
SELECT COUNT(*) as total_questions FROM public.questions;

-- Check questions per school_id
SELECT school_id, COUNT(*) as count 
FROM public.questions 
GROUP BY school_id;

-- Check if questions exist for YOUR school_id
SELECT COUNT(*) as your_school_questions 
FROM public.questions 
WHERE school_id = 'a7da11a4-81c7-4c39-af1f-26df5cbc2178';


-- ############################################################################
-- STEP 2: IF NO QUESTIONS EXIST, INSERT SAMPLE DATA
-- ############################################################################

-- Only run this if the above returns 0
INSERT INTO public.questions (
    school_id,
    nomor_urut,
    tipe,
    pertanyaan,
    options,
    correct_answer_config,
    bobot,
    kategori,
    paket
) VALUES 
(
    'a7da11a4-81c7-4c39-af1f-26df5cbc2178',
    1,
    'SINGLE',
    'Apa ibukota Indonesia?',
    '{"a": "Jakarta", "b": "Surabaya", "c": "Bandung", "d": "Medan", "e": "Makassar"}',
    '{"answer": "A"}',
    1.0,
    'Umum',
    'paket_a'
),
(
    'a7da11a4-81c7-4c39-af1f-26df5cbc2178',
    2,
    'SINGLE',
    'Berapa hasil dari 5 x 5?',
    '{"a": "10", "b": "15", "c": "20", "d": "25", "e": "30"}',
    '{"answer": "D"}',
    1.0,
    'Matematika',
    'paket_a'
),
(
    'a7da11a4-81c7-4c39-af1f-26df5cbc2178',
    3,
    'TRUE_FALSE_MULTI',
    'Tentukan benar atau salah pernyataan berikut:',
    '{}',
    '{"statements": ["Indonesia adalah negara kepulauan", "Jakarta terletak di Pulau Sumatera", "Indonesia memiliki lebih dari 17.000 pulau"], "answers": [true, false, true]}',
    1.0,
    'Geografi',
    'paket_a'
);


-- ############################################################################
-- STEP 3: VERIFY RLS FUNCTION WORKS
-- ############################################################################

-- Test the function (should return your school_id)
SELECT public.get_my_school_id() as my_school_id;

-- If NULL, your profile doesn't have school_id set. Run this:
-- UPDATE public.profiles 
-- SET school_id = 'a7da11a4-81c7-4c39-af1f-26df5cbc2178' 
-- WHERE id = '14674213-bfdd-44e3-8c55-f0d1babcefd8';


-- ############################################################################
-- STEP 4: TEST SELECT WITH RLS
-- ############################################################################

-- This should now return your questions
SELECT id, nomor_urut, pertanyaan, tipe 
FROM public.questions 
WHERE school_id = public.get_my_school_id()
ORDER BY nomor_urut;


-- ############################################################################
-- STEP 5: CHECK POLICIES ARE APPLIED
-- ############################################################################

SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'questions';
