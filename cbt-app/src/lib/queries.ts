/**
 * Supabase Query Functions
 * Task 3.3: Fetching Questions with RLS
 * 
 * All queries automatically filtered by RLS policies based on user's school_id
 */

import { getSupabase } from './supabase'
import type { Question, AnswersRecord, ExamConfig } from '@/types'
import type { Database } from '@/types/database'

type QuestionRow = Database['public']['Tables']['questions']['Row']

/**
 * Fetch questions for current user's school
 * RLS automatically filters by school_id
 * 
 * @param paket - Optional packet filter (e.g., "Paket1", "Paket2")
 */
export async function fetchQuestions(
    paket?: string
): Promise<Question[]> {
    const supabase = getSupabase()

    let query = supabase
        .from('questions')
        .select('*')
        .order('nomor_urut', { ascending: true })

    // Filter by packet if specified
    if (paket) {
        query = query.eq('paket', paket)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching questions:', error)
        throw new Error('Gagal mengambil soal')
    }

    // Transform to legacy format for backward compatibility
    return (data || []).map(transformQuestionToLegacy)
}

/**
 * Transform database question to legacy format
 * Maintains backward compatibility with existing frontend code
 */
function transformQuestionToLegacy(q: QuestionRow): Question {
    const options = q.options as any
    const config = q.correct_answer_config as any

    return {
        id: q.id,
        id_soal: q.id, // Backward compatibility
        school_id: q.school_id,
        nomor_urut: q.nomor_urut,
        tipe: q.tipe,
        pertanyaan: q.pertanyaan,
        gambar_url: q.gambar_url,
        opsi_a: options.a || '',
        opsi_b: options.b || '',
        opsi_c: options.c || '',
        opsi_d: options.d || '',
        opsi_e: options.e || null,
        bobot: Number(q.bobot),
        kategori: q.kategori,
        paket: q.paket || undefined,
        // TRUE_FALSE_MULTI fields
        statements_json: config.type === 'TRUE_FALSE_MULTI' ? config.statements : null,
        answer_json: config.type === 'TRUE_FALSE_MULTI' ? config.answers : null
    }
}

/**
 * Sync answers to backend (used for auto-save)
 * Currently saves to IndexedDB, can extend to Supabase if needed
 */
export async function syncAnswers(
    userId: string,
    answers: AnswersRecord
): Promise<void> {
    // For now, keep using IndexedDB for auto-save
    // In future, could save to Supabase as draft
    const { updateAnswers } = await import('./db')
    await updateAnswers(userId, answers)
}

/**
 * Submit exam using RPC function (Task 3.4)
 * Calls calculate_score database function to prevent manipulation
 */
export async function submitExam(
    answers: AnswersRecord,
    forced: boolean = false
): Promise<{
    success: boolean
    score?: string
    status?: string
    message?: string
}> {
    const supabase = getSupabase()

    try {
        // Call RPC function - type override for manually added functions
        const { data, error } = await (supabase as any)
            .rpc('calculate_score', {
                p_answers: answers,
                p_forced: forced
            })

        if (error) {
            console.error('Submit error:', error)
            return {
                success: false,
                message: error.message || 'Gagal submit ujian'
            }
        }

        type ScoreResult = { score: number; status: string }
        const result = (data as ScoreResult[])?.[0]

        return {
            success: true,
            score: result?.score?.toFixed(2),
            status: result?.status
        }
    } catch (error) {
        console.error('Submit exception:', error)
        return {
            success: false,
            message: 'Terjadi kesalahan sistem'
        }
    }
}

/**
 * Report violation (tab switch, etc.)
 */
export async function reportViolation(
    type: string
): Promise<{
    success: boolean
    violations?: number
    disqualified?: boolean
}> {
    const supabase = getSupabase()

    try {
        // Type override for manually added RPC functions
        const { data, error } = await (supabase as any)
            .rpc('report_violation', {
                p_violation_type: type
            })

        if (error) {
            throw error
        }

        type ViolationResult = { current_violations: number; is_disqualified: boolean }
        const result = (data as ViolationResult[])?.[0]

        return {
            success: true,
            violations: result?.current_violations,
            disqualified: result?.is_disqualified
        }
    } catch (error) {
        console.error('Report violation error:', error)
        return { success: false }
    }
}

