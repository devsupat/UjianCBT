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

    // Protect admin routes (except login page /admin itself)
    const isAdminLoginPage = request.nextUrl.pathname === '/admin'
    const isProtectedAdminRoute = request.nextUrl.pathname.startsWith('/admin/') && !isAdminLoginPage

    if (isProtectedAdminRoute) {
        console.log('🔒 Middleware: Protecting admin route:', request.nextUrl.pathname);
        console.log('👤 User found:', !!user);

        if (!user) {
            // Redirect to admin login page
            console.log('❌ No user, redirecting to /admin');
            const url = request.nextUrl.clone()
            url.pathname = '/admin'
            return NextResponse.redirect(url)
        }

        // Check if user is admin AND school has valid license
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, school_id, schools!inner(license_status)')
            .eq('id', user.id)
            .single()

        console.log('📊 Profile query result:', { profile, profileError });

        if (!profile || profile?.role !== 'ADMIN') {
            console.log('❌ Not admin, redirecting to /');
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }

        // Check license status for admin (Anti-Kabur)
        const licenseStatus = (profile as any)?.schools?.license_status
        console.log('🔑 License status:', licenseStatus);

        if (licenseStatus === false) {
            console.log('❌ License expired, redirecting to /license-expired');
            const url = request.nextUrl.clone()
            url.pathname = '/license-expired'
            return NextResponse.redirect(url)
        }

        console.log('✅ Admin access granted');
    }

    console.log('🌐 Middleware: Requesting', request.nextUrl.pathname);
    return supabaseResponse
}

export const config = {
    matcher: [
        '/exam/:path*',
        '/pin-verify',
        '/admin',
        '/admin/:path*'
    ],
}
