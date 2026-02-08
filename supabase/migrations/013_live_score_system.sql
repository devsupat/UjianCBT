-- =====================================
-- Migration: Live Score System (CAT BKN Style)
-- Real-time score calculation using PostgreSQL triggers
-- =====================================

-- ==========================================
-- 1. CREATE STUDENT_ANSWERS TABLE
-- ==========================================
-- Stores individual answers for real-time scoring

CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    
    -- Answer value (flexible JSONB)
    -- SINGLE: "A" 
    -- COMPLEX: ["A", "C"]
    -- TRUE_FALSE_MULTI: [true, false, true, false]
    answer_value JSONB NOT NULL,
    
    -- Calculated by trigger
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One answer per student per question (allows update on re-answer)
    UNIQUE(student_id, question_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_answers_student ON public.student_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_school ON public.student_answers(school_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question ON public.student_answers(question_id);

-- ==========================================
-- 2. ENABLE RLS ON STUDENT_ANSWERS
-- ==========================================

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Policy: Students can INSERT their own answers
CREATE POLICY "Students can insert own answers"
ON public.student_answers FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Policy: Students can UPDATE their own answers (re-answer)
CREATE POLICY "Students can update own answers"
ON public.student_answers FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Policy: Students can SELECT their own answers
CREATE POLICY "Students can view own answers"
ON public.student_answers FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Policy: Admin can view all answers in their school
CREATE POLICY "Admin can view school answers"
ON public.student_answers FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
        AND p.school_id = student_answers.school_id
    )
);

-- Policy: Admin can delete answers (for reset)
CREATE POLICY "Admin can delete school answers"
ON public.student_answers FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
        AND p.school_id = student_answers.school_id
    )
);

