import { NextResponse } from 'next/server'

export function proxy(request) {
  const { pathname } = request.nextUrl

  // Only guard the dashboard; everything else is public
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('gnis_session')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}