import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

    // 세션 갱신
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // 인증 페이지 경로
    const authPaths = ['/login', '/signup', '/reset-password', '/auth']

    // 인증 페이지는 항상 접근 가능
    const isAuthPage = authPaths.some((p) => path.startsWith(p))

    // 인증된 사용자가 인증 페이지 접근 시 홈으로 리다이렉트
    if (isAuthPage && user && !path.startsWith('/auth/callback')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // 인증 페이지가 아니고 사용자가 없으면 로그인 페이지로 리다이렉트
    if (!isAuthPage && !user) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
