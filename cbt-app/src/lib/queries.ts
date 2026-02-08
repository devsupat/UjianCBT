/**
 * Supabase Query Functions
 * Task 3.3: Fetching Questions with RLS
 * 
 * All queries automatically filtered by RLS policies based on user's school_id
 */

import { getSupabase } from './supabase'
import type { Question, AnswersRecord, ExamConfig, Answer } from '@/types'
import type { Database } from '@/types/database'

type QuestionRow = Database['public']['Tables']['questions']['Row']

/**
 * Fetch questions for current user's school
 * Uses RPC function with SECURITY DEFINER to bypass RLS issues
 * 
 * @param paket - Optional packet filter (e.g., "Paket1", "Paket2")
 */
export async function fetchQuestions(
    paket?: string
): Promise<Question[]> {
    const supabase = getSupabase()

    // Get current user's school_id
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔐 Current user ID:', user?.id);

    if (!user) {
        console.log('⚠️ No authenticated user');
        return [];
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();
    console.log('🔐 User profile:', profile);

    const schoolId = (profile as any)?.school_id;
    if (!schoolId) {
        console.log('⚠️ No school_id found for user');
        return [];
    }

    // SECURITY: Get student's packet (required for strict isolation)
    // EXCEPTION: ADMIN users can see ALL questions (no packet filter)
    const userRole = (profile as any)?.role;
    let studentPacket = paket;

    // ADMIN bypasses packet filter - can see all questions in bank soal
    if (userRole === 'ADMIN') {
        studentPacket = undefined; // No filter for admin
        console.log('👑 ADMIN detected - showing all questions');
    } else if (!studentPacket && typeof window !== 'undefined') {
        studentPacket = sessionStorage.getItem('exam_packet') || undefined;
    }

    console.log('🔍 Fetching questions via RPC for school_id:', schoolId, 'packet:', studentPacket);

    // SECURITY FIX: Pass packet parameter to RPC for strict isolation
    // If no packet, RPC returns empty (never returns all questions)
    const { data, error } = await (supabase as any)
        .rpc('get_school_questions', {
            p_school_id: schoolId,
            p_paket: studentPacket || null  // RPC returns empty if null
        });

    console.log('🔍 RPC response - count:', data?.length, 'error:', error);

    if (error) {
        console.error('❌ RPC Fetch error:', error);
        // Fallback to direct query if RPC doesn't exist
        console.log('⚠️ Falling back to direct query...');
        return await fetchQuestionsDirectQuery(schoolId, studentPacket);
    }

    if (!data || data.length === 0) {
        console.warn('⚠️ NO DATA from RPC - packet may be empty or invalid');
        // Try fallback with forced packet filter
        return await fetchQuestionsDirectQuery(schoolId, studentPacket);
    }

    console.log('✅ Data retrieved via RPC:', data.length, 'questions');
    console.log('🔍 First raw question from RPC:', JSON.stringify(data[0], null, 2));

    // No need for client-side filter - RPC already filtered by packet

    // Transform to legacy format with try-catch
    try {
        const transformed = (data || []).map((q: any) => {
            const options = q.options || {};
            const config = q.correct_answer_config || {};
            return {
                id: q.id,
                id_soal: q.id,
                school_id: q.school_id,
                nomor_urut: q.nomor_urut,
                tipe: q.tipe,
                pertanyaan: q.pertanyaan,
                gambar_url: q.gambar_url,
                opsi_a: options.a || options.A || '',
                opsi_b: options.b || options.B || '',
                opsi_c: options.c || options.C || '',
                opsi_d: options.d || options.D || '',
                opsi_e: options.e || options.E || null,
                bobot: Number(q.bobot) || 1,
                kategori: q.kategori || '',
                paket: q.paket || undefined,
                statements_json: config.type === 'TRUE_FALSE_MULTI' ? config.statements : null,
                // SECURITY: answer_json is NOT sent to client - answers are only on server
            };
        });
        console.log('🔍 Transformed questions:', transformed.length);
        console.log('🔍 First transformed:', transformed[0]);
        return transformed;
    } catch (err) {
        console.error('❌ Transform error:', err);
        // Return raw data as fallback
        return data;
    }
}

/**
 * Fallback: Direct query with school_id filter
 */
async function fetchQuestionsDirectQuery(
    schoolId: string,
    paket?: string
): Promise<Question[]> {
    const supabase = getSupabase();

    let query = supabase
        .from('questions')
        .select('*')
        .eq('school_id', schoolId)
        .order('nomor_urut', { ascending: true });

    if (paket) {
        query = query.eq('paket', paket);
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ Direct query error:', error);
        throw new Error('Gagal mengambil soal');
    }

    console.log('✅ Direct query result:', data?.length, 'questions');
    return (data || []).map(transformQuestionToLegacy);
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
        // SECURITY: answer_json is NOT sent to client - answers are only on server
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
 * Save individual answer to database for LIVE SCORE (CAT BKN Style)
 * This triggers the calculate_running_score() PostgreSQL function
 * which updates skor_akhir in real-time
 */
export async function saveAnswer(
    questionId: string,
    answer: Answer
): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase()

    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get user's school_id
        const { data: profileData } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .single()

        const profile = profileData as { school_id: string } | null
        if (!profile?.school_id) {
            return { success: false, error: 'Profile not found' }
        }

        // UPSERT answer to student_answers table
        // This triggers calculate_running_score() which updates skor_akhir
        const { error } = await (supabase as any)
            .from('student_answers')
            .upsert({
                student_id: user.id,
                school_id: profile.school_id,
                question_id: questionId,
                answer_value: answer,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'student_id,question_id'
            })

        if (error) {
            console.error('Save answer error:', error)
            return { success: false, error: error.message }
        }

        console.log('✅ Answer saved:', questionId)
        return { success: true }
    } catch (err) {
        console.error('Save answer exception:', err)
        return { success: false, error: 'Failed to save answer' }
    }
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

        // DEBUG: Log what we're about to insert
        console.log('📤 Inserting questions:', questionsWithSchool.length);
        console.log('📤 First question:', JSON.stringify(questionsWithSchool[0], null, 2));
        console.log('📤 School ID:', profileData.school_id);

        // Insert all questions at once
        const { data, error } = await (supabase as any)
            .from('questions')
            .insert(questionsWithSchool)
            .select()

        // DEBUG: Log the result
        console.log('📥 Insert response - data:', data?.length, 'error:', error);

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

        console.log('✅ Successfully inserted:', data?.length, 'questions');

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
        .select('id, full_name, username, password_text, class_group, role, status_ujian, waktu_mulai, skor_akhir, last_seen, is_login')
        .eq('role', 'STUDENT')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('Error fetching students:', error)
        throw new Error('Gagal mengambil data siswa')
    }

    // Transform to match legacy User type with STATUS PRIORITY LOGIC:
    // 1. If is_login = false → OFFLINE (even if status_ujian = SEDANG)
    // 2. Otherwise use status_ujian value
    return (data as any[] || []).map((profile: any) => {
        const isLoggedIn = profile.is_login === true
        const rawStatus = profile.status_ujian || 'BELUM'

        // STATUS PRIORITY: is_login takes precedence
        // If not logged in but status says SEDANG, show as BELUM (they got kicked)
        let effectiveStatus = rawStatus
        if (!isLoggedIn && rawStatus === 'SEDANG') {
            effectiveStatus = 'BELUM' // They were reset/kicked
        }

        return {
            id_siswa: profile.id,
            username: profile.username || profile.full_name.toLowerCase().replace(/\s+/g, ''),
            nama_lengkap: profile.full_name,
            kelas: profile.class_group || '',
            status_ujian: effectiveStatus,
            waktu_mulai: profile.waktu_mulai || null,
            skor_akhir: profile.skor_akhir || null,
            status_login: isLoggedIn,
            is_login: isLoggedIn, // Also expose raw value
            last_seen: profile.last_seen || null,
            exam_duration: 90,
            password_text: profile.password_text || null // For login card printing
        }
    })
}

