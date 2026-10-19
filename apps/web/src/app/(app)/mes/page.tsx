import type { Metadata } from 'next';
import Link from 'next/link';
import { monthDetail } from '@kartera/core';
import { MonthBars } from '@/components/charts';
import { MonthPicker } from '@/components/month-picker';
import { Card, H2, PageHeader } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { eur, eurSigned, fechaCorta, mesLargo } from '@/lib/format';

export const metadata: Metadata = { title: 'El mes' };

const tone = (v: number) => (v > 0.5 ? 'text-pos' : v < -0.5 ? 'text-neg' : 'text-muted');

export default async function MesPage({ searchParams }: { searchParams: Promise<{ mes?: string; cartera?: string }> }) {
  const { mes, cartera } = await searchParams;
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const selected = data.portfolios.find((p) => p.id === cartera)?.id ?? null;
  const result = compute(data, selected);
  const months = result.months;

  if (!months.length) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="El mes" />
        <Card className="text-sm text-muted">Aquí verás cada mes cuánto creció tu patrimonio por lo que aportaste tú y cuánto por el mercado, producto a producto.</Card>
      </div>
    );
  }

  const keys = months.map((m) => m.mes);
  const actual = keys.includes(mes ?? '') ? mes! : keys[keys.length - 1]!;
  const d = monthDetail(result, actual)!;
  const href = (m: string, c: string | null = selected) => {
    const q = new URLSearchParams();
    if (m !== keys[keys.length - 1]) q.set('mes', m);
    if (c) q.set('cartera', c);
    const s = q.toString();
    return s ? `/mes?${s}` : '/mes';
  };
  const hrefFor = Object.fromEntries(keys.map((k) => [k, href(k)]));
  const enCurso = actual === data.today.slice(0, 7);
  const cambio = d.fin - d.inicio;
  const nombres = new Map(data.holdings.map((h) => [h.id, h.asset.nombre]));
  const hayNuevo = d.productos.some((p) => Math.abs(p.nuevo) > 0.5);
  const hayTraspaso = d.productos.some((p) => Math.abs(p.traspaso) > 0.5);
  const historialNuevo = months.some((m) => m.nuevo > 0.5);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="El mes" subtitle="Lo que pusiste tú y lo que hizo el mercado, producto a producto" />

      {data.portfolios.length > 1 ? (
        <nav aria-label="Filtrar por cartera" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Link href={href(actual, null)} aria-current={!selected ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!selected ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>Todo</Link>
          {data.portfolios.map((c) => (
            <Link key={c.id} href={href(actual, c.id)} aria-current={selected === c.id ? 'page' : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${selected === c.id ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>{c.nombre}</Link>
          ))}
        </nav>
      ) : null}

      <MonthPicker months={keys} value={actual} hrefFor={hrefFor} />

      <section className="flex flex-col gap-2 rounded-[18px] bg-ink p-5 text-white">
        <span className="text-[13px] text-[#B8B8B0]">
          <span className="capitalize">{mesLargo(actual)}</span>{enCurso ? ` · en curso, hasta el ${fechaCorta(d.hasta)}` : ''}
        </span>
        <span className="text-[40px] leading-none font-bold tracking-tight tabular sm:text-[48px]">{eurSigned(cambio)}</span>
        <span className="text-sm text-[#B8B8B0]">Tu patrimonio pasó de <span className="font-semibold text-white tabular">{eur(d.inicio)}</span> a <span className="font-semibold text-white tabular">{eur(d.fin)}</span></span>
        {d.nuevo > 0.5 ? (
          <span className="self-start rounded-full bg-white/10 px-3 py-1 text-[13px] text-[#D8D8D0]">De la diferencia, {eur(d.nuevo)} es lo que empezaste a seguir este mes</span>
        ) : null}
      </section>

      <div className={`grid gap-2.5 ${d.nuevo > 0.5 || d.comisiones > 0 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
        <MesCard color="#4A7FB5" label="Lo pusiste tú" value={eurSigned(d.aportado)} sub={d.aportado < -0.5 ? 'Sacaste más de lo que metiste' : 'Tus aportaciones del mes'} />
        <MesCard color="#3E9A6F" label="Lo puso el mercado" value={eurSigned(d.mercado)} valueClass={tone(d.mercado)} sub={d.mercado < -0.5 ? 'Bajadas normales: no es dinero que hayas sacado' : 'Revalorización, sin tocar nada'} />
        {d.nuevo > 0.5 ? <MesCard color="#8A5A9E" label="Nuevo en el panel" value={eur(d.nuevo)} sub="No es dinero nuevo: es lo que empiezas a seguir" /> : null}
        {d.comisiones > 0 ? <MesCard color="#71717A" label="Comisiones" value={eurSigned(-d.comisiones, 2)} sub="Pagadas al comprar o vender" /> : null}
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <H2>Qué ha hecho cada producto</H2>
          <p className="text-[13px] text-muted">Al empezar el mes + lo que aportaste + el mercado = al cerrar</p>
        </div>
        {/* Móvil: una ficha por producto */}
        <ul className="flex flex-col divide-y divide-line md:hidden">
          {d.productos.map((p) => (
            <li key={p.holdingId} className="flex flex-col gap-1.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/activos/${p.holdingId}`} className="min-w-0 truncate font-semibold hover:underline">{nombres.get(p.holdingId) ?? 'Producto'}</Link>
                <span className="font-semibold tabular">{eur(p.fin)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                <span className="text-muted">Empezó en <span className="tabular text-ink">{eur(p.inicio)}</span></span>
                {Math.abs(p.aportado) > 0.5 ? <span className="text-muted">Aportaste <span className="font-semibold tabular text-ink">{eurSigned(p.aportado)}</span></span> : null}
                {Math.abs(p.traspaso) > 0.5 ? <span className="text-muted">Traspaso <span className="font-semibold tabular text-ink">{eurSigned(p.traspaso)}</span></span> : null}
                {Math.abs(p.nuevo) > 0.5 ? <span className="text-muted">Entra al panel <span className="font-semibold tabular text-ink">{eur(p.nuevo)}</span></span> : null}
                <span className="text-muted">Mercado <span className={`font-semibold tabular ${tone(p.mercado)}`}>{eurSigned(p.mercado)}</span></span>
              </div>
            </li>
          ))}
        </ul>
        {/* Escritorio: tabla */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium">Producto</th>
                <th className="py-2 text-right font-medium">Al empezar</th>
                <th className="py-2 text-right font-medium">Aportaste</th>
                {hayTraspaso ? <th className="py-2 text-right font-medium">Traspasos</th> : null}
                {hayNuevo ? <th className="py-2 text-right font-medium">Entra al panel</th> : null}
                <th className="py-2 text-right font-medium">Mercado</th>
                <th className="py-2 text-right font-medium">Al cerrar</th>
              </tr>
            </thead>
            <tbody>
              {d.productos.map((p) => (
                <tr key={p.holdingId} className="border-t border-line">
                  <td className="max-w-[280px] truncate py-2.5 pr-3"><Link href={`/activos/${p.holdingId}`} className="font-semibold hover:underline">{nombres.get(p.holdingId) ?? 'Producto'}</Link></td>
                  <td className="py-2.5 text-right tabular">{eur(p.inicio)}</td>
                  <td className="py-2.5 text-right tabular">{Math.abs(p.aportado) > 0.5 ? eurSigned(p.aportado) : '—'}</td>
                  {hayTraspaso ? <td className="py-2.5 text-right tabular">{Math.abs(p.traspaso) > 0.5 ? eurSigned(p.traspaso) : '—'}</td> : null}
                  {hayNuevo ? <td className="py-2.5 text-right tabular">{Math.abs(p.nuevo) > 0.5 ? eur(p.nuevo) : '—'}</td> : null}
                  <td className={`py-2.5 text-right font-semibold tabular ${tone(p.mercado)}`}>{eurSigned(p.mercado)}</td>
                  <td className="py-2.5 text-right font-semibold tabular">{eur(p.fin)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong font-semibold">
                <td className="py-2.5">Total</td>
                <td className="py-2.5 text-right tabular">{eur(d.inicio)}</td>
                <td className="py-2.5 text-right tabular">{eurSigned(d.aportado)}</td>
                {hayTraspaso ? <td className="py-2.5 text-right tabular">—</td> : null}
                {hayNuevo ? <td className="py-2.5 text-right tabular">{eur(d.nuevo)}</td> : null}
                <td className={`py-2.5 text-right tabular ${tone(d.mercado)}`}>{eurSigned(d.mercado)}</td>
                <td className="py-2.5 text-right tabular">{eur(d.fin)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {d.comisiones > 0 ? <p className="text-xs text-muted">Las comisiones ({eur(d.comisiones, 2)}) van dentro de «Aportaste»: no cuentan como pérdida del mercado.</p> : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <div>
          <H2>Tu esfuerzo y el del mercado, mes a mes</H2>
          <p className="text-[13px] text-muted">Lo que aportaste tú y, encima, lo que puso o quitó el mercado</p>
        </div>
        <MonthBars data={months.slice(-12)} />
        <div className="flex flex-wrap gap-5 text-[13px]">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#A7D7BF]" />Aportado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#14532D]" />Ganancia del mercado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#D9822B]" />Pérdida del mercado</span>
          {months.slice(-12).some((x) => x.comisiones > 0) ? <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#71717A]" />Comisiones</span> : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-1 overflow-x-auto">
        <H2>Todos los meses</H2>
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-2 font-medium">Mes</th>
              <th className="py-2 text-right font-medium">Aportado</th>
              {historialNuevo ? <th className="hidden py-2 text-right font-medium sm:table-cell">Entra al panel</th> : null}
              <th className="py-2 text-right font-medium">Mercado</th>
              <th className="py-2 text-right font-medium">Valor final</th>
            </tr>
          </thead>
          <tbody>
            {[...months].reverse().map((mm) => (
              <tr key={mm.mes} className={`border-t border-line ${mm.mes === actual ? 'bg-subtle' : ''}`}>
                <td className="py-2 capitalize"><Link href={hrefFor[mm.mes]!} className="font-semibold text-brand hover:underline">{mesLargo(mm.mes)}</Link></td>
                <td className="py-2 text-right tabular">{eurSigned(mm.aportado)}</td>
                {historialNuevo ? <td className="hidden py-2 text-right tabular sm:table-cell">{mm.nuevo > 0.5 ? eur(mm.nuevo) : '—'}</td> : null}
                <td className="py-2 text-right tabular">
                  <span className={`font-semibold ${mm.ganancia >= 0 ? 'text-pos' : 'text-neg'}`}>{eurSigned(mm.ganancia)}</span>
                  {mm.comisiones > 0 ? <span className="block text-xs whitespace-nowrap text-muted">com. {eurSigned(-mm.comisiones, 2)}</span> : null}
                </td>
                <td className="py-2 pl-3 text-right tabular">{eur(mm.valorFin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function MesCard({ color, label, value, sub, valueClass }: { color: string; label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="relative flex flex-col gap-1 overflow-hidden rounded-2xl border border-line bg-surface p-3.5 pl-4">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-[22px] font-bold tracking-tight tabular ${valueClass ?? ''}`}>{value}</span>
      <span className="text-xs leading-snug text-muted">{sub}</span>
    </div>
  );
}
