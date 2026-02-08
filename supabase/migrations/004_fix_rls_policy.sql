-- ============================================================================
-- SUPABASE MIGRATION: Complete RLS Policy Fix
-- Generated: 2026-02-08
-- Description: Creates all tables, functions, RLS policies, and indexes
-- ============================================================================

-- ############################################################################
-- SECTION 1: CREATE TABLES
-- ############################################################################

-- -----------------------------------------------------------------------------
-- 1.1 Schools Table (must be created first as other tables reference it)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.2 Profiles Table (extends Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'teacher', 'student')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.3 Students Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, username)
);

-- -----------------------------------------------------------------------------
-- 1.4 Questions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    question_number INTEGER,
    order_number INTEGER,
    question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'essay', 'true_false', 'matching')),
    question_text TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,
    correct_answer VARCHAR(10),
    media_url TEXT,
    score_weight DECIMAL(5,2) DEFAULT 1.0,
    category VARCHAR(100),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.5 Exams Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'active', 'completed', 'archived')),
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    show_result BOOLEAN DEFAULT true,
    passing_score DECIMAL(5,2) DEFAULT 60.0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 1.6 Exam Questions Junction Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, question_id)
);

-- -----------------------------------------------------------------------------
-- 1.7 Exam Results Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    score DECIMAL(5,2) DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    answers JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);


-- ############################################################################
-- SECTION 2: CREATE HELPER FUNCTION
-- ############################################################################

-- -----------------------------------------------------------------------------
-- 2.1 Function to get current user's school_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT school_id 
    FROM profiles 
    WHERE id = auth.uid()
    LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_school_id() TO authenticated;


-- ############################################################################
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- ############################################################################

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;


-- ############################################################################
-- SECTION 4: DROP EXISTING POLICIES (to avoid conflicts)
-- ############################################################################

-- Schools policies
DROP POLICY IF EXISTS "schools_select_policy" ON schools;
DROP POLICY IF EXISTS "schools_insert_policy" ON schools;
DROP POLICY IF EXISTS "schools_update_policy" ON schools;
DROP POLICY IF EXISTS "schools_delete_policy" ON schools;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Students policies
DROP POLICY IF EXISTS "students_select_policy" ON students;
DROP POLICY IF EXISTS "students_insert_policy" ON students;
DROP POLICY IF EXISTS "students_update_policy" ON students;
DROP POLICY IF EXISTS "students_delete_policy" ON students;

-- Questions policies
DROP POLICY IF EXISTS "questions_select_policy" ON questions;
DROP POLICY IF EXISTS "questions_insert_policy" ON questions;
DROP POLICY IF EXISTS "questions_update_policy" ON questions;
DROP POLICY IF EXISTS "questions_delete_policy" ON questions;

-- Exams policies
DROP POLICY IF EXISTS "exams_select_policy" ON exams;
DROP POLICY IF EXISTS "exams_insert_policy" ON exams;
DROP POLICY IF EXISTS "exams_update_policy" ON exams;
DROP POLICY IF EXISTS "exams_delete_policy" ON exams;

-- Exam Questions policies
DROP POLICY IF EXISTS "exam_questions_select_policy" ON exam_questions;
DROP POLICY IF EXISTS "exam_questions_insert_policy" ON exam_questions;
DROP POLICY IF EXISTS "exam_questions_update_policy" ON exam_questions;
DROP POLICY IF EXISTS "exam_questions_delete_policy" ON exam_questions;

-- Exam Results policies
DROP POLICY IF EXISTS "exam_results_select_policy" ON exam_results;
DROP POLICY IF EXISTS "exam_results_insert_policy" ON exam_results;
DROP POLICY IF EXISTS "exam_results_update_policy" ON exam_results;
DROP POLICY IF EXISTS "exam_results_delete_policy" ON exam_results;


-- ############################################################################
-- SECTION 5: CREATE RLS POLICIES
-- ############################################################################

-- =============================================================================
-- 5.1 SCHOOLS POLICIES
-- Users can only access their own school
-- =============================================================================

CREATE POLICY "schools_select_policy" ON schools
    FOR SELECT
    TO authenticated
    USING (id = get_my_school_id());

CREATE POLICY "schools_insert_policy" ON schools
    FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Allow creating schools (typically done during registration)

CREATE POLICY "schools_update_policy" ON schools
    FOR UPDATE
    TO authenticated
    USING (id = get_my_school_id())
    WITH CHECK (id = get_my_school_id());

CREATE POLICY "schools_delete_policy" ON schools
    FOR DELETE
    TO authenticated
    USING (id = get_my_school_id());


-- =============================================================================
-- 5.2 PROFILES POLICIES
-- Users can view their own profile and profiles from their school
-- =============================================================================

CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() 
        OR school_id = get_my_school_id()
    );

CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    TO authenticated
    USING (id = auth.uid());


-- =============================================================================
-- 5.3 STUDENTS POLICIES
-- Users can only access students from their school
-- =============================================================================

CREATE POLICY "students_select_policy" ON students
    FOR SELECT
    TO authenticated
    USING (school_id = get_my_school_id());

