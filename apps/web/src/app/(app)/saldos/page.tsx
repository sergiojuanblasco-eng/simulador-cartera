import type { Metadata } from 'next';
import { Alert, Card, H2, LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { loadUserData } from '@/lib/data';
import { eur } from '@/lib/format';
import { saldoRows } from '@/lib/saldos-view';
import { SaldosForm } from './forms';

export const metadata: Metadata = { title: 'Saldos y valores' };

export default async function SaldosPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const rows = saldoRows(data);
  const total = rows.reduce((a, r) => a + r.valor, 0);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader back="/activos" title="Saldos y valores"
        subtitle="Lo que no tiene precio en internet: cuentas, planes de pensiones y depósitos. Con anotarlo una vez al mes basta." />

      {!data.saldosListos ? (
        <Alert>Falta un paso en la base de datos: ejecuta la actualización «valores anotados» (0007) en Supabase.</Alert>
      ) : null}
      {nuevo ? <Alert tone="ok">Añadido «{nuevo}». ¿Tienes otra cuenta, plan o depósito? Añádelo también y lo verás todo junto.</Alert> : null}

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <H2 className="text-xl">Todo tu dinero en un sitio</H2>
          <p className="max-w-md text-sm text-muted">Añade tu cuenta del banco (el colchón), tu plan de pensiones o un depósito. Apunta su valor de vez en cuando y verás tu patrimonio completo, no solo lo que tienes en el bróker.</p>
          <LinkButton href="/saldos/nuevo" className="mt-1 w-full max-w-xs">Añadir cuenta, plan o depósito</LinkButton>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <H2>Anotar todos de una vez</H2>
              <p className="text-[13px] text-muted">Abre tu banco, copia los saldos y listo: un minuto al mes.</p>
            </div>
            <span className="text-sm text-muted">Total ahora <span className="font-semibold text-ink tabular">{eur(total)}</span></span>
          </div>
          <SaldosForm rows={rows} today={data.today} />
        </Card>
      )}

      {rows.length ? <LinkButton href="/saldos/nuevo" variant="secondary" className="self-start">+ Añadir cuenta, plan o depósito</LinkButton> : null}
    </div>
  );
}
