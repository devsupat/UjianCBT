/**
 * Next.js Middleware for License Check
 * Task 4.1: Anti-Kabur Mechanism
 * 
 * Protects exam routes by checking:
 * 1. User authentication
 * 2. School license status
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect exam routes - must be authenticated
    if (
        request.nextUrl.pathname.startsWith('/exam') ||
        request.nextUrl.pathname.startsWith('/pin-verify')
    ) {
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // Check license status (Anti-Kabur)
        const { data: profile } = await supabase
            .from('profiles')
            .select('school_id, schools!inner(license_status)')
            .eq('id', user.id)
            .single()

        const licenseStatus = (profile as any)?.schools?.license_status

        if (licenseStatus === false) {
            // License expired or disabled - redirect to blocked page
            const url = request.nextUrl.clone()
            url.pathname = '/license-expired'
            return NextResponse.redirect(url)
        }
    }

    // Protect admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin'
            return NextResponse.redirect(url)
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'ADMIN') {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/exam/:path*',
        '/pin-verify',
        '/admin/:path*'
    ],
}
