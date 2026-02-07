/**
 * Supabase Browser Client
 * Task 3.1: Supabase Client Initialization
 * 
 * Use this client for client-side operations in React components.
 * RLS policies automatically filter data based on authenticated user.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Create a new Supabase browser client instance
 * Use this function when you need a fresh client
 */
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// Singleton instance for client-side to avoid creating multiple connections
let supabaseInstance: ReturnType<typeof createClient> | null = null

/**
 * Get the singleton Supabase client instance
 * Recommended for most use cases to avoid creating multiple connections
 */
export function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient()
    }
    return supabaseInstance
}

/**
 * Helper to get current user's school_id
 * Useful for manual filtering when needed
 */
export async function getCurrentSchoolId(): Promise<string | null> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single()

    return (profile as { school_id: string } | null)?.school_id ?? null
}

