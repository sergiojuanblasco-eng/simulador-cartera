'use client';

import { splitContribution, type SplitMode } from '@kartera/core';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { Alert, Button, Card, Field, Input, LinkButton, PageHeader, Segmented } from '@/components/ui';
import { BROKERS } from '@/lib/db';
import { eur, parseEsNumber, pct } from '@/lib/format';
import { investPlan } from '../../plan-actions';

interface Slot { assetId: string; nombre: string; pct: number; actual: number; nuevo: boolean }

export function InvestPlan(p: { portfolio: { id: string; nombre: string }; mensual: number; today: string; broker: string; slots: Slot[] }) {
  const [importe, setImporte] = useState(p.mensual ? String(p.mensual) : '');
  const [mode, setMode] = useState<SplitMode>('equilibrar');
  const [registrar, setRegistrar] = useState(false);
  const [fecha, setFecha] = useState(p.today);
  const [comision, setComision] = useState('0');
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
  const hayNuevos = conDinero.some((l) => p.slots.find((s) => s.assetId === l.key)?.nuevo);

  if (done) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3.5 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32" fill="#E8F5EF" /><path d="M24 37 L32 45 L48 28" stroke="#16754E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <h1 className="font-display text-[26px]">{done.registradas} {done.registradas === 1 ? 'compra registrada' : 'compras registradas'}</h1>
        {done.sinPrecio.length ? <Alert>Sin precio para: {done.sinPrecio.join(', ')}. Regístralas desde «Nuevo movimiento» indicando las participaciones.</Alert> : null}
        <p className="text-sm text-muted">Si luego importas el extracto del bróker, reconocemos estas compras y no se duplican.</p>
        <LinkButton href={`/carteras/${p.portfolio.id}`}>Ver mi cartera</LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageHeader back={`/carteras/${p.portfolio.id}`} title="¿Cuánto pongo en cada uno?" subtitle={p.portfolio.nombre} />

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
          {conDinero.length > 3 ? <p className="text-xs text-muted">Consejo: si tu bróker cobra por orden, un plan de inversión automático suele ser gratis.</p> : null}
        </Card>
      ) : null}

      {amount > 0 && !registrar ? (
        <Button type="button" onClick={() => setRegistrar(true)}>Ya lo he invertido: registrarlo</Button>
      ) : null}

      {registrar ? (
        <Card className="flex flex-col gap-3">
          <span className="text-sm font-semibold">Registrar {conDinero.length} {conDinero.length === 1 ? 'compra' : 'compras'}</span>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" htmlFor="fecha"><Input id="fecha" type="date" value={fecha} max={p.today} onChange={(e) => setFecha(e.target.value)} /></Field>
            <Field label="Comisión por compra (€)" htmlFor="com" hint="0 € con plan de inversión"><Input id="com" inputMode="decimal" value={comision} onChange={(e) => setComision(e.target.value)} /></Field>
          </div>
          {hayNuevos ? (
            <Field label="Bróker de los productos nuevos" htmlFor="broker">
              <select id="broker" value={broker} onChange={(e) => setBroker(e.target.value)} className="h-12 rounded-xl border border-line-strong bg-surface px-3">
                {[...new Set([broker, ...BROKERS])].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
          ) : null}
          <p className="text-xs text-muted">Usamos el último precio conocido de cada producto para calcular las participaciones.</p>
          {error ? <Alert>{error}</Alert> : null}
          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={() => start(async () => {
              setError(null);
              const r = await investPlan(p.portfolio.id, {
                fecha, broker, comisionPorOrden: parseEsNumber(comision) ?? 0,
                lines: conDinero.map((l) => ({ assetId: l.key, importe: l.importe })),
              });
              if (!r.ok || !r.data) { setError(r.error ?? 'No se pudo guardar.'); return; }
              setDone(r.data);
            })}>{pending ? 'Guardando…' : 'Registrar compras'}</Button>
            <Button type="button" variant="secondary" onClick={() => setRegistrar(false)}>Cancelar</Button>
          </div>
        </Card>
      ) : null}

      <Link href={`/carteras/${p.portfolio.id}/objetivo`} className="self-center py-2 text-sm font-semibold text-muted-2">Cambiar mi cartera objetivo</Link>
    </div>
  );
}
