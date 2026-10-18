import type { Metadata } from 'next';
import { BackLink, H1 } from '@/components/ui';
import { RecoverForm } from '../forms';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function RecuperarPage() {
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/login" />
      <div className="flex flex-col gap-2">
        <H1>Recuperar contraseña</H1>
        <p className="text-[15px] text-muted">Te enviamos un enlace para crear una nueva.</p>
      </div>
      <RecoverForm />
    </div>
  );
}