CREATE POLICY "students_insert_policy" ON students
    FOR INSERT
    TO authenticated
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "students_update_policy" ON students
    FOR UPDATE
    TO authenticated
    USING (school_id = get_my_school_id())
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "students_delete_policy" ON students
    FOR DELETE
    TO authenticated
    USING (school_id = get_my_school_id());


-- =============================================================================
-- 5.4 QUESTIONS POLICIES
-- Users can only access questions from their school
-- =============================================================================

CREATE POLICY "questions_select_policy" ON questions
    FOR SELECT
    TO authenticated
    USING (school_id = get_my_school_id());

CREATE POLICY "questions_insert_policy" ON questions
    FOR INSERT
    TO authenticated
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "questions_update_policy" ON questions
    FOR UPDATE
    TO authenticated
    USING (school_id = get_my_school_id())
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "questions_delete_policy" ON questions
    FOR DELETE
    TO authenticated
    USING (school_id = get_my_school_id());


-- =============================================================================
-- 5.5 EXAMS POLICIES
-- Users can only access exams from their school
-- =============================================================================

CREATE POLICY "exams_select_policy" ON exams
    FOR SELECT
    TO authenticated
    USING (school_id = get_my_school_id());

CREATE POLICY "exams_insert_policy" ON exams
    FOR INSERT
    TO authenticated
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "exams_update_policy" ON exams
    FOR UPDATE
    TO authenticated
    USING (school_id = get_my_school_id())
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "exams_delete_policy" ON exams
    FOR DELETE
    TO authenticated
    USING (school_id = get_my_school_id());


-- =============================================================================
-- 5.6 EXAM QUESTIONS POLICIES
-- Users can access exam_questions through exam ownership
-- =============================================================================

CREATE POLICY "exam_questions_select_policy" ON exam_questions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_questions.exam_id 
            AND exams.school_id = get_my_school_id()
        )
    );

CREATE POLICY "exam_questions_insert_policy" ON exam_questions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_questions.exam_id 
            AND exams.school_id = get_my_school_id()
        )
    );

CREATE POLICY "exam_questions_update_policy" ON exam_questions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_questions.exam_id 
            AND exams.school_id = get_my_school_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_questions.exam_id 
            AND exams.school_id = get_my_school_id()
        )
    );

CREATE POLICY "exam_questions_delete_policy" ON exam_questions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exams 
            WHERE exams.id = exam_questions.exam_id 
            AND exams.school_id = get_my_school_id()
        )
    );


-- =============================================================================
-- 5.7 EXAM RESULTS POLICIES
-- Users can access exam_results from their school
-- =============================================================================

CREATE POLICY "exam_results_select_policy" ON exam_results
    FOR SELECT
    TO authenticated
    USING (school_id = get_my_school_id());

CREATE POLICY "exam_results_insert_policy" ON exam_results
    FOR INSERT
    TO authenticated
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "exam_results_update_policy" ON exam_results
    FOR UPDATE
    TO authenticated
    USING (school_id = get_my_school_id())
    WITH CHECK (school_id = get_my_school_id());

CREATE POLICY "exam_results_delete_policy" ON exam_results
    FOR DELETE
    TO authenticated
    USING (school_id = get_my_school_id());


-- ############################################################################
-- SECTION 6: CREATE INDEXES FOR PERFORMANCE
-- ############################################################################

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);
CREATE INDEX IF NOT EXISTS idx_students_class_name ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_students_school_username ON students(school_id, username);

-- Questions indexes
CREATE INDEX IF NOT EXISTS idx_questions_school_id ON questions(school_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);

-- Exams indexes
CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_start_time ON exams(start_time);
CREATE INDEX IF NOT EXISTS idx_exams_end_time ON exams(end_time);

-- Exam Questions indexes
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id ON exam_questions(question_id);

-- Exam Results indexes
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_id ON exam_results(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_status ON exam_results(status);


-- ############################################################################
-- SECTION 7: CREATE TRIGGERS FOR updated_at
-- ############################################################################

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_schools_updated_at ON schools;
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exams_updated_at ON exams;
CREATE TRIGGER update_exams_updated_at
    BEFORE UPDATE ON exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_results_updated_at ON exam_results;
CREATE TRIGGER update_exam_results_updated_at
    BEFORE UPDATE ON exam_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ############################################################################
-- SECTION 8: VERIFICATION QUERIES (Optional - Run to test)
-- ############################################################################

-- Uncomment these to verify the setup:

-- Check if function exists and works:
-- SELECT get_my_school_id();

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('schools', 'profiles', 'students', 'questions', 'exams', 'exam_questions', 'exam_results');

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;


-- ############################################################################
-- MIGRATION COMPLETE
-- ############################################################################

-- After running this migration:
-- 1. Ensure your user has a profile with a valid school_id
-- 2. Test by querying: SELECT * FROM questions;
-- 3. If no data returns, check: SELECT get_my_school_id();
-- 4. If school_id is NULL, update your profile: 
--    UPDATE profiles SET school_id = 'your-school-uuid' WHERE id = auth.uid();
