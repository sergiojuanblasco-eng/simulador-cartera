'use client';

import { CLASE_LABEL, type AssetType } from '@kartera/core';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ProductPicker } from '@/components/product-picker';
import { Alert, Button, Card, CHART_COLORS, Field, Input, PageHeader, AmountInput } from '@/components/ui';
import type { AssetChoice } from '@/lib/asset-choice';
import { detectClase } from '@/lib/asset-class';
import { groupEs, numEs, parseEsNumber } from '@/lib/format';
import { guessProxy, PROXY_OPTIONS } from '@/lib/plan';
import { savePlan } from '../../plan-actions';

interface InRow {
  assetId: string; nombre: string; tipo: AssetType; isin: string | null;
  pctActual: number; pctObjetivo: number | null; proxy: string; proxyAprox: boolean; clase: string;
}

interface Row {
  key: string;
  assetId: string | null;
  asset: AssetChoice | null;
  nombre: string;
  pctActual: number;
  pct: string;
  proxy: string;
  proxyAprox: boolean;
  clase: string;
}

const fmt = (n: number) => numEs(Math.round(n * 100) / 100, 2);
const val = (s: string) => Math.max(0, parseEsNumber(s.replace('%', '')) ?? 0);

/** Reparte 100 en enteros en proporción a `w` (método del mayor resto). */
function to100(w: number[]): number[] {
  const t = w.reduce((a, b) => a + b, 0);
  if (t <= 0) return w.map(() => 0);
  const raw = w.map((x) => (x / t) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, r: r - Math.floor(r) })).filter((x) => w[x.i]! > 0).sort((a, b) => b.r - a.r);
  for (let k = 0; left > 0 && order.length; k = (k + 1) % order.length, left--) out[order[k]!.i]!++;
  // Lo que ya tienes no se queda en 0 % por redondear: mínimo 1 %, quitándolo del mayor.
  for (let i = 0; i < out.length; i++) {
    if (w[i]! > 0 && out[i] === 0) {
      const big = out.indexOf(Math.max(...out));
      if (out[big]! > 1) { out[big]!--; out[i] = 1; }
    }
  }
  return out;
}