-- ==========================================
-- 3. CALCULATE RUNNING SCORE FUNCTION
-- ==========================================
-- Key Features:
-- - Packet isolation (only counts questions in student's paket)
-- - Complete TRUE_FALSE_MULTI logic with proportional scoring
-- - Updates profiles.skor_akhir in real-time

CREATE OR REPLACE FUNCTION calculate_running_score()
RETURNS TRIGGER AS $$
DECLARE
    v_question RECORD;
    v_student_paket TEXT;
    v_is_correct BOOLEAN := FALSE;
    v_points DECIMAL := 0;
    v_total_points DECIMAL;
    v_max_score DECIMAL;
    v_percentage DECIMAL;
    v_correct_answer JSONB;
    v_statement_count INT;
    v_correct_count INT;
    i INT;
BEGIN
    -- Get the question details
    SELECT tipe, correct_answer_config, bobot, paket
    INTO v_question
    FROM public.questions 
    WHERE id = NEW.question_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Question not found: %', NEW.question_id;
        RETURN NEW;
    END IF;

    -- ========================================
    -- CALCULATE CORRECTNESS & POINTS
    -- ========================================
    CASE v_question.tipe
        -- ================
        -- SINGLE CHOICE
        -- ================
        WHEN 'SINGLE' THEN
            v_correct_answer := v_question.correct_answer_config->'answer';
            -- Remove quotes for comparison (JSONB strings have quotes)
            v_is_correct := (NEW.answer_value #>> '{}') = (v_correct_answer #>> '{}');
            v_points := CASE WHEN v_is_correct THEN v_question.bobot ELSE 0 END;
        
        -- ================
        -- COMPLEX (Multiple Choice)
        -- ================
        WHEN 'COMPLEX' THEN
            v_correct_answer := v_question.correct_answer_config->'answers';
            -- Check if arrays contain same elements (order doesn't matter)
            v_is_correct := (
                NEW.answer_value @> v_correct_answer 
                AND v_correct_answer @> NEW.answer_value
            );
            v_points := CASE WHEN v_is_correct THEN v_question.bobot ELSE 0 END;
        
        -- ================
        -- TRUE_FALSE_MULTI
        -- ================
        WHEN 'TRUE_FALSE_MULTI' THEN
            v_correct_answer := v_question.correct_answer_config->'answers';
            v_statement_count := jsonb_array_length(v_correct_answer);
            v_correct_count := 0;
            
            -- Count matching elements index by index
            IF v_statement_count > 0 AND jsonb_array_length(NEW.answer_value) = v_statement_count THEN
                FOR i IN 0..(v_statement_count - 1) LOOP
                    -- Compare each element
                    IF (NEW.answer_value->i)::text = (v_correct_answer->i)::text THEN
                        v_correct_count := v_correct_count + 1;
                    END IF;
                END LOOP;
                
                -- Proportional scoring: (correct / total) * bobot
                v_points := ROUND((v_correct_count::DECIMAL / v_statement_count) * v_question.bobot, 2);
                v_is_correct := (v_correct_count = v_statement_count);
            ELSE
                -- Array length mismatch = 0 points
                v_points := 0;
                v_is_correct := FALSE;
            END IF;
            
        ELSE
            -- Unknown question type
            v_points := 0;
            v_is_correct := FALSE;
    END CASE;

    -- Update answer record with calculated values
    NEW.is_correct := v_is_correct;
    NEW.points_earned := v_points;
    NEW.updated_at := NOW();

    -- ========================================
    -- CALCULATE TOTAL RUNNING SCORE
    -- ========================================
    
    -- Get student's packet from the question they're answering
    -- (All questions a student answers should be from their packet)
    v_student_paket := v_question.paket;
    
    -- Sum all points earned by this student
    SELECT COALESCE(SUM(sa.points_earned), 0)
    INTO v_total_points
    FROM public.student_answers sa
    WHERE sa.student_id = NEW.student_id
      AND sa.question_id != NEW.question_id;  -- Exclude current (will add NEW.points below)
    
    -- Add current answer's points
    v_total_points := v_total_points + v_points;
    
    -- FIX #1: PACKET ISOLATION
    -- Get max possible score ONLY for this student's packet
    SELECT COALESCE(SUM(q.bobot), 1)
    INTO v_max_score
    FROM public.questions q
    WHERE q.school_id = NEW.school_id
      AND (v_student_paket IS NULL OR q.paket = v_student_paket OR q.paket IS NULL);
    
    -- Calculate percentage (0-100)
    v_percentage := CASE 
        WHEN v_max_score > 0 THEN ROUND((v_total_points / v_max_score) * 100, 2)
        ELSE 0
    END;
    
    -- Update student's profile with running score
    UPDATE public.profiles
    SET 
        skor_akhir = v_percentage,
        last_seen = NOW()
    WHERE id = NEW.student_id;
    
    -- Log for debugging (can be removed in production)
    RAISE NOTICE 'Live Score Update: student=%, question=%, points=%, total=%, max=%, score=%', 
        NEW.student_id, NEW.question_id, v_points, v_total_points, v_max_score, v_percentage;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. CREATE TRIGGER
-- ==========================================

DROP TRIGGER IF EXISTS trigger_calculate_running_score ON public.student_answers;
CREATE TRIGGER trigger_calculate_running_score
    BEFORE INSERT OR UPDATE ON public.student_answers
    FOR EACH ROW
    EXECUTE FUNCTION calculate_running_score();

-- ==========================================
-- 5. ENABLE REALTIME FOR PROFILES
-- ==========================================
-- This allows the live-score page to subscribe to score changes

-- Note: In Supabase Dashboard, you need to enable Realtime for the 'profiles' table
-- Go to: Database > Replication > Enable for 'profiles'
-- This SQL just adds the publication if it doesn't exist

DO $$
BEGIN
    -- Check if supabase_realtime publication exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add profiles table to the publication if not already added
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.profiles';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;

-- ==========================================
-- 6. HELPER: GET STUDENT CURRENT SCORE
-- ==========================================
-- RPC function to get a student's current calculated score

CREATE OR REPLACE FUNCTION get_student_live_score(p_student_id UUID)
RETURNS TABLE(
    total_points DECIMAL,
    max_points DECIMAL,
    percentage DECIMAL,
    answered_count INT,
    total_questions INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_school_id UUID;
    v_paket TEXT;
BEGIN
    -- Get student's school and determine their packet from their answers
    SELECT school_id INTO v_school_id FROM profiles WHERE id = p_student_id;
    
    -- Get packet from their first answered question
    SELECT q.paket INTO v_paket
    FROM student_answers sa
    JOIN questions q ON sa.question_id = q.id
    WHERE sa.student_id = p_student_id
    LIMIT 1;
    
    RETURN QUERY
    SELECT 
        COALESCE(SUM(sa.points_earned), 0)::DECIMAL as total_points,
        COALESCE((
            SELECT SUM(q.bobot) 
            FROM questions q 
            WHERE q.school_id = v_school_id 
              AND (v_paket IS NULL OR q.paket = v_paket OR q.paket IS NULL)
        ), 1)::DECIMAL as max_points,
        ROUND((COALESCE(SUM(sa.points_earned), 0) / NULLIF((
            SELECT SUM(q.bobot) 
            FROM questions q 
            WHERE q.school_id = v_school_id 
              AND (v_paket IS NULL OR q.paket = v_paket OR q.paket IS NULL)
        ), 0)) * 100, 2)::DECIMAL as percentage,
        COUNT(sa.id)::INT as answered_count,
        (SELECT COUNT(*) FROM questions q WHERE q.school_id = v_school_id 
            AND (v_paket IS NULL OR q.paket = v_paket OR q.paket IS NULL))::INT as total_questions
    FROM student_answers sa
    WHERE sa.student_id = p_student_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_live_score(UUID) TO authenticated;

-- ==========================================
-- NOTES:
-- 
-- 1. PACKET ISOLATION: Max score only counts questions in student's packet
-- 2. TRUE_FALSE_MULTI: Proportional scoring (3/5 correct = 60% of bobot)
-- 3. RLS: Students can only INSERT/UPDATE/SELECT their own answers
-- 4. REALTIME: Enable in Supabase Dashboard for profiles table
-- 5. The trigger fires BEFORE INSERT/UPDATE to set is_correct and points_earned
-- ==========================================
