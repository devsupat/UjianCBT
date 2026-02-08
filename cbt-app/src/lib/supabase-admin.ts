/**
 * Supabase Admin Client (Service Role)
 * 
 * Use this client ONLY for server-side operations that require elevated privileges:
 * - Creating auth users
 * - Deleting auth users
 * - Admin-level database operations
 * 
 * NEVER expose this client to the browser!
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Create a Supabase client with Service Role key
 * This bypasses Row Level Security - use with caution!
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
        )
    }

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
