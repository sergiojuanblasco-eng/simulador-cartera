'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Inicio', icon: <path d="M4 11 L12 4 L20 11 V20 H4 Z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" /> },
  { href: '/activos', label: 'Activos', icon: <><rect x="4" y="12" width="4" height="8" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="10" y="8" width="4" height="12" stroke="currentColor" strokeWidth="2" fill="none" /><rect x="16" y="4" width="4" height="16" stroke="currentColor" strokeWidth="2" fill="none" /></> },
  { href: '/rendimiento', label: 'Rendimiento', icon: <path d="M4 18 L10 12 L14 15 L20 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /> },
  { href: '/mes', label: 'Mes', icon: <><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M4 10 H20 M9 3 V7 M15 3 V7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></> },
  { href: '/mas', label: 'Más', icon: <><circle cx="6" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="18" cy="12" r="1.8" fill="currentColor" /></> },
];

const tools = [
  { href: '/simulador-cartera', label: 'Simulador de cartera', icon: <path d="M4 19 C8 17 9 9 12 9 C15 9 16 14 20 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /> },
  { href: '/interes-compuesto', label: 'Interés compuesto', icon: <><path d="M5 19 V13 M10 19 V10 M15 19 V7 M20 19 V4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></> },
];

const TOOL_PREFIXES = ['/simulador-cartera', '/interes-compuesto', '/simulacion/'];
/** Pantallas a las que se llega desde «Más». */
const MAS_PREFIXES = ['/mas', '/carteras', '/movimientos', '/importar'];

function isActive(path: string, href: string) {
  if (href === '/') return path === '/';
  if (href === '/activos' && path.startsWith('/saldos')) return true;
  // En el móvil, las herramientas cuelgan de «Más».
  if (href === '/mas' && [...TOOL_PREFIXES, ...MAS_PREFIXES].some((p) => path.startsWith(p))) return true;
  return path === href || path.startsWith(href + '/');
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = isActive(path, it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? 'page' : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${active ? 'font-semibold text-brand' : 'font-medium text-muted'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">{it.icon}</svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const path = usePathname();
  const link = (it: (typeof items)[number], active: boolean) => (
    <Link key={it.href} href={it.href} aria-current={active ? 'page' : undefined}
      className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] ${active ? 'bg-brand-soft font-semibold text-brand-dark' : 'font-medium text-muted-2 hover:bg-subtle'}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">{it.icon}</svg>
      {it.label}
    </Link>
  );
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1">
      {items.map((it) => link(it, it.href === '/mas' ? MAS_PREFIXES.some((p) => path.startsWith(p)) : isActive(path, it.href)))}
      <span className="mt-4 px-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Herramientas</span>
      {tools.map((it) => link(it, path === it.href || (it.href === '/simulador-cartera' && path.startsWith('/simulacion/'))))}
    </nav>
  );
}
