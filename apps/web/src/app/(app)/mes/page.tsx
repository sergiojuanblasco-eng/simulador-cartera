import type { Metadata } from 'next';
import { MonthBars } from '@/components/charts';
import { Card, H2, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { eur, eurSigned, mesLargo } from '@/lib/format';

export const metadata: Metadata = { title: 'Cartera del mes' };

export default async function MesPage() {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const result = compute(data);
  const months = result.months;
  const cur = months[months.length - 1];

  if (!cur) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Cartera del mes" />
        <Card className="text-sm text-muted">Aquí verás cada mes cuánto creció tu patrimonio por lo que aportaste y cuánto por el mercado.</Card>
      </div>
    );
  }
  const prevFin = months.length > 1 ? months[months.length - 2]!.valorFin : 0;
  const cambio = cur.valorFin - prevFin;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Cartera del mes" subtitle="Lo que aportaste frente a lo que hizo el mercado" />

      <section className="flex flex-col gap-4 rounded-[18px] bg-ink p-5 text-white">
        <span className="text-[13px] capitalize text-[#B8B8B0]">{mesLargo(cur.mes)}</span>
        <div className="flex flex-col gap-1">
          <span className="text-[34px] leading-none font-bold tracking-tight tabular">{eurSigned(cambio)}</span>
          <span className="text-sm text-[#B8B8B0]">Cambio de tu patrimonio este mes</span>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-ink-2 pt-3">
          <div className="flex flex-col"><span className="text-xs text-[#B8B8B0]">Dinero nuevo aportado</span><span className="font-semibold tabular">{eurSigned(cur.aportado)}</span></div>
          <div className="flex flex-col"><span className="text-xs text-[#B8B8B0]">Ganancia del mercado</span>
            <span className={`font-semibold tabular ${cur.ganancia >= 0 ? 'text-pos-on-dark' : 'text-neg-on-dark'}`}>{eurSigned(cur.ganancia)}</span></div>
        </div>
      </section>

      <Card className="flex flex-col gap-3">
        <H2>Últimos 12 meses</H2>
        <MonthBars data={months.slice(-12)} />
        <div className="flex flex-wrap gap-5 text-[13px]">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#A7D7BF]" />Aportado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#14532D]" />Ganancia del mercado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#D9822B]" />Pérdida del mercado</span>
        </div>
      </Card>

      <Card className="flex flex-col gap-1 overflow-x-auto">
        <H2>Mes a mes</H2>
        <table className="w-full min-w-[420px] text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-2 font-medium">Mes</th><th className="py-2 text-right font-medium">Aportado</th><th className="py-2 text-right font-medium">Mercado</th><th className="py-2 text-right font-medium">Valor final</th></tr></thead>
          <tbody>
            {[...months].reverse().map((mm) => (
              <tr key={mm.mes} className="border-t border-line">
                <td className="py-2 capitalize">{mesLargo(mm.mes)}</td>
                <td className="py-2 text-right tabular">{eurSigned(mm.aportado)}</td>
                <td className={`py-2 text-right font-semibold tabular ${mm.ganancia >= 0 ? 'text-pos' : 'text-neg'}`}>{eurSigned(mm.ganancia)}</td>
                <td className="py-2 text-right tabular">{eur(mm.valorFin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
