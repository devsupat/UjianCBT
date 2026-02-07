-- =====================================
-- Questions Table Schema for Multi-Tenant CBT
-- Task 1.3: Questions & Exams Schema
-- =====================================

-- Questions table with multi-tenant support
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  
  -- Core fields (from code.gs)
  nomor_urut INTEGER NOT NULL,
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('SINGLE', 'COMPLEX', 'TRUE_FALSE_MULTI')),
  pertanyaan TEXT NOT NULL,
  gambar_url TEXT,
  
  -- Options (JSONB for flexibility)
  -- Format: {"a": "...", "b": "...", "c": "...", "d": "...", "e": "..."}
  options JSONB NOT NULL DEFAULT '{}',
  
  -- Answer configuration (JSONB)
  -- Format SINGLE: {"answer": "A"}
  -- Format COMPLEX: {"answers": ["A", "C"]}
  -- Format TRUE_FALSE_MULTI: {"statements": [...], "answers": [true, false, true]}
  correct_answer_config JSONB NOT NULL,
  
  bobot DECIMAL(5,2) DEFAULT 1.0,
  kategori VARCHAR(100),
  paket VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- Indexes for Performance
-- =====================================

CREATE INDEX IF NOT EXISTS idx_questions_school ON public.questions(school_id);
CREATE INDEX IF NOT EXISTS idx_questions_paket ON public.questions(school_id, paket);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(school_id, nomor_urut);

-- =====================================
-- Row Level Security (RLS) Policies
-- IMPORTANT: Using 'ADMIN' (uppercase) to match profiles table convention
-- =====================================

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see questions from their school
CREATE POLICY "Users can view their school's questions"
ON public.questions FOR SELECT
TO authenticated
USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

-- Policy: Admin can insert questions for their school
CREATE POLICY "Admin can insert questions"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Policy: Admin can update their school's questions
CREATE POLICY "Admin can update questions"
ON public.questions FOR UPDATE
TO authenticated
USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Policy: Admin can delete their school's questions
CREATE POLICY "Admin can delete questions"
ON public.questions FOR DELETE
TO authenticated
USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- =====================================
-- Trigger for auto-updated_at
-- =====================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS questions_updated_at ON public.questions;
CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- NOTE: Future optimization
-- For better performance at scale, consider using Custom JWT Claims
-- to embed school_id directly in the auth token instead of subqueries.
-- =====================================
