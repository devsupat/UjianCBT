-- =====================================
-- Complete CRUD Policies for Questions Table
-- Created: 2026-02-08
-- =====================================

-- This migration enables full CRUD operations for School Admins
-- on the questions table.

-- ==========================================
-- DROP EXISTING POLICIES
-- ==========================================

DROP POLICY IF EXISTS "Admins can view their school questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can insert their school questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can update their school questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can delete their school questions" ON public.questions;

-- ==========================================
-- QUESTIONS TABLE: Full CRUD Policies
-- ==========================================

-- 1. SELECT: Admins can view questions belonging to their school
CREATE POLICY "Admins can view their school questions"
ON public.questions FOR SELECT
TO authenticated
USING (school_id = public.get_my_school_id());

-- 2. INSERT: Admins can insert questions to their school
CREATE POLICY "Admins can insert their school questions"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (school_id = public.get_my_school_id());

-- 3. UPDATE: Admins can update questions belonging to their school
CREATE POLICY "Admins can update their school questions"
ON public.questions FOR UPDATE
TO authenticated
USING (school_id = public.get_my_school_id())
WITH CHECK (school_id = public.get_my_school_id());

-- 4. DELETE: Admins can delete questions belonging to their school
CREATE POLICY "Admins can delete their school questions"
ON public.questions FOR DELETE
TO authenticated
USING (school_id = public.get_my_school_id());

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Test CRUD operations:
-- INSERT INTO public.questions (school_id, ...) VALUES (...);
-- UPDATE public.questions SET ... WHERE id = ...;
-- DELETE FROM public.questions WHERE id = ...;