/**
 * Fetch exam config (TODO: Move to config table)
 */
export async function fetchExamConfig(): Promise<ExamConfig> {
    // For now, return defaults
    // TODO: Create config table in database
    return {
        exam_name: 'Ujian CBT',
        exam_duration: 90,
        max_violations: 3,
        auto_submit: true,
        shuffle_questions: false
    }
}

/**
 * Get live scores (for admin dashboard)
 */
export async function fetchLiveScores() {
    const supabase = getSupabase()

    // Get all responses for current school (RLS filtered)
    const { data: responses } = await supabase
        .from('responses')
        .select(`
      *,
      profiles!inner(full_name, class_group)
    `)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })

    // Get active students (status = SEDANG)
    const { data: activeStudents } = await supabase
        .from('profiles')
        .select('full_name, class_group, violation_count')
        .eq('status_ujian', 'SEDANG')

    return {
        completed: responses || [],
        active: activeStudents || []
    }
}

// =====================================
// Phase 5: Admin Feature Queries
// =====================================

/**
 * Get current user's school information for branding
 * RLS automatically filters to user's school
 */
export async function getSchoolInfo() {
    const supabase = getSupabase()

    try {
        // Get current user's profile to find school_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .single()

        const profileData = profile as any

        if (!profileData?.school_id) throw new Error('No school associated')

        // Fetch school data (RLS will ensure user can only see their school)
        const { data: school, error } = await supabase
            .from('schools')
            .select('id, name, logo_url, license_status, license_expiry, created_at')
            .eq('id', profileData.school_id)
            .single()

        if (error) throw error

        return school as any
    } catch (error) {
        console.error('Error fetching school info:', error)
        return null
    }
}

/**
 * Bulk insert questions from Excel import
 * Automatically injects school_id from current user's session
 * 
 * @param questions - Array of questions to insert
 * @returns Import result with success/error details
 */
export async function bulkInsertQuestions(
    questions: Array<{
        nomor_urut: number
        tipe: 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI'
        pertanyaan: string
        gambar_url?: string
        options: Record<string, string>
        correct_answer_config: any
        bobot: number
        kategori?: string
        paket?: string
    }>
) {
    const supabase = getSupabase()

    try {
        // Get current user and their school_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return {
                success: false,
                totalRows: questions.length,
                successCount: 0,
                failedCount: questions.length,
                errors: [{ row: 0, error: 'Not authenticated' }]
            }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('school_id, role')
            .eq('id', user.id)
            .single()

        const profileData = profile as any

        if (!profileData?.school_id) {
            return {
                success: false,
                totalRows: questions.length,
                successCount: 0,
                failedCount: questions.length,
                errors: [{ row: 0, error: 'No school associated with user' }]
            }
        }

        if (profileData.role !== 'ADMIN') {
            return {
                success: false,
                totalRows: questions.length,
                successCount: 0,
                failedCount: questions.length,
                errors: [{ row: 0, error: 'Only admins can import questions' }]
            }
        }

        // Inject school_id into all questions
        const questionsWithSchool = questions.map(q => ({
            ...q,
            school_id: profileData.school_id
        }))

        // Insert all questions at once
        const { data, error } = await (supabase as any)
            .from('questions')
            .insert(questionsWithSchool)
            .select()

        if (error) {
            console.error('Bulk insert error:', error)
            return {
                success: false,
                totalRows: questions.length,
                successCount: 0,
                failedCount: questions.length,
                errors: [{ row: 0, error: error.message }]
            }
        }

        return {
            success: true,
            totalRows: questions.length,
            successCount: data?.length || 0,
            failedCount: 0,
            errors: []
        }
    } catch (error: any) {
        console.error('Bulk insert exception:', error)
        return {
            success: false,
            totalRows: questions.length,
            successCount: 0,
            failedCount: questions.length,
            errors: [{ row: 0, error: error.message || 'Unknown error' }]
        }
    }
}

/**
 * Admin Dashboard: Fetch all student profiles for monitoring
 * RLS filters by admin's school_id automatically
 */
