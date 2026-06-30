import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAdmin = pathname.includes('/admin');
  
  if (isAdmin) {
    const basicAuth = req.headers.get('authorization');
    
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');
      
      // Defaults can be overridden in Vercel env variables
      const validUser = process.env.ADMIN_USERNAME || 'admin';
      const validPass = process.env.ADMIN_PASSWORD || 'mauritanie2026';
      
      if (user === validUser && pwd === validPass) {
        return intlMiddleware(req);
      }
    }
    
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"'
      }
    });
  }

  return intlMiddleware(req);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ar|fr|en)/:path*']
};
