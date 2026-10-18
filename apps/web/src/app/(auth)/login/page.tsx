import type { Metadata } from 'next';
import Link from 'next/link';
import { H1, Logo } from '@/components/ui';
import { LoginForm } from '../forms';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col gap-7">
      <Link href="/" aria-label="Kartera, inicio"><Logo /></Link>
      <div className="mt-6 flex flex-col gap-2">
        <H1 className="text-[40px] leading-[1.05]">Todas tus inversiones, en un solo sitio.</H1>
        <p className="text-[15px] text-muted">Entra para ver cómo van tus inversiones.</p>
      </div>
      <LoginForm />
      <div className="mt-auto flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface p-4 text-center text-sm text-muted-2">
        <span>¿Aún no tienes cuenta? Kartera está en beta privada.</span>
        <Link href="/registro" className="py-1.5 font-semibold text-brand">Pide tu acceso →</Link>
      </div>
    </div>
  );
}
