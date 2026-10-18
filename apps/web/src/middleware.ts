import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Rutas accesibles sin sesión. */
const PUBLIC_PREFIXES = [
  '/login', '/registro', '/recuperar', '/privacidad', '/auth/', '/api/cron/', '/api/lista-espera', '/dev/', '/diag-fuentes',
  // Herramientas públicas de Kartera (SEO)
  '/simulador-cartera', '/interes-compuesto', '/simulacion/', '/landing.html', '/sitemap.xml', '/robots.txt',
];

/** Portada: visitantes ven la landing de kartera.pro; con sesión, el panel. */
function landing(request: NextRequest) {
  return NextResponse.rewrite(new URL('/landing.html', request.url));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  if (!url || !key) {
    // Sin configurar: solo se pueden ver las páginas públicas.
    if (path === '/') return landing(request);
    return isPublic ? response : NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresca la sesión si ha caducado. No poner código entre createServerClient y getUser.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && path === '/') return landing(request);
  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    to.search = '';
    return NextResponse.redirect(to);
  }
  if (user && (path === '/login' || path === '/registro')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|sw.js|offline.html|plantilla.csv|manifest.webmanifest).*)'],
};
