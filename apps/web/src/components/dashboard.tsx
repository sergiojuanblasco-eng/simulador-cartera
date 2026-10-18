'use client';

import { useMemo, useState } from 'react';
import { StackedChart, ValueChart } from '@/components/charts';
import { Card, H2, Segmented, Swatch } from '@/components/ui';
import { eur, pct } from '@/lib/format';
import type { DistributionSets, StackSeries } from '@/lib/view-models';

const PERIODS = [
  { value: '1M', label: '1M' }, { value: '6M', label: '6M' }, { value: '1A', label: '1A' },
  { value: '3A', label: '3A' }, { value: 'Todo', label: 'Todo' },
] as const;
type Period = (typeof PERIODS)[number]['value'];
const DAYS: Record<Period, number | null> = { '1M': 31, '6M': 183, '1A': 365, '3A': 1096, Todo: null };

function cut<T extends { fecha: string | number }>(rows: T[], period: Period, today: string): T[] {
  const n = DAYS[period];
  if (!n) return rows;
  const from = new Date(Date.parse(today + 'T00:00:00Z') - n * 86_400_000).toISOString().slice(0, 10);
  return rows.filter((r) => String(r.fecha) >= from);
}

export function DashboardCharts({ today, value, byProduct, byType }: {
  today: string;
  value: { fecha: string; valor: number; aportado: number }[];
  byProduct: StackSeries;
  byType: StackSeries;
}) {
  const [period, setPeriod] = useState<Period>('Todo');
  const [view, setView] = useState<'producto' | 'tipo'>('producto');
  const v = useMemo(() => cut(value, period, today), [value, period, today]);
  const stack = view === 'producto' ? byProduct : byType;
  const s = useMemo(() => cut(stack.rows as { fecha: string }[], period, today), [stack, period, today]);

  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Periodo" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ ...p }))} />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div>
            <H2>Tu dinero vs. mercado</H2>
            <p className="text-[13px] text-muted">Lo que has puesto frente a lo que vale hoy</p>
          </div>
          <ValueChart rows={v} />
          <div className="flex gap-5 text-[13px]">
            <span className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-brand" />Valor real</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-[#A1A1AA]" />Capital aportado</span>
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <div>
            <H2>Evolución de tu cartera</H2>
            <p className="text-[13px] text-muted">Cuánto vale cada fondo, ETF o cripto en el tiempo</p>
          </div>
          <Segmented label="Agrupar" value={view} onChange={setView} options={[{ value: 'producto', label: 'Por producto' }, { value: 'tipo', label: 'Por tipo' }]} />
          <StackedChart keys={stack.keys} rows={s} />
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            {stack.keys.map((k) => (
              <span key={k.key} className="flex min-w-0 items-center gap-2"><Swatch color={k.color} /><span className="truncate">{k.label}</span></span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const TABS = [
  { value: 'producto', label: 'Producto' },
  { value: 'cartera', label: 'Cartera' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'cuenta', label: 'Bróker' },
] as const;

export function DistributionCard({ sets }: { sets: DistributionSets }) {
  const [tab, setTab] = useState<keyof DistributionSets>('producto');
  const items = sets[tab];
  return (
    <Card className="flex flex-col gap-4">
      <H2>Distribución</H2>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Agrupar distribución">
        {TABS.map((t) => (
          <button key={t.value} type="button" aria-pressed={tab === t.value} onClick={() => setTab(t.value)}
            className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold ${tab === t.value ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? <p className="text-sm text-muted">Sin datos todavía.</p> : (
        <>
          <div className="flex h-[18px] w-full overflow-hidden rounded-md" aria-hidden="true">
            {items.map((d) => <div key={d.key} style={{ width: `${d.pct * 100}%`, background: d.color }} className="h-full border-r-2 border-surface last:border-r-0" />)}
          </div>
          <ul className="flex flex-col gap-2.5">
            {items.map((d) => (
              <li key={d.key} className="flex items-center gap-2.5 text-sm">
                <Swatch color={d.color} />
                <span className="min-w-0 flex-1 truncate">{d.label}</span>
                <span className="text-muted tabular">{eur(d.valor)}</span>
                <span className="w-14 text-right font-semibold tabular">{pct(d.pct)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === 'cartera' ? <a href="/carteras" className="self-start py-1 text-sm font-semibold text-brand">Gestionar mis carteras →</a> : null}
    </Card>
  );
}
