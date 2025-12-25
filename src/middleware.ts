import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/invite']
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/invite/')
  )

  // Onboarding route - requires auth but not org
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  // Protected routes that require auth AND organization
  const isProtectedRoute = pathname.startsWith('/dashboard')

  // Handle unauthenticated users
  if (!user) {
    if (isProtectedRoute || isOnboardingRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // User is authenticated - check organization membership for protected routes
  if (isProtectedRoute) {
    // Check if user has any organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)

    const hasOrganization = memberships && memberships.length > 0

    if (!hasOrganization) {
      // User has no organizations - redirect to onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Redirect logged in users from login/signup pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    // Check if user has organization
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)

    const hasOrganization = memberships && memberships.length > 0

    if (hasOrganization) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Redirect from onboarding if user already has organization
  if (user && isOnboardingRoute) {
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)

    const hasOrganization = memberships && memberships.length > 0

    if (hasOrganization) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
