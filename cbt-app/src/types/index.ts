// =====================================
// Type Definitions for CBT Application
// =====================================

// Re-export database types for convenience
export type {
    QuestionOptions,
    AnswerConfig,
    SingleAnswerConfig,
    ComplexAnswerConfig,
    TrueFalseMultiAnswerConfig,
    Tables,
    InsertTables,
    UpdateTables
} from './database';

// =====================================
// Multi-Tenant Base Types
// =====================================

/**
 * Base interface for all multi-tenant entities
 * Every entity that belongs to a school should extend this
 */
export interface MultiTenantEntity {
    school_id: string;
}

// Config types
export interface ExamConfig {
    exam_name: string;
    exam_duration: number; // in minutes
    max_violations: number;
    auto_submit: boolean;
    shuffle_questions: boolean;
    admin_password?: string;
    live_score_pin?: string;
}

// User types
export interface User extends Partial<MultiTenantEntity> {
    id_siswa: string;
    username: string;
    nama_lengkap: string;
    kelas: string;
    status_login?: boolean;
    waktu_mulai?: string | null;
    waktu_selesai?: string | null;
    skor_akhir?: number | null;
    violation_count?: number | null;
    status_ujian?: 'BELUM' | 'SEDANG' | 'SELESAI' | 'DISKUALIFIKASI';
    last_seen?: string | null;
    exam_duration?: number;
}

// User data for print login cards (includes password)
export interface UserForPrint {
    id_siswa: string;
    username: string;
    password: string;
    nama_lengkap: string;
    kelas: string;
}

// Question types
export type QuestionType = 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI';

/**
 * Question interface with multi-tenant support
 * Maintains backward compatibility with id_soal field
 */
export interface Question extends Partial<MultiTenantEntity> {
    // New Supabase fields
    id?: string;

    // Legacy fields for backward compatibility
    id_soal: string;
    nomor_urut: number;
    tipe: QuestionType;
    pertanyaan: string;
    gambar_url?: string | null;

    // Legacy option fields (for backward compatibility with GAS)
    opsi_a: string;
    opsi_b: string;
    opsi_c: string;
    opsi_d: string;
    opsi_e?: string | null;

    bobot: number;
    kategori?: string | null;
    paket?: string;

    // TRUE_FALSE_MULTI specific fields (optional)
    statements_json?: string[] | null;
    answer_json?: boolean[] | null;
}

// Answer types - includes (boolean | null)[] for TRUE_FALSE_MULTI unanswered statements
export type Answer = string | string[] | boolean[] | (boolean | null)[];
export type AnswersRecord = Record<string, Answer>;

// Response from exam
export interface ExamResponse {
    timestamp: string;
    id_siswa: string;
    nama_lengkap: string;
    kelas: string;
    jawaban_raw: string;
    skor_akhir: number;
    durasi_ujian: number;
    log_violation: string;
    ip_address?: string;
}

// Live Score types
export interface LiveScoreEntry {
    rank: number;
    nama: string;
    kelas: string;
    skor: number;
    status: 'SELESAI' | 'DISKUALIFIKASI' | 'SEDANG' | 'BELUM';
    waktu_selesai: string;
    waktu_submit_ms: number;
}

export interface LiveScoreStats {
    total: number;
    sedang: number;
    selesai: number;
    diskualifikasi: number;
    belum: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    stats?: LiveScoreStats;
    score?: string;
    status?: string;
    violations?: number;
    disqualified?: boolean;
}

// Exam State (for Zustand/IndexedDB)
export interface ExamState {
    id_siswa: string;
    nama_lengkap: string;
    kelas: string;
    answers: AnswersRecord;
    lastSync: Date | null;
    timeRemaining: number; // in seconds
    violations: number;
    currentQuestion: number;
    isSubmitted: boolean;
}

// Violation types
export type ViolationType =
    | 'tab_switch'
    | 'blur'
    | 'copy'
    | 'paste'
    | 'contextmenu'
    | 'devtools'
    | 'keyboard_shortcut';
