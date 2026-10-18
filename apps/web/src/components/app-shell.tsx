import { BottomNav, SideNav } from '@/components/nav';
import { PriceRefresher } from '@/components/price-refresher';
import { LinkButton, Logo } from '@/components/ui';

/** Marco de la app (menú lateral en escritorio, barra inferior en el móvil). */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px]">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line px-4 py-6 lg:flex">
        <Logo />
        <LinkButton href="/movimiento" className="w-full">+ Nuevo movimiento</LinkButton>
        <SideNav />
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-12">{children}</main>
      <BottomNav />
      <PriceRefresher />
    </div>
  );
}
