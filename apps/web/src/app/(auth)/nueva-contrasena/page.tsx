import type { Metadata } from 'next';
import { H1 } from '@/components/ui';
import { NewPasswordForm } from '../forms';

export const metadata: Metadata = { title: 'Nueva contraseña' };

export default function NuevaContrasenaPage() {
  return (
    <div className="flex flex-col gap-6">
      <H1>Elige una contraseña nueva</H1>
      <NewPasswordForm />
    </div>
  );
}
