import { NextResponse } from 'next/server';

export function proxy(request) {
  const session = request.cookies.get('gnis_session');
  const { pathname } = request.nextUrl;

  // --- TEMPORARY DEV BYPASS ---
  // We commented this out so it stops forcing you back to the landing page
  // if (pathname.startsWith('/dashboard') && !session) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }

  // If they are logged in, don't let them go back to the login/landing page 
  // (Optional logic to keep them in the dashboard)
  
  return NextResponse.next();
}

// Ensure middleware only runs on specific routes to save server power
export const config = {
  matcher: ['/dashboard/:path*', '/'],
};