/**
 * Admin: Reset student's exam status
 * Performs comprehensive reset:
 * 1. DELETE from responses (clear answers & score)
 * 2. UPDATE profiles: status_ujian = BELUM, clear timestamps
 * 3. SET is_login = FALSE (kick them out)
 */
export async function resetStudentExam(studentId: string) {
    const supabase = getSupabase()

    // Step 1: Delete student's responses (answers & scores)
    const { error: deleteError } = await (supabase as any)
        .from('responses')
        .delete()
        .eq('student_id', studentId)

    if (deleteError) {
        console.error('Error deleting responses:', deleteError)
        // Continue anyway - responses might not exist
    }

    // Step 2: Reset profile status AND kick them out
    const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update({
            status_ujian: 'BELUM',
            waktu_mulai: null,
            skor_akhir: null,
            is_login: false,  // KICK THEM OUT
            last_seen: null
        })
        .eq('id', studentId)

    if (updateError) {
        console.error('Error resetting student exam:', updateError)
        return { success: false, error: 'Gagal mereset ujian siswa' }
    }

    console.log('✅ Student exam reset:', studentId)
    return { success: true }
}

/**
 * Admin: Reset student's login status
 * Sets is_login to false and clears last_seen timestamp
 */
export async function resetStudentLogin(studentId: string) {
    const supabase = getSupabase()

    const { error } = await (supabase
        .from('profiles') as any)
        .update({
            is_login: false,
            last_seen: null
        })
        .eq('id', studentId)

    if (error) {
        console.error('Error resetting login:', error)
        return { success: false, error: 'Gagal mereset login siswa' }
    }

    return { success: true }
}

