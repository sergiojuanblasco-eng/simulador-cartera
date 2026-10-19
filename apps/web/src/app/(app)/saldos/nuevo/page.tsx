import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { BROKERS } from '@/lib/db';
import { hoyMadrid } from '@/lib/format';
import { SALDO_KINDS, type SaldoKind } from '@/lib/saldos';
import { NewSaldoForm } from '../forms';

export const metadata: Metadata = { title: 'Añadir cuenta, plan o depósito' };

const BANCOS = ['BBVA', 'Santander', 'CaixaBank', 'ING', 'Sabadell', 'Bankinter', 'Unicaja', 'Abanca', 'Openbank', 'MyInvestor', 'Trade Republic', 'Revolut', 'N26'];

export default async function NuevoSaldoPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const { supabase } = await requireUser();
  const [{ data: carteras }, { data: cuentas }] = await Promise.all([
    supabase.from('portfolios').select('id, nombre, objetivo').order('orden').order('created_at'),
    supabase.from('accounts').select('nombre').order('nombre'),
  ]);
  if (!carteras?.length) redirect('/carteras/nueva?primera=1');
  const entidades = [...new Set([...(cuentas ?? []).map((c) => c.nombre as string), ...BANCOS])].filter((x) => !BROKERS.includes(x) || x === 'MyInvestor' || x === 'Trade Republic');
  const kind = SALDO_KINDS.find((k) => k.kind === tipo)?.kind ?? null;

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader back="/saldos" title="Añadir" subtitle="Cuentas, planes de pensiones, depósitos y todo lo que no tiene precio en internet." />
      <NewSaldoForm portfolios={carteras.map((c) => ({ id: c.id, nombre: c.nombre, objetivo: c.objetivo }))}
        entidades={entidades} today={hoyMadrid()} initialKind={kind as SaldoKind | null} />
    </div>
  );
}
