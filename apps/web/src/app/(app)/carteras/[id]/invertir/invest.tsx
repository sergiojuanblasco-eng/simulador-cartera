'use client';

import { splitContribution, type SplitMode } from '@kartera/core';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Alert, Button, Card, Field, Input, LinkButton, PageHeader, Segmented } from '@/components/ui';
import { BROKERS } from '@/lib/db';
import { eur, parseEsNumber, pct } from '@/lib/format';
import { investPlan } from '../../plan-actions';

interface Slot { assetId: string; nombre: string; pct: number; actual: number; nuevo: boolean; sinPrecio: boolean; anotado?: boolean }

export function InvestPlan(p: {
  portfolio: { id: string; nombre: string }; importe: number; primera: boolean;
  today: string; broker: string; slots: Slot[];
}) {
  const [importe, setImporte] = useState(p.importe ? String(p.importe) : '');
  const [compras, setCompras] = useState<Record<string, { importe: string; cantidad: string; comision: string }>>({});
  const [mode, setMode] = useState<SplitMode>('equilibrar');
  const [registrar, setRegistrar] = useState(false);
  const [fecha, setFecha] = useState(p.today);
  const [broker, setBroker] = useState(p.broker);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ registradas: number; sinPrecio: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const amount = parseEsNumber(importe) ?? 0;
  const lines = useMemo(
    () => splitContribution(amount, p.slots.map((s) => ({ key: s.assetId, peso: s.pct, actual: s.actual })), mode),
    [amount, mode, p.slots],
  );
  const name = (k: string) => p.slots.find((s) => s.assetId === k)!.nombre;
  const fmtImp = (n: number) => eur(n, n % 1 ? 2 : 0);
  const conDinero = lines.filter((l) => l.importe > 0);
  const fila = (k: string) => compras[k] ?? { importe: '', cantidad: '', comision: '' };
  const setFila = (k: string, patch: Partial<{ importe: string; cantidad: string; comision: string }>) => setCompras({ ...compras, [k]: { ...fila(k), ...patch } });
  const compradas = p.slots
    .map((s) => ({ s, imp: parseEsNumber(fila(s.assetId).importe) ?? 0 }))
    .filter((x) => x.imp > 0);
  const totalComprado = compradas.reduce((a, x) => a + x.imp, 0);
  const hayNuevos = compradas.some((x) => x.s.nuevo);
  const faltanCantidades = compradas.filter((x) => x.s.sinPrecio && !(parseEsNumber(fila(x.s.assetId).cantidad) ?? 0));
  const usarSugerencia = () => {
    const next: typeof compras = {};
    for (const l of lines) next[l.key] = { ...fila(l.key), importe: l.importe > 0 ? String(l.importe).replace('.', ',') : '' };
    setCompras(next);
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3.5 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32" fill="#E8F5EF" /><path d="M24 37 L32 45 L48 28" stroke="#16754E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <h1 className="font-display text-[26px]">{done.registradas} {done.registradas === 1 ? 'compra registrada' : 'compras registradas'}</h1>
        {done.sinPrecio.length ? <Alert>No se registraron (sin precio ni participaciones): {done.sinPrecio.join(', ')}.</Alert> : null}
        <p className="text-sm text-muted">Si luego importas el extracto del bróker, reconocemos estas compras y no se duplican.</p>
        <LinkButton href={`/carteras/${p.portfolio.id}`}>Ver mi cartera</LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageHeader back={`/carteras/${p.portfolio.id}`} title={p.primera ? 'Tu primera aportación' : '¿Cuánto pongo en cada uno?'}
        subtitle={p.portfolio.nombre} />

      <Card className="flex flex-col gap-4">
        <Field label="¿Cuánto vas a invertir ahora?" htmlFor="importe">
          <div className="relative">
            <Input id="importe" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="300" className="pr-10 text-lg font-semibold" />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted">€</span>
          </div>
        </Field>
        <div className="flex flex-col gap-1.5">
          <Segmented label="Cómo repartir" value={mode} onChange={setMode}
            options={[{ value: 'equilibrar', label: 'Equilibrar' }, { value: 'fijo', label: 'Según mis %' }]} />
          <p className="text-[13px] text-muted">
            {mode === 'equilibrar'
              ? 'Pone más dinero en lo que se ha quedado por debajo de tu objetivo. Así vuelves a tu reparto sin vender nada.'
              : 'Siempre el mismo % en cada producto, como un plan de inversión automático.'}
          </p>
        </div>
      </Card>

      {amount > 0 ? (
        <Card className="flex flex-col gap-1">
          <ul className="flex flex-col divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{name(l.key)}</span>
                  <span className="text-xs text-muted">{pct(l.pesoActual, 0)} → {pct(l.pesoDespues, 0)} · objetivo {pct(l.pesoObjetivo, 0)}</span>
                </div>
                <span className={`shrink-0 text-lg font-bold tabular ${l.importe === 0 ? 'text-muted' : ''}`}>{l.importe === 0 ? '0 €' : fmtImp(l.importe)}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="self-start py-2 text-sm font-semibold text-brand" onClick={async () => {
            const txt = conDinero.map((l) => `${name(l.key)}: ${fmtImp(l.importe)}`).join('\n');
            try { await navigator.clipboard.writeText(txt); setCopied(true); } catch { setCopied(false); }
          }}>{copied ? '¡Copiado!' : 'Copiar el reparto'}</button>
          <p className="text-xs text-muted">Es una sugerencia: redondea como te convenga (por ejemplo, para pagar menos comisiones) y luego registra lo que compraste.</p>
        </Card>
      ) : null}

      {!registrar ? (
        <Button type="button" onClick={() => setRegistrar(true)}>Registrar lo que he comprado</Button>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[17px] font-semibold">¿Qué has comprado?</span>
            <span className="text-[13px] text-muted">Escribe lo que compraste de verdad en cada producto (puedes redondear o saltarte alguno). Deja vacío lo que no hayas comprado.</span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Fecha de compra" htmlFor="fecha" className="w-44"><Input id="fecha" type="date" value={fecha} max={p.today} onChange={(e) => setFecha(e.target.value)} /></Field>
            {amount > 0 ? <button type="button" onClick={usarSugerencia} className="min-h-11 text-sm font-semibold text-brand">Rellenar con la sugerencia</button> : null}
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {p.slots.map((s) => {
              const f = fila(s.assetId);
              return (
                <li key={s.assetId} className="flex flex-col gap-2 py-3">
                  <span className="text-sm font-semibold">{s.nombre}</span>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Importe (€)
                      <Input inputMode="decimal" value={f.importe} onChange={(e) => setFila(s.assetId, { importe: e.target.value })} placeholder="0" className="h-11 text-right font-semibold tabular" aria-label={`Importe comprado de ${s.nombre}`} />
                    </label>
                    {s.anotado ? (
                      <span className="flex items-end pb-3 text-xs leading-snug text-muted">Se suma a su último valor</span>
                    ) : (
                      <label className="flex flex-col gap-1 text-xs text-muted">
                        {s.sinPrecio ? 'Participaciones *' : 'Participaciones'}
                        <Input inputMode="decimal" value={f.cantidad} onChange={(e) => setFila(s.assetId, { cantidad: e.target.value })} placeholder={s.sinPrecio ? 'Obligatorio' : 'Opcional'} className="h-11 text-right tabular" aria-label={`Participaciones de ${s.nombre}`} />
                      </label>
                    )}
                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Comisión (€)
                      <Input inputMode="decimal" value={f.comision} onChange={(e) => setFila(s.assetId, { comision: e.target.value })} placeholder="0" className="h-11 text-right tabular" aria-label={`Comisión de ${s.nombre}`} />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted">
            Las participaciones las ves en tu bróker. Si las dejas vacías, las calculamos con el último precio conocido.
            {p.slots.some((s) => s.sinPrecio) ? ' (*) De este producto aún no tenemos precio: hacen falta.' : ''}
          </p>
          {hayNuevos ? (
            <Field label="Bróker de los productos nuevos" htmlFor="broker">
              <select id="broker" value={broker} onChange={(e) => setBroker(e.target.value)} className="h-12 rounded-xl border border-line-strong bg-surface px-3">
                {[...new Set([broker, ...BROKERS])].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
          ) : null}
          {error ? <Alert>{error}</Alert> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" disabled={pending || compradas.length === 0 || faltanCantidades.length > 0} onClick={() => start(async () => {
              setError(null);
              const r = await investPlan(p.portfolio.id, {
                fecha, broker, comisionPorOrden: 0,
                lines: compradas.map((x) => ({
                  assetId: x.s.assetId, importe: x.imp,
                  cantidad: parseEsNumber(fila(x.s.assetId).cantidad),
                  comision: parseEsNumber(fila(x.s.assetId).comision) ?? 0,
                })),
              });
              if (!r.ok || !r.data) { setError(r.error ?? 'No se pudo guardar.'); return; }
              setDone(r.data);
            })}>
              {pending ? 'Guardando…' : compradas.length ? `Registrar ${compradas.length} ${compradas.length === 1 ? 'compra' : 'compras'} · ${fmtImp(totalComprado)}` : 'Registrar compras'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setRegistrar(false)}>Cancelar</Button>
          </div>
          {faltanCantidades.length ? <span className="text-xs text-warn-ink">Indica las participaciones de: {faltanCantidades.map((x) => x.s.nombre).join(', ')}.</span> : null}
          <Link href={`/movimiento/aportacion?cartera=${p.portfolio.id}`} className="text-sm font-semibold text-muted-2">¿Has comprado otro producto que no está aquí? Regístralo aparte →</Link>
        </Card>
      )}

      <Link href={`/carteras/${p.portfolio.id}/objetivo`} className="self-center py-2 text-sm font-semibold text-muted-2">Cambiar mi cartera objetivo</Link>
    </div>
  );
}
