import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, PageHeader } from '@/components/ui';
import { DeleteAccountForm } from '../forms';

export const metadata: Metadata = { title: 'Eliminar cuenta' };

export default function CuentaPage() {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageHeader back="/mas" title="Eliminar mi cuenta" />
      <Alert>Se borrarán para siempre tu cuenta, tus carteras y todas tus operaciones. No se puede deshacer.</Alert>
      <p className="text-sm text-muted-2">Antes, si quieres, <Link href="/api/exportar" className="font-semibold text-brand">descarga una copia de tus datos</Link>.</p>
      <DeleteAccountForm />
    </div>
  );
}
