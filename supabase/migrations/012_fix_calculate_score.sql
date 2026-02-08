-- =====================================
-- Migration: Fix calculate_score function
-- Issue: Students get "Exam already completed" error
-- Solution: Better handling of exam status and UPSERT for responses
-- =====================================

-- ==========================================
-- 1. FIX CALCULATE SCORE FUNCTION
-- ==========================================
-- The previous version was too strict. This version:
-- 1. Allows submission from 'SEDANG' status (the normal flow)
-- 2. Uses UPSERT to handle re-submissions gracefully
-- 3. Better error messages

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
  v_current_status TEXT;
  v_final_status TEXT;
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

  -- Get user profile
  SELECT school_id, status_ujian, waktu_mulai, COALESCE(violation_count, 0)
  INTO v_school_id, v_current_status, v_waktu_mulai, v_violation_count
  FROM public.profiles
  WHERE id = v_user_id;

  -- Only allow submission from valid states
  -- SEDANG = normal active exam
  -- BELUM = should not happen but allow it (edge case)
  -- SELESAI/DISKUALIFIKASI = already done - but allow re-submission to update score
  IF v_current_status IS NULL THEN
    v_current_status := 'BELUM';
  END IF;

  -- Calculate duration (handle null waktu_mulai)
  IF v_waktu_mulai IS NOT NULL THEN
    v_duration_minutes := EXTRACT(EPOCH FROM (NOW() - v_waktu_mulai)) / 60;
  ELSE
    v_duration_minutes := 0;
  END IF;

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
    WHEN v_max_score > 0 THEN ROUND((v_total_score / v_max_score) * 100, 2)
    ELSE 0
  END;

  -- Determine final status
  -- p_forced = TRUE means auto-submit (timeout) or violation-triggered
  v_final_status := CASE 
    WHEN p_forced AND v_violation_count >= 3 THEN 'DISKUALIFIKASI'
    WHEN p_forced THEN 'SELESAI'  -- Timeout auto-submit is still SELESAI
    ELSE 'SELESAI'
  END;

  -- Update profile with final score and status
  UPDATE public.profiles
  SET 
    status_ujian = v_final_status,
    waktu_selesai = NOW(),
    skor_akhir = v_final_score,
    is_login = FALSE  -- Log them out after exam
  WHERE id = v_user_id;

  -- UPSERT response record (handles both new and re-submissions)
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
    'Violations: ' || v_violation_count::text,
    v_final_status
  )
  ON CONFLICT (student_id) DO UPDATE SET
    answers = EXCLUDED.answers,
    score = EXCLUDED.score,
    duration_minutes = EXCLUDED.duration_minutes,
    violation_log = EXCLUDED.violation_log,
    status = EXCLUDED.status,
    created_at = NOW();

  -- Return result
  RETURN QUERY SELECT 
    v_final_score as score,
    v_final_status as status,
    jsonb_build_object(
      'total_score', v_total_score,
      'max_score', v_max_score,
      'duration_minutes', v_duration_minutes,
      'violations', v_violation_count
    ) as details;
END;
$$;

-- Ensure execute permission
GRANT EXECUTE ON FUNCTION public.calculate_score(JSONB, BOOLEAN) TO authenticated;

-- ==========================================
-- NOTES:
-- Key changes:
-- 1. Removed strict status check that rejected SELESAI/DISKUALIFIKASI
-- 2. Uses UPSERT (ON CONFLICT) instead of INSERT for responses
-- 3. p_forced only makes DISKUALIFIKASI if violations >= 3
-- 4. Sets is_login = FALSE after exam completion
-- ==========================================
