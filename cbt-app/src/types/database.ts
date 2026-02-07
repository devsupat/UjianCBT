/**
 * Supabase Database Types
 * Auto-generated types for type-safe database operations
 * 
 * To regenerate, run: npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            schools: {
                Row: {
                    id: string
                    name: string
                    license_status: boolean
                    logo_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    license_status?: boolean
                    logo_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    license_status?: boolean
                    logo_url?: string | null
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    school_id: string
                    full_name: string
                    role: 'ADMIN' | 'STUDENT'
                    class_group: string | null
                    photo_url: string | null
                    created_at: string
                    updated_at: string
                    // Exam state columns (from migration 003)
                    status_ujian: 'BELUM' | 'SEDANG' | 'SELESAI' | 'DISKUALIFIKASI' | null
                    waktu_mulai: string | null
                    waktu_selesai: string | null
                    skor_akhir: number | null
                    violation_count: number | null
                    last_seen: string | null
                }
                Insert: {
                    id: string
                    school_id: string
                    full_name: string
                    role?: 'ADMIN' | 'STUDENT'
                    class_group?: string | null
                    photo_url?: string | null
                    created_at?: string
                    updated_at?: string
                    status_ujian?: 'BELUM' | 'SEDANG' | 'SELESAI' | 'DISKUALIFIKASI'
                    waktu_mulai?: string | null
                    waktu_selesai?: string | null
                    skor_akhir?: number | null
                    violation_count?: number
                    last_seen?: string | null
                }
                Update: {
                    id?: string
                    school_id?: string
                    full_name?: string
                    role?: 'ADMIN' | 'STUDENT'
                    class_group?: string | null
                    photo_url?: string | null
                    updated_at?: string
                    status_ujian?: 'BELUM' | 'SEDANG' | 'SELESAI' | 'DISKUALIFIKASI'
                    waktu_mulai?: string | null
                    waktu_selesai?: string | null
                    skor_akhir?: number | null
                    violation_count?: number
                    last_seen?: string | null
                }
            }
            questions: {
                Row: {
                    id: string
                    school_id: string
                    nomor_urut: number
                    tipe: 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI'
                    pertanyaan: string
                    gambar_url: string | null
                    options: QuestionOptions
                    correct_answer_config: AnswerConfig
                    bobot: number
                    kategori: string | null
                    paket: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    school_id: string
                    nomor_urut: number
                    tipe: 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI'
                    pertanyaan: string
                    gambar_url?: string | null
                    options: QuestionOptions
                    correct_answer_config: AnswerConfig
                    bobot?: number
                    kategori?: string | null
                    paket?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    school_id?: string
                    nomor_urut?: number
                    tipe?: 'SINGLE' | 'COMPLEX' | 'TRUE_FALSE_MULTI'
                    pertanyaan?: string
                    gambar_url?: string | null
                    options?: QuestionOptions
                    correct_answer_config?: AnswerConfig
                    bobot?: number
                    kategori?: string | null
                    paket?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            calculate_score: {
                Args: {
                    p_answers: Json
                    p_forced?: boolean
                }
                Returns: {
                    score: number
                    status: string
                    details: Json
                }[]
            }
            report_violation: {
                Args: {
                    p_violation_type: string
                }
                Returns: {
                    current_violations: number
                    is_disqualified: boolean
                }[]
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

// =====================================
// Question-specific types
// =====================================

export interface QuestionOptions {
    a: string
    b: string
    c: string
    d: string
    e?: string
}

// Answer configuration for different question types
export type AnswerConfig =
    | SingleAnswerConfig
    | ComplexAnswerConfig
    | TrueFalseMultiAnswerConfig

export interface SingleAnswerConfig {
    type: 'SINGLE'
    answer: string // e.g., "A", "B", "C", "D", "E"
}

export interface ComplexAnswerConfig {
    type: 'COMPLEX'
    answers: string[] // e.g., ["A", "C"]
}

export interface TrueFalseMultiAnswerConfig {
    type: 'TRUE_FALSE_MULTI'
    statements: string[] // List of statements
    answers: boolean[] // Corresponding true/false for each statement
}

// =====================================
// Helper types for Supabase operations
// =====================================

export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update']
