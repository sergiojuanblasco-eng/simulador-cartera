import { notFound } from 'next/navigation';
import { goalEta } from '@/lib/view-models';
import { DashboardView } from '@/components/dashboard-view';
import { demoData } from '@/lib/demo';
import { hoyMadrid } from '@/lib/format';
import { compactSeries, distributions, stackBy } from '@/lib/view-models';

/** Vista previa del dashboard con datos de ejemplo. Solo en desarrollo (o con ENABLE_PREVIEW=1). */
export default function PreviewPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_PREVIEW !== '1') notFound();
  const today = hoyMadrid();
  const { holdings, result, labels } = demoData(today);
  const lp = result.metrics.valor * 0.8;
  return (
    <main className="mx-auto max-w-[1100px] px-4 pt-6 pb-16 sm:px-6">
      <DashboardView
        nombre="Sergio"
        today={today}
        carteras={[{ id: 'p1', nombre: 'Largo plazo' }, { id: 'p2', nombre: 'Colchón' }, { id: 'p3', nombre: 'Especulativo' }]}
        selected={null}
        metrics={result.metrics}
        value={compactSeries(result.series, today).map((p) => ({ fecha: p.fecha, valor: p.valor, aportado: p.aportado }))}
        byProduct={stackBy(result.series, holdings, 'producto', today)}
        byType={stackBy(result.series, holdings, 'tipo', today)}
        dists={distributions(result, holdings, labels)}
        goals={[{ id: 'p1', nombre: 'Largo plazo', valor: lp, objetivo: 100000, anio: 2035, eta: goalEta(lp, 100000, 550, today) }]}
        warnings={result.warnings}
        baseHref="/dev/preview"
      />
    </main>
  );
}
