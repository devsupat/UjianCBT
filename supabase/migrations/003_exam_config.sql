-- Migration: Add Exam Configuration to Schools Table
-- Purpose: Allow granular control over which exam packets are active
-- For PKBMs with multi-day exam schedules

-- Add exam_config column to schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS exam_config JSONB 
DEFAULT '{"paket_a": false, "paket_b": false, "paket_c": false}'::jsonb
NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN schools.exam_config IS 'Per-packet exam availability toggle. Keys: paket_a (SD), paket_b (SMP), paket_c (SMA)';

-- Update existing schools to have the default config (FAIL-SAFE)
UPDATE schools
SET exam_config = '{"paket_a": false, "paket_b": false, "paket_c": false}'::jsonb
WHERE exam_config IS NULL;

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_schools_exam_config 
ON schools USING gin (exam_config);

-- ============================================
-- RLS POLICY UPDATE: Grant Admin UPDATE Access
-- ============================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can update their school's exam_config" ON schools;

-- Allow admins to UPDATE their own school's exam_config
CREATE POLICY "Admins can update their school's exam_config"
ON schools
FOR UPDATE
TO authenticated
USING (
    -- Admin can only update their own school
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.school_id = schools.id
        AND profiles.role = 'ADMIN'
    )
)
WITH CHECK (
    -- Same check for the updated data
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.school_id = schools.id
        AND profiles.role = 'ADMIN'
    )
);

-- Ensure admin can SELECT their school (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'schools' 
        AND policyname = 'Admins can view their school'
    ) THEN
        CREATE POLICY "Admins can view their school"
        ON schools
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.school_id = schools.id
                AND profiles.role = 'ADMIN'
            )
        );
    END IF;
END $$;


