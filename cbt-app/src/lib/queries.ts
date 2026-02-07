/**
 * Supabase Query Functions
 * Task 3.3: Fetching Questions with RLS
 * 
 * All queries automatically filtered by RLS policies based on user's school_id
 */

import { getSupabase } from './supabase'
import { createServerSupabaseClient } from './supabase-server'
import type { Question, AnswersRecord, ExamConfig } from '@/types'
import type { Database } from '@/types/database'

type QuestionRow = Database['public']['Tables']['questions']['Row']

/**
 * Fetch questions for current user's school
 * RLS automatically filters by school_id
 * 
 * @param paket - Optional packet filter (e.g., "Paket1", "Paket2")
 * @param isServer - Use server client (for API routes)
 */
export async function fetchQuestions(
    paket?: string,
    isServer = false
): Promise<Question[]> {
    const supabase = isServer
        ? await createServerSupabaseClient()
        : getSupabase()

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
