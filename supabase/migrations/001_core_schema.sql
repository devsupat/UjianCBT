-- =====================================
-- Core Schema for Multi-Tenant CBT Platform
-- Tasks: 1.1 (Schools), 1.2 (Profiles), 1.4 (RLS)
-- =====================================

-- ==========================================
-- TASK 1.1: CORE TABLES (SCHOOLS)
-- ==========================================
-- Master data sekolah/instansi dengan license control
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    license_status BOOLEAN DEFAULT TRUE, -- Kontrol akses (Anti-Kabur Mechanism)
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TASK 1.2: USER PROFILES (AUTH INTEGRATION)
-- ==========================================
-- Tabel ini menyimpan data tambahan siswa/guru yang terikat ke Auth Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('ADMIN', 'STUDENT')) DEFAULT 'STUDENT',
    class_group TEXT, -- Diambil dari interface 'kelas' (untuk siswa)
    photo_url TEXT,   -- Untuk fitur foto di kartu login
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==========================================
-- TASK 1.4: ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Aktifkan RLS pada kedua tabel
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================
-- RLS Policies for PROFILES
-- =====================================

-- Policy: User hanya bisa melihat profil mereka sendiri
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy: User bisa update profil mereka sendiri
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- =====================================
-- RLS Policies for SCHOOLS
-- =====================================

-- Policy: User hanya bisa melihat data sekolah mereka sendiri
CREATE POLICY "Users can view their own school data" 
ON public.schools FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.school_id = schools.id
    )
);

-- Policy: Admin bisa update data sekolah mereka
CREATE POLICY "Admin can update their school data"
ON public.schools FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.school_id = schools.id
        AND profiles.role = 'ADMIN'
    )
);

-- ==========================================
-- AUTO-PROFILE CREATION TRIGGER (OPTIONAL)
-- ==========================================
-- Function untuk otomatis membuat profil saat user daftar
-- IMPORTANT: This requires user metadata to be passed during signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, school_id, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'), 
    (new.raw_user_meta_data->>'school_id')::uuid,
    COALESCE(new.raw_user_meta_data->>'role', 'STUDENT')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- TRIGGER FOR AUTO-UPDATED_AT
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- NOTES:
-- 1. license_status: Kill-switch untuk akses sekolah
-- 2. class_group: Menggantikan 'kelas' dari sistem lama
-- 3. RLS: Menjamin isolasi data antar sekolah
-- 4. Trigger: Auto-create profile saat signup (butuh metadata)
-- ==========================================
