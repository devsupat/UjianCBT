-- =====================================
-- Phase 3: Database Updates for Auth & Responses
-- Tasks: 3.2, 3.4
-- =====================================

-- ==========================================
-- UPDATE PROFILES TABLE (Add Exam State)
-- ==========================================
-- Add columns to track exam progress and results
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status_ujian TEXT CHECK (status_ujian IN ('BELUM', 'SEDANG', 'SELESAI', 'DISKUALIFIKASI')) DEFAULT 'BELUM',
ADD COLUMN IF NOT EXISTS waktu_mulai TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS waktu_selesai TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS skor_akhir DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS violation_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Create index for exam status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(school_id, status_ujian);

-- ==========================================
-- RESPONSES TABLE (Exam Results)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Exam data
  answers JSONB NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  duration_minutes INT,
  violation_log TEXT,
  status TEXT CHECK (status IN ('SELESAI', 'DISKUALIFIKASI')) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_responses_school ON public.responses(school_id);
CREATE INDEX IF NOT EXISTS idx_responses_student ON public.responses(student_id);
CREATE INDEX IF NOT EXISTS idx_responses_created ON public.responses(school_id, created_at DESC);

-- Constraint: Prevent duplicate submissions (one response per student)
-- Note: This prevents multiple exam attempts. Remove if you want to allow retakes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_responses_unique_student 
ON public.responses(student_id);

-- ==========================================
-- RLS POLICIES FOR RESPONSES
-- ==========================================
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own responses
CREATE POLICY "Users can view own responses"
ON public.responses FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Policy: Admin can view all responses from their school
CREATE POLICY "Admin can view school responses"
ON public.responses FOR SELECT
TO authenticated
USING (
  school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Policy: System can insert responses (via RPC function)
CREATE POLICY "System can insert responses"
ON public.responses FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
);

-- ==========================================
-- CALCULATE SCORE RPC FUNCTION (Task 3.4)
-- ==========================================
-- Main scoring logic - prevents client-side manipulation
CREATE OR REPLACE FUNCTION public.calculate_score(
  p_answers JSONB,
  p_forced BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  score DECIMAL,
  status TEXT,
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_school_id UUID;
  v_total_score DECIMAL := 0;
  v_max_score DECIMAL := 0;
  v_final_score DECIMAL;
  v_violation_count INT;
  v_waktu_mulai TIMESTAMPTZ;
  v_duration_minutes INT;
  v_exam_status TEXT;
  v_question RECORD;
  v_answer JSONB;
  v_correct_answer JSONB;
  v_correct_count INT;
  v_statement_count INT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user profile and check if already completed
  SELECT school_id, status_ujian, waktu_mulai, violation_count
  INTO v_school_id, v_exam_status, v_waktu_mulai, v_violation_count
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_exam_status IN ('SELESAI', 'DISKUALIFIKASI') THEN
    RAISE EXCEPTION 'Exam already completed';
  END IF;

  -- Calculate duration
  v_duration_minutes := EXTRACT(EPOCH FROM (NOW() - v_waktu_mulai)) / 60;

  -- Loop through questions and calculate score
  FOR v_question IN 
    SELECT id, tipe, correct_answer_config, bobot
    FROM public.questions
    WHERE school_id = v_school_id
  LOOP
    v_max_score := v_max_score + v_question.bobot;
    
    -- Get student's answer for this question
    v_answer := p_answers->v_question.id::text;
    
    IF v_answer IS NULL THEN
      CONTINUE; -- Skip unanswered questions
    END IF;

    -- Score based on question type
    CASE v_question.tipe
      WHEN 'SINGLE' THEN
        -- Single choice: exact match
        v_correct_answer := v_question.correct_answer_config->'answer';
        IF v_answer = v_correct_answer THEN
          v_total_score := v_total_score + v_question.bobot;
        END IF;

      WHEN 'COMPLEX' THEN
        -- Multiple choice: all answers must match
        v_correct_answer := v_question.correct_answer_config->'answers';
        IF v_answer::jsonb @> v_correct_answer::jsonb 
           AND v_correct_answer::jsonb @> v_answer::jsonb THEN
          v_total_score := v_total_score + v_question.bobot;
        END IF;

      WHEN 'TRUE_FALSE_MULTI' THEN
        -- True/False statements: proportional scoring
        v_correct_answer := v_question.correct_answer_config->'answers';
        v_statement_count := jsonb_array_length(v_correct_answer);
        v_correct_count := 0;

        -- Count matching answers
        FOR i IN 0..(v_statement_count - 1) LOOP
          IF (v_answer->i)::boolean = (v_correct_answer->i)::boolean THEN
            v_correct_count := v_correct_count + 1;
          END IF;
        END LOOP;

        -- Proportional score
        v_total_score := v_total_score + 
          (v_correct_count::DECIMAL / v_statement_count) * v_question.bobot;
    END CASE;
  END LOOP;

  -- Calculate final score (0-100 scale)
  v_final_score := CASE 
    WHEN v_max_score > 0 THEN (v_total_score / v_max_score) * 100
    ELSE 0
  END;

  -- Determine status
  v_exam_status := CASE 
    WHEN p_forced THEN 'DISKUALIFIKASI'
    ELSE 'SELESAI'
  END;

  -- Update profile
  UPDATE public.profiles
  SET 
    status_ujian = v_exam_status,
    waktu_selesai = NOW(),
    skor_akhir = v_final_score
  WHERE id = v_user_id;

  -- Insert response record
  INSERT INTO public.responses (
    school_id,
    student_id,
    answers,
    score,
    duration_minutes,
    violation_log,
    status
  ) VALUES (
    v_school_id,
    v_user_id,
    p_answers,
    v_final_score,
    v_duration_minutes,
    'Tab switches: ' || v_violation_count::text,
    v_exam_status
  );

  -- Return result
  RETURN QUERY SELECT 
    v_final_score as score,
    v_exam_status as status,
    jsonb_build_object(
      'total_score', v_total_score,
      'max_score', v_max_score,
      'duration_minutes', v_duration_minutes,
      'violations', v_violation_count
    ) as details;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.calculate_score(JSONB, BOOLEAN) TO authenticated;

-- ==========================================
-- HELPER FUNCTION: Report Violation
-- ==========================================
CREATE OR REPLACE FUNCTION public.report_violation(
  p_violation_type TEXT
)
RETURNS TABLE(
  current_violations INT,
  is_disqualified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_new_count INT;
  v_max_violations INT := 3; -- TODO: Get from config
BEGIN
  v_user_id := auth.uid();
  
  UPDATE public.profiles
  SET 
    violation_count = COALESCE(violation_count, 0) + 1,
    last_seen = NOW()
  WHERE id = v_user_id
  RETURNING violation_count INTO v_new_count;

  -- Check if should be disqualified
  IF v_new_count >= v_max_violations THEN
    UPDATE public.profiles
    SET status_ujian = 'DISKUALIFIKASI'
    WHERE id = v_user_id;
    
    RETURN QUERY SELECT v_new_count, TRUE;
  ELSE
    RETURN QUERY SELECT v_new_count, FALSE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_violation(TEXT) TO authenticated;

-- ==========================================
-- NOTES:
-- 1. calculate_score uses SECURITY DEFINER to bypass RLS for inserts
-- 2. All queries filtered by school_id from user's profile
-- 3. Duplicate submission prevented by unique index
-- ==========================================