export function PlanEditor(p: { portfolio: { id: string; nombre: string }; tienePlan: boolean; mensual: number | null; rows: InRow[]; next?: string | null }) {
  const router = useRouter();
  const hayActual = p.rows.some((r) => r.pctActual > 0);
  const [rows, setRows] = useState<Row[]>(() => {
    const base = p.rows.map((r) => ({
      key: r.assetId, assetId: r.assetId, asset: null, nombre: r.nombre, pctActual: r.pctActual, clase: r.clase,
      pct: r.pctObjetivo !== null ? fmt(r.pctObjetivo) : '0', proxy: r.proxy, proxyAprox: r.proxyAprox,
    }));
    if (p.tienePlan) return base;
    const start = to100(p.rows.map((r) => (hayActual ? r.pctActual : 1)));
    return base.map((r, i) => ({ ...r, pct: String(start[i]) }));
  });
  const [mensual, setMensual] = useState(p.mensual ? numEs(p.mensual, 2) : '');
  const [adding, setAdding] = useState(p.rows.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const total = rows.reduce((a, r) => a + val(r.pct), 0);
  const porClaseMap = new Map<string, number>();
  for (const r of rows) if (val(r.pct) > 0) porClaseMap.set(r.clase, (porClaseMap.get(r.clase) ?? 0) + val(r.pct));
  const porClase = [...porClaseMap.entries()].sort((a, b) => b[1] - a[1]);
  const ok = Math.abs(total - 100) < 0.05;
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const bump = (key: string, d: number) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, pct: fmt(Math.min(100, Math.max(0, val(r.pct) + d))) } : r)));
  const fill = (w: number[]) => { const v = to100(w); setRows((rs) => rs.map((r, i) => ({ ...r, pct: String(v[i]) }))); };
  const colorOf = (i: number) => CHART_COLORS[i % CHART_COLORS.length]!;

  function addProduct(c: AssetChoice | null) {
    if (!c) return;
    const id = c.kind === 'local' ? c.id : null;
    if (id && rows.some((r) => r.assetId === id)) { setAdding(false); return; }
    const tipo: AssetType = c.kind === 'local' ? 'fondo' : c.tipo;
    const isin = c.kind === 'external' ? c.isin : c.kind === 'manual' ? c.isin ?? null : null;
    const g = guessProxy({ nombre: c.nombre, tipo, isin });
    setRows((rs) => [...rs, { key: `n${Date.now()}`, assetId: id, asset: id ? null : c, nombre: c.nombre, pctActual: 0, pct: rs.length === 0 ? '100' : '0', proxy: g.id, proxyAprox: g.aproximado, clase: detectClase({ nombre: c.nombre, tipo, isin }) }]);
    setAdding(false);
  }

  function save() {
    setError(null);
    const m = mensual.trim() === '' ? null : parseEsNumber(mensual);
    if (mensual.trim() !== '' && (m === null || m < 0)) { setError('Escribe la aportación mensual como número, p. ej. 300.'); return; }
    start(async () => {
      const r = await savePlan(p.portfolio.id, {
        aportacionMensual: m,
        rows: rows.map((x) => ({ assetId: x.assetId, asset: x.asset, pct: val(x.pct), proxy: x.proxy })),
      });
      if (!r.ok) { setError(r.error ?? 'No se pudo guardar.'); return; }
      router.push(p.next ?? `/carteras/${p.portfolio.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 pb-24">
      <PageHeader back={`/carteras/${p.portfolio.id}`} title="Cartera objetivo" subtitle={`${p.portfolio.nombre}: qué % quieres en cada producto`} />

      <Card className="flex flex-col gap-3">
        <Field label="¿Cuánto vas a aportar cada mes?" htmlFor="mensual" hint="Lo usamos para decirte cuánto poner en cada producto y para la simulación.">
          <div className="relative">
            <AmountInput id="mensual" value={mensual} onValueChange={setMensual} placeholder="300" className="pr-10" />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">€</span>
          </div>
        </Field>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Empezar desde:</span>
          {hayActual ? <button type="button" onClick={() => fill(rows.map((r) => r.pctActual))} className="min-h-9 rounded-full border border-line-strong px-3 text-[13px] font-semibold">Como lo tengo hoy</button> : null}
          <button type="button" onClick={() => fill(rows.map(() => 1))} className="min-h-9 rounded-full border border-line-strong px-3 text-[13px] font-semibold">A partes iguales</button>
        </div>

        <div className="flex h-3 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
          {rows.map((r, i) => <div key={r.key} style={{ width: `${Math.min(100, val(r.pct))}%`, background: colorOf(i) }} />)}
        </div>

        {porClase.length ? (
          <p className="text-[13px] text-muted-2">{porClase.map(([c, v]) => `${CLASE_LABEL[c]} ${fmt(v)} %`).join(' · ')}</p>
        ) : null}
        {rows.length === 0 ? <p className="text-sm text-muted">Elige los productos en los que vas a invertir y qué % quieres en cada uno.</p> : null}
        <ul className="flex flex-col divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.key} className="flex flex-col gap-2 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ background: colorOf(i) }} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-sm font-semibold">{r.nombre}</span>
                  <span className="text-xs text-muted">{CLASE_LABEL[r.clase]}</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 pl-5">
                <span className="text-xs text-muted">{r.pctActual > 0 ? `Hoy: ${fmt(Math.round(r.pctActual * 1000) / 10)} %` : 'Aún no lo tienes'}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" aria-label={`Bajar ${r.nombre}`} onClick={() => bump(r.key, -5)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-lg">−</button>
                  <div className="relative w-[78px]">
                    <input aria-label={`% de ${r.nombre}`} inputMode="decimal" value={r.pct} onChange={(e) => set(r.key, { pct: e.target.value })}
                      className="h-10 w-full rounded-xl border border-line-strong bg-surface pr-7 pl-2 text-right font-semibold tabular outline-none focus:border-brand" />
                    <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted">%</span>
                  </div>
                  <button type="button" aria-label={`Subir ${r.nombre}`} onClick={() => bump(r.key, 5)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-lg">+</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-5 text-xs text-muted">
                <label className="flex items-center gap-1">
                  Se simula como
                  <select value={r.proxy} onChange={(e) => set(r.key, { proxy: e.target.value, proxyAprox: false })}
                    className={`max-w-[170px] rounded-md border bg-surface px-1.5 py-1 text-xs ${r.proxyAprox ? 'border-warn-line text-warn-ink' : 'border-line text-ink'}`}>
                    {PROXY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  {r.proxyAprox ? <span className="text-warn-ink">← revísalo</span> : null}
                </label>
                {!r.assetId || r.pctActual === 0 ? <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="font-semibold text-muted-2 underline">Quitar</button> : null}
              </div>
            </li>
          ))}
        </ul>

        {adding ? (
          <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <ProductPicker value={null} onChange={addProduct} label="¿Qué producto quieres añadir?" />
            <button type="button" onClick={() => setAdding(false)} className="self-start text-sm font-semibold text-muted-2">Cancelar</button>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="self-start">+ Añadir producto</Button>
        )}
        <p className="text-xs text-muted">Pon 0 % en un producto que ya no quieras seguir comprando: lo mantienes, pero no le aportas más.</p>
      </Card>

      {error ? <Alert>{error}</Alert> : null}

      <div className="sticky bottom-20 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)] lg:bottom-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`text-sm font-bold tabular ${ok ? 'text-brand' : 'text-warn-ink'}`}>
            {ok ? 'Total 100 % ✓' : total < 100 ? `Te falta repartir ${fmt(100 - total)} %` : `Te pasas ${fmt(total - 100)} %`}
          </span>
          {!ok && total > 0 ? <button type="button" onClick={() => fill(rows.map((r) => val(r.pct)))} className="self-start text-xs font-semibold text-brand">Ajustar a 100 % manteniendo proporciones</button> : null}
        </div>
        <Button type="button" disabled={!ok || pending} onClick={save}>{pending ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </div>
  );
}
