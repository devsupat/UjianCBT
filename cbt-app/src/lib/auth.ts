/**
 * Authentication Module with Supabase Auth
 * Task 3.2: Login & Session Rewrite
 * 
 * Strategy: Modified Option A - Full Supabase Auth with username-to-email mapping
 * Format: username@{school_id}.cbt.local
 */

import { getSupabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types'

const EMAIL_DOMAIN = 'cbt.local' // Internal domain for username mapping

/**
 * Maps username to email format for Supabase Auth
 * Format: username@{school_id}.cbt.local
 */
function usernameToEmail(username: string, schoolId: string): string {
    return `${username.toLowerCase()}@${schoolId}.${EMAIL_DOMAIN}`
}

/**
 * Login with username and password (backward compatible)
 * Creates Supabase Auth session with mapped email
 */
export async function loginWithUsername(
    username: string,
    password: string
): Promise<{
    success: boolean
    message?: string
    data?: User
}> {
    const supabase = getSupabase()

    try {
        // Step 1: Find user profile by username
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, schools!inner(*)')
            .eq('full_name', username) // TODO: Add username column to profiles
            .single()

        if (profileError || !profileData) {
            return { success: false, message: 'Username tidak ditemukan' }
        }

        type ProfileWithSchool = { school_id: string; status_ujian: string | null; waktu_mulai: string | null; id: string; full_name: string; class_group: string | null }
        const profile = profileData as unknown as ProfileWithSchool

        // Check if exam already completed
        if (profile.status_ujian === 'SELESAI' || profile.status_ujian === 'DISKUALIFIKASI') {
            return { success: false, message: 'Anda sudah menyelesaikan ujian.' }
        }

        // Step 2: Map username to email
        const email = usernameToEmail(username, profile.school_id)

        // Step 3: Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (authError) {
            return { success: false, message: 'Username atau password salah' }
        }

        // Step 4: Update exam state (start exam if first login)
        const now = new Date().toISOString()
        const updates: Partial<{ waktu_mulai: string; status_ujian: string; last_seen: string }> = {
            last_seen: now
        }

        if (!profile.waktu_mulai) {
            updates.waktu_mulai = now
            updates.status_ujian = 'SEDANG'
        }

        // Type override needed: database types not in sync with schema until regenerated
        await (supabase.from('profiles') as any)
            .update(updates)
            .eq('id', authData.user.id)

        // Step 5: Return user data (compatible with old API)
        return {
            success: true,
            data: {
                id_siswa: profile.id,
                username: username,
                nama_lengkap: profile.full_name,
                kelas: profile.class_group || '',
                status_ujian: (updates.status_ujian || profile.status_ujian || 'SEDANG') as any,
                waktu_mulai: updates.waktu_mulai || profile.waktu_mulai,
                exam_duration: 90, // TODO: Get from config
                school_id: profile.school_id
            }
        }
    } catch (error) {
        console.error('Login error:', error)
        return { success: false, message: 'Terjadi kesalahan sistem' }
    }
}

/**
 * Get current session
 */
export async function getSession() {
    const supabase = getSupabase()
    const { data } = await supabase.auth.getSession()
    return data.session
}

/**
 * Get current user with profile
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = getSupabase()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profileData) return null

    type ProfileRow = { id: string; full_name: string; class_group: string | null; status_ujian: string | null; waktu_mulai: string | null; waktu_selesai: string | null; skor_akhir: number | null; violation_count: number | null; school_id: string }
    const profile = profileData as unknown as ProfileRow

    return {
        id_siswa: profile.id,
        username: profile.full_name, // TODO: Add username column
        nama_lengkap: profile.full_name,
        kelas: profile.class_group || '',
        status_ujian: (profile.status_ujian || 'BELUM') as any,
        waktu_mulai: profile.waktu_mulai,
        waktu_selesai: profile.waktu_selesai,
        skor_akhir: profile.skor_akhir,
        violation_count: profile.violation_count,
        school_id: profile.school_id
    }
}

/**
 * Sign out
 */
export async function signOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
}

/**
 * Check license status for user's school
 */
export async function checkLicenseStatus(): Promise<boolean> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const { data: profile } = await supabase
        .from('profiles')
        .select('schools!inner(license_status)')
        .eq('id', user.id)
        .single()

    return (profile as any)?.schools?.license_status === true
}

/**
 * Register new user (for bulk import or admin creation)
 * Creates both auth user and profile
 */
export async function registerUser(params: {
    username: string
    password: string
    full_name: string
    school_id: string
    role: 'ADMIN' | 'STUDENT'
    class_group?: string
}) {
    const supabase = getSupabase()
    const email = usernameToEmail(params.username, params.school_id)

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: params.password,
        options: {
            data: {
                full_name: params.full_name,
                school_id: params.school_id,
                role: params.role
            }
        }
    })

    if (authError) {
        throw new Error(authError.message)
    }

    // Profile will be auto-created by trigger
    return authData.user
}