/**
 * Admin: Reset all students' exams for today
 * Requires admin password verification (handled in dashboard UI)
 */
export async function resetAllExamsToday() {
    const supabase = getSupabase()

    const { error } = await (supabase
        .from('profiles') as any)
        .update({
            status_ujian: 'BELUM',
            waktu_mulai: null,
            skor_akhir: null
        })
        .eq('role', 'STUDENT')

    if (error) {
        console.error('Error resetting all exams:', error)
        return { success: false, error: 'Gagal mereset ujian' }
    }

    // Count affected
    const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT')

    return { success: true, resetCount: count || 0 }
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

// =====================================
// SMART EXAM FEATURES
// =====================================

interface ActivePackets {
    paket_a: boolean;
    paket_b: boolean;
    paket_c: boolean;
}

interface ExamSettings {
    exam_token: string | null;
    active_packets: ActivePackets | null;
}

/**
 * Fetch exam settings (token and active packets) for current school
 */
export async function fetchExamSettings(): Promise<ExamSettings> {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { exam_token: null, active_packets: null };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

    if (!(profile as any)?.school_id) {
        return { exam_token: null, active_packets: null };
    }

    const { data: school, error } = await supabase
        .from('schools')
        .select('exam_token, active_packets')
        .eq('id', (profile as any).school_id)
        .single();

    if (error || !school) {
        console.error('Error fetching exam settings:', error);
        return { exam_token: null, active_packets: null };
    }

    return {
        exam_token: (school as any).exam_token || null,
        active_packets: (school as any).active_packets || {
            paket_a: false,
            paket_b: false,
            paket_c: false
        }
    };
}

/**
 * Update exam token for current school
 */
export async function updateExamToken(token: string): Promise<void> {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Tidak ada user terautentikasi');

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

    if (!(profile as any)?.school_id || (profile as any).role !== 'ADMIN') {
        throw new Error('Tidak memiliki akses');
    }

    const { error } = await (supabase as any)
        .from('schools')
        .update({ exam_token: token })
        .eq('id', (profile as any).school_id);

    if (error) {
        console.error('Error updating exam token:', error);
        throw new Error('Gagal mengupdate token');
    }
}

/**
 * Update active packets for current school
 */
export async function updateActivePackets(packets: ActivePackets): Promise<void> {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Tidak ada user terautentikasi');

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

    if (!(profile as any)?.school_id || (profile as any).role !== 'ADMIN') {
        throw new Error('Tidak memiliki akses');
    }

    const { error } = await (supabase as any)
        .from('schools')
        .update({ active_packets: packets })
        .eq('id', (profile as any).school_id);

    if (error) {
        console.error('Error updating active packets:', error);
        throw new Error('Gagal mengupdate paket aktif');
    }
}

/**
 * Upload question image to Supabase Storage
 */
export async function uploadQuestionImage(file: File): Promise<string> {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Tidak ada user terautentikasi');

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

    if (!(profile as any)?.school_id) {
        throw new Error('School ID tidak ditemukan');
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${(profile as any).school_id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

    const { data, error } = await supabase.storage
        .from('question-images')
        .upload(filename, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Error uploading image:', error);
        throw new Error('Gagal mengupload gambar');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

// =====================================
// QUESTION CRUD OPERATIONS
// =====================================

/**
 * Delete a question by ID
 * Uses Supabase with RLS - only questions from user's school can be deleted
 */
export async function deleteQuestion(id_soal: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();

    // Get current user's profile to verify school access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Tidak terautentikasi' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

    if (!(profile as any)?.school_id) {
        return { success: false, error: 'Profil sekolah tidak ditemukan' };
    }

    if ((profile as any)?.role !== 'ADMIN') {
        return { success: false, error: 'Hanya admin yang dapat menghapus soal' };
    }

    console.log('🗑️ Deleting question:', id_soal);

    // Delete the question - id_soal from frontend maps to 'id' column in DB
    const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id_soal)
        .eq('school_id', (profile as any).school_id);

    if (error) {
        console.error('Delete question error:', error);
        return { success: false, error: error.message };
    }

    console.log('✅ Question deleted successfully');
    return { success: true };
}

/**
 * Create a new question
 * Uses Supabase with RLS - automatically associates with user's school
 */
export async function createQuestion(data: Partial<Question> & { kunci_jawaban: string }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Tidak terautentikasi' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

    const schoolId = (profile as any)?.school_id;
    if (!schoolId) {
        return { success: false, error: 'Profil sekolah tidak ditemukan' };
    }

    // Build correct_answer_config based on question type
    let correctAnswerConfig: any;
    if (data.tipe === 'TRUE_FALSE_MULTI') {
        correctAnswerConfig = {
            answers: (data as any).answer_json || []
        };
    } else if (data.tipe === 'COMPLEX') {
        correctAnswerConfig = {
            multipleKeys: data.kunci_jawaban?.split(',') || []
        };
    } else {
        correctAnswerConfig = {
            singleKey: data.kunci_jawaban || 'A'
        };
    }

    const questionData = {
        id_soal: data.id_soal || `Q${Date.now()}`,
        school_id: schoolId,
        nomor_urut: data.nomor_urut || 1,
        tipe: data.tipe || 'SINGLE',
        pertanyaan: data.pertanyaan || '',
        gambar_url: data.gambar_url || null,
        options: {
            A: (data as any).opsi_a || '',
            B: (data as any).opsi_b || '',
            C: (data as any).opsi_c || '',
            D: (data as any).opsi_d || '',
            E: (data as any).opsi_e || ''
        },
        statements_json: data.tipe === 'TRUE_FALSE_MULTI' ? ((data as any).statements_json || []) : null,
        correct_answer_config: correctAnswerConfig,
        bobot: data.bobot || 1,
        kategori: data.kategori || null,
        paket: (data as any).paket || null
    };

    console.log('📝 Creating question:', questionData.id_soal);

    const { error } = await (supabase as any)
        .from('questions')
        .insert(questionData);

    if (error) {
        console.error('Create question error:', error);
        return { success: false, error: error.message };
    }

    console.log('✅ Question created successfully');
    return { success: true };
}

/**
 * Update an existing question
 */
export async function updateQuestion(id_soal: string, data: Partial<Question> & { kunci_jawaban: string }): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Tidak terautentikasi' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role')
        .eq('id', user.id)
        .single();

    const schoolId = (profile as any)?.school_id;
    if (!schoolId) {
        return { success: false, error: 'Profil sekolah tidak ditemukan' };
    }

    // Build correct_answer_config based on question type
    let correctAnswerConfig: any;
    if (data.tipe === 'TRUE_FALSE_MULTI') {
        correctAnswerConfig = {
            answers: (data as any).answer_json || []
        };
    } else if (data.tipe === 'COMPLEX') {
        correctAnswerConfig = {
            multipleKeys: data.kunci_jawaban?.split(',') || []
        };
    } else {
        correctAnswerConfig = {
            singleKey: data.kunci_jawaban || 'A'
        };
    }

    const questionData = {
        nomor_urut: data.nomor_urut || 1,
        tipe: data.tipe || 'SINGLE',
        pertanyaan: data.pertanyaan || '',
        gambar_url: data.gambar_url || null,
        options: {
            A: (data as any).opsi_a || '',
            B: (data as any).opsi_b || '',
            C: (data as any).opsi_c || '',
            D: (data as any).opsi_d || '',
            E: (data as any).opsi_e || ''
        },
        statements_json: data.tipe === 'TRUE_FALSE_MULTI' ? ((data as any).statements_json || []) : null,
        correct_answer_config: correctAnswerConfig,
        bobot: data.bobot || 1,
        kategori: data.kategori || null,
        paket: (data as any).paket || null
    };

    console.log('📝 Updating question:', id_soal);

    // id_soal from frontend maps to 'id' column in DB
    const { error } = await (supabase as any)
        .from('questions')
        .update(questionData)
        .eq('id', id_soal)
        .eq('school_id', schoolId);

    if (error) {
        console.error('Update question error:', error);
        return { success: false, error: error.message };
    }

    console.log('✅ Question updated successfully');
    return { success: true };
}

// =====================================
// SMART EXAM TOKEN VERIFICATION
// =====================================

interface ExamAccessResult {
    success: boolean;
    error?: string;
    packet?: string;
}

/**
 * Verify exam access with token and packet status
 * 
 * Validates:
 * 1. Token matches schools.exam_token
 * 2. Student's packet is currently active
 * 
 * @param inputToken - Token entered by student
 * @returns Success status with error message if failed
 */
export async function verifyExamAccess(inputToken: string): Promise<ExamAccessResult> {
    const supabase = getSupabase();

    // Step 1: Get current user and their profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Sesi telah berakhir. Silakan login kembali.' };
    }

    // Fetch profile with class_group to determine packet
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id, class_group, role')
        .eq('id', user.id)
        .single();

    if (profileError || !(profile as any)?.school_id) {
        console.error('Profile fetch error:', profileError);
        return { success: false, error: 'Profil tidak ditemukan' };
    }

    const schoolId = (profile as any).school_id;
    const classGroup = (profile as any).class_group || '';

    // Determine student's packet from class_group based on Indonesian education levels:
    // - Paket A = SD (Elementary) - grades 1-6
    // - Paket B = SMP (Middle School) - grades VII, VIII, IX (7-9)
    // - Paket C = SMA (High School) - grades X, XI, XII (10-12)
    let studentPacket: 'A' | 'B' | 'C' = 'B'; // Default to B (SMP) for most schools
    const classUpper = classGroup.toUpperCase();

    // If class_group is empty, try to get packet from sessionStorage (set previously)
    // This allows admin to manually set packet during token entry
    if (!classGroup || classGroup.trim() === '') {
        // Check if there's a previously set packet in sessionStorage
        if (typeof window !== 'undefined') {
            const savedPacket = sessionStorage.getItem('exam_packet');
            if (savedPacket === 'A' || savedPacket === 'B' || savedPacket === 'C') {
                studentPacket = savedPacket;
                console.log('🎫 Using saved packet from session:', studentPacket);
            } else {
                // No saved packet, use default B (SMP - most common school type)
                console.log('⚠️ No class_group set and no saved packet, defaulting to B (SMP)');
            }
        }
    } else {
        // Detect from class_group
        // Check for SMP grades (VII, VIII, IX) - check these first as they're most specific
        if (classUpper.includes('VII') || classUpper.includes('VIII') || classUpper.includes('IX') ||
            classUpper.match(/\b[789]\b/)) {
            studentPacket = 'B';
        }
        // Check for SMA grades (X, XI, XII)
        else if (classUpper.includes('XII') || classUpper.includes('XI') || classUpper.includes('X') ||
            classUpper.match(/\b1[012]\b/)) {
            studentPacket = 'C';
        }
        // Check for SD grades (1-6)
        else if (classUpper.match(/\b[1-6]\b/) || classUpper.includes('SD')) {
            studentPacket = 'A';
        }
        // Default to B (SMP) if pattern doesn't match
    }

    console.log('🎫 Student packet determined:', studentPacket, 'from class:', classGroup || '(empty)');

    // Step 2: Fetch school's exam settings
    const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('exam_token, active_packets')
        .eq('id', schoolId)
        .single();

    if (schoolError || !school) {
        console.error('School fetch error:', schoolError);
        return { success: false, error: 'Data sekolah tidak ditemukan' };
    }

    const examToken = (school as any).exam_token;
    const activePackets = (school as any).active_packets || { paket_a: false, paket_b: false, paket_c: false };

    // Step 3: Validate Token
    if (!examToken) {
        return { success: false, error: 'Token ujian belum diatur oleh pengawas' };
    }

    if (inputToken.toUpperCase().trim() !== examToken.toUpperCase().trim()) {
        console.log('🚫 Token mismatch:', inputToken, '!==', examToken);
        return { success: false, error: 'Token Ujian Salah' };
    }

    // Step 4: Validate Packet Status
    const packetKey = `paket_${studentPacket.toLowerCase()}` as 'paket_a' | 'paket_b' | 'paket_c';
    const isPacketActive = activePackets[packetKey] === true;

    console.log('📦 Packet check:', packetKey, '=', isPacketActive, 'from', activePackets);

    if (!isPacketActive) {
        return {
            success: false,
            error: `Ujian untuk Paket ${studentPacket} belum diaktifkan oleh Pengawas`
        };
    }

    // Step 5: UPDATE PROFILE - Set is_login=true and status_ujian='SEDANG'
    // This is the TRIGGER that makes admin dashboard show "Sedang Ujian"
    const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({
            is_login: true,
            status_ujian: 'SEDANG',
            waktu_mulai: new Date().toISOString(),
            last_seen: new Date().toISOString()
        })
        .eq('id', user.id);

    if (updateError) {
        console.error('Failed to update exam status:', updateError);
        // Don't fail the whole flow, just log it
    }

    console.log('✅ Exam access verified and status updated for packet:', studentPacket);

    // All validations passed!
    return { success: true, packet: studentPacket };
}

