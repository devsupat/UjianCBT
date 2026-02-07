/**
 * Supabase Server Client
 * Task 3.1: Supabase Client Initialization
 * 
 * Use this client for server-side operations in:
 * - API Routes
 * - Server Components
 * - Server Actions
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Create a Supabase client for server-side operations
 * Handles cookie management for session persistence
 */
export async function createServerSupabaseClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Cookie errors in Server Components are expected
                        // when reading from a read-only context
                    }
                },
            },
        }
    )
}

/**
 * Helper to get school_id from server context
 */
export async function getServerSchoolId(): Promise<string | null> {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single()

    return (profile as { school_id: string } | null)?.school_id ?? null
}