export async function fetchStudentProfiles() {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, class_group, role, status_ujian, waktu_mulai, skor_akhir, last_seen')
        .eq('role', 'STUDENT')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching students:', error)
        throw new Error('Gagal mengambil data siswa')
    }

    // Transform to match legacy User type
    // Type assertion needed: database types don't include these fields yet
    return (data as any[] || []).map((profile: any) => ({
        id_siswa: profile.id,
        username: profile.full_name.toLowerCase().replace(/\s+/g, ''), // Generate from name
        nama_lengkap: profile.full_name,
        kelas: profile.class_group || '',
        status_ujian: profile.status_ujian || 'BELUM',
        waktu_mulai: profile.waktu_mulai || null,
        skor_akhir: profile.skor_akhir || null,
        status_login: false, // TODO: implement session tracking
        last_seen: profile.last_seen || null,
        exam_duration: 90 // TODO: get from config
    }))
}

/**
 * Admin: Reset student's exam status
 */
export async function resetStudentExam(studentId: string) {
    const supabase = getSupabase()

    const { error } = await (supabase
        .from('profiles') as any)
        .update({
            status_ujian: 'BELUM',
            waktu_mulai: null,
            skor_akhir: null
        })
        .eq('id', studentId)

    if (error) {
        console.error('Error resetting student:', error)
        throw new Error('Gagal mereset ujian siswa')
    }

    return { success: true }
}

/**
 * Helper: Normalize packet name for case-insensitive matching
 * Maps: "Paket A" -> "paket_a", "Paket1" -> "paket1"
 */
function normalizePacketName(packetName: string | undefined): string {
    if (!packetName) return ''

    // Convert to lowercase and replace spaces with underscores
    const normalized = packetName.toLowerCase().replace(/\s+/g, '_')

    // Extract letter/number for mapping
    // "paket_a" or "paket_1" or "paket1" -> keep as is
    return normalized
}

/**
 * Exam Config: Fetch school's exam_config
 */
export async function getSchoolConfig(): Promise<{
    paket_a: boolean
    paket_b: boolean
    paket_c: boolean
}> {
    const supabase = getSupabase()

    // Get current user's school
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Get profile to find school_id
    const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('school_id')
        .eq('id', user.id)
        .single()

    if (!profile?.school_id) {
        throw new Error('School not found')
    }

    // Fetch school's exam_config
    const { data: school, error } = await (supabase
        .from('schools') as any)
        .select('exam_config')
        .eq('school_id', profile.school_id)
        .single()

    if (error) {
        console.error('Error fetching school config:', error)
        throw new Error('Gagal mengambil konfigurasi ujian')
    }

    // FAIL-SAFE: If exam_config is NULL, return all false
    const config = school?.exam_config || {
        paket_a: false,
        paket_b: false,
        paket_c: false
    }

    return config
}

/**
 * Exam Config: Update specific packet toggle
 */
export async function updateSchoolConfig(
    packetKey: 'paket_a' | 'paket_b' | 'paket_c',
    enabled: boolean
): Promise<{ success: boolean }> {
    const supabase = getSupabase()

    // Get current user's school
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // Get profile to find school_id
    const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('school_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.school_id || profile.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    // Get current config
    const currentConfig = await getSchoolConfig()

    // Update the specific packet
    const newConfig = {
        ...currentConfig,
        [packetKey]: enabled
    }

    // Update database
    const { error } = await (supabase
        .from('schools') as any)
        .update({ exam_config: newConfig })
        .eq('school_id', profile.school_id)

    if (error) {
        console.error('Error updating exam config:', error)
        throw new Error('Gagal menyimpan konfigurasi')
    }

    return { success: true }
}

/**
 * Exam Config: Check if a packet is enabled
 * Used in login flow and fetchQuestions
 */
export async function isPacketEnabled(packetName: string): Promise<boolean> {
    try {
        const config = await getSchoolConfig()
        const normalized = normalizePacketName(packetName)

        // Map normalized name to config key
        // "paket_a" -> config.paket_a
        // "paket_1" -> treat as paket_a (for backward compatibility)
        let key: keyof typeof config

        if (normalized.includes('a') || normalized.includes('1')) {
            key = 'paket_a'
        } else if (normalized.includes('b') || normalized.includes('2')) {
            key = 'paket_b'
        } else if (normalized.includes('c') || normalized.includes('3')) {
            key = 'paket_c'
        } else {
            // Unknown packet, default to closed for safety
            return false
        }

        return config[key] || false
    } catch (error) {
        console.error('Error checking packet status:', error)
        // FAIL-SAFE: if error, assume closed
        return false
    }
}
