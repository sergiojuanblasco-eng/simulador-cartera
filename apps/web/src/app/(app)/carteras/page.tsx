import type { Metadata } from 'next';
import { LinkButton, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { PortfolioCard } from './portfolio-card';

export const metadata: Metadata = { title: 'Mis carteras' };

export default async function CarterasPage() {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const result = compute(data);
  const valueBy = new Map<string, number>();
  const countBy = new Map<string, number>();
  for (const p of result.positions) {
    const h = data.holdings.find((x) => x.id === p.holdingId);
    if (!h || p.cantidad <= 1e-9) continue;
    valueBy.set(h.portfolio_id, (valueBy.get(h.portfolio_id) ?? 0) + p.valor);
    countBy.set(h.portfolio_id, (countBy.get(h.portfolio_id) ?? 0) + 1);
  }
  const total = [...valueBy.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader back="/mas" title="Mis carteras" subtitle="Separa tu dinero por objetivo y plazo" />
      <div className="flex flex-col gap-3">
        {data.portfolios.map((p) => (
          <PortfolioCard
            key={p.id}
            id={p.id}
            nombre={p.nombre}
            objetivoImporte={p.objetivo_importe ? Number(p.objetivo_importe) : null}
            objetivoAnio={p.objetivo_anio}
            valor={valueBy.get(p.id) ?? 0}
            productos={countBy.get(p.id) ?? 0}
            peso={total > 0 ? (valueBy.get(p.id) ?? 0) / total : 0}
          />
        ))}
      </div>
      <LinkButton href="/carteras/nueva">+ Nueva cartera</LinkButton>
    </div>
  );
}
