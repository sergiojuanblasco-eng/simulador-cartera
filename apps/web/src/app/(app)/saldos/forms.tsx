'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { eur, fechaCorta, parseEsNumber } from '@/lib/format';
import { SALDO_KINDS, type SaldoKind } from '@/lib/saldos';
import { createManualProduct, deleteManualProduct, deleteValuation, saveValuations } from './actions';

const fmt = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));

export interface SaldoRow {
  holdingId: string;
  nombre: string;
  detalle: string;
  /** Último valor anotado. */
  valor: number;
  /** Último aportado anotado (null si no se sabe). */
  aportado: number | null;
  fecha: string | null;
  pideAportado: boolean;
}

/** «Anotar todos de una vez»: una fecha y el valor de cada cuenta, plan o depósito. */
export function SaldosForm({ rows, today }: { rows: SaldoRow[]; today: string }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(today);
  const [vals, setVals] = useState<Record<string, { valor: string; aportado: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const get = (id: string) => vals[id] ?? { valor: '', aportado: '' };
  const set = (id: string, patch: Partial<{ valor: string; aportado: string }>) => setVals((v) => ({ ...v, [id]: { ...get(id), ...patch } }));
  const filled = rows.filter((r) => get(r.holdingId).valor.trim() !== '');

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        const items: { holdingId: string; valor: number; aportado: number | null }[] = [];
        for (const r of filled) {
          const f = get(r.holdingId);
          const valor = parseEsNumber(f.valor.replace('€', ''));
          if (valor === null || valor < 0) { setError(`Revisa el valor de «${r.nombre}».`); return; }
          const aportado = r.pideAportado && f.aportado.trim() ? parseEsNumber(f.aportado.replace('€', '')) : null;
          if (r.pideAportado && f.aportado.trim() && (aportado === null || aportado < 0)) { setError(`Revisa lo aportado en «${r.nombre}».`); return; }
          // Si no cambias lo aportado, se mantiene el de la última vez
          items.push({ holdingId: r.holdingId, valor, aportado: r.pideAportado ? aportado ?? r.aportado : null });
        }
        start(async () => {
          const res = await saveValuations({ fecha, items });
          if (!res.ok) { setError(res.error ?? 'No se pudo guardar.'); return; }
          setVals({});
          setOk(`${res.data?.guardados === 1 ? 'Guardado 1 valor' : `Guardados ${res.data?.guardados} valores`} a ${fechaCorta(fecha)}.`);
          router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="¿A qué fecha?" htmlFor="sf-fecha" className="w-44">
          <Input id="sf-fecha" type="date" value={fecha} max={today} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
        <button type="button" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
          onClick={() => setVals(Object.fromEntries(rows.map((r) => [r.holdingId, {
            valor: get(r.holdingId).valor || fmt(r.valor),
            aportado: get(r.holdingId).aportado || (r.pideAportado ? fmt(r.aportado) : ''),
          }])))}>
          Rellenar con los últimos valores
        </button>
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {rows.map((r) => {
          const f = get(r.holdingId);
          return (
            <li key={r.holdingId} className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link href={`/activos/${r.holdingId}`} className="truncate font-semibold hover:underline">{r.nombre}</Link>
                <span className="text-[13px] text-muted">{r.detalle}</span>
                <span className="text-[13px] text-muted">
                  {r.fecha ? <>Última vez: <span className="font-semibold text-ink tabular">{eur(r.valor, 2)}</span> el {fechaCorta(r.fecha)}</> : 'Sin valores todavía'}
                  {r.pideAportado && r.aportado !== null ? <> · aportado {eur(r.aportado)}</> : null}
                </span>
              </div>
              <div className={`grid gap-2 ${r.pideAportado ? 'grid-cols-2 sm:w-[300px]' : 'grid-cols-1 sm:w-[146px]'}`}>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-2">{r.pideAportado ? 'Valor hoy (€)' : 'Saldo hoy (€)'}</span>
                  <Input inputMode="decimal" value={f.valor} onChange={(e) => set(r.holdingId, { valor: e.target.value })}
                    placeholder={fmt(r.valor)} className="h-11 text-right tabular" aria-label={`Valor de ${r.nombre}`} />
                </label>
                {r.pideAportado ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-2">Aportado total (€)</span>
                    <Input inputMode="decimal" value={f.aportado} onChange={(e) => set(r.holdingId, { aportado: e.target.value })}
                      placeholder={r.aportado === null ? 'Opcional' : fmt(r.aportado)} className="h-11 text-right tabular" aria-label={`Aportado en ${r.nombre}`} />
                  </label>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {error ? <Alert>{error}</Alert> : null}
      {ok ? <Alert tone="ok">{ok}</Alert> : null}
      <Button type="submit" disabled={pending || filled.length === 0} className="sm:self-start">
        {pending ? 'Guardando…' : filled.length === 0 ? 'Escribe algún valor' : `Guardar ${filled.length} ${filled.length === 1 ? 'valor' : 'valores'}`}
      </Button>
      <p className="text-[13px] text-muted">Deja vacío lo que no haya cambiado. Si no tocas lo aportado, se mantiene el de la última vez.</p>
    </form>
  );
}

/** Alta de una cuenta, plan de pensiones, depósito u otro producto sin precio en internet. */
export function NewSaldoForm({ portfolios, entidades, today, initialKind }: {
  portfolios: { id: string; nombre: string; objetivo: string }[];
  entidades: string[];
  today: string;
  initialKind: SaldoKind | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<SaldoKind | null>(initialKind);
  const k = SALDO_KINDS.find((x) => x.kind === kind) ?? null;
  const sugerida = useMemo(() => {
    if (!k) return portfolios[0]?.id ?? '';
    for (const g of k.carteras) {
      const p = portfolios.find((x) => x.objetivo === g);
      if (p) return p.id;
    }
    return portfolios[0]?.id ?? '';
  }, [k, portfolios]);
  const [cartera, setCartera] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [entidad, setEntidad] = useState('');
  const [fecha, setFecha] = useState(today);
  const [valor, setValor] = useState('');
  const [aportado, setAportado] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2 text-sm font-semibold">¿Qué quieres añadir?</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SALDO_KINDS.map((o) => (
            <button key={o.kind} type="button" aria-pressed={kind === o.kind} onClick={() => setKind(o.kind)}
              className={`flex min-h-[72px] flex-col items-start justify-center gap-0.5 rounded-2xl border-2 px-4 py-3 text-left ${kind === o.kind ? 'border-brand bg-brand-soft' : 'border-line bg-surface hover:border-line-strong'}`}>
              <span className="font-semibold">{o.label}</span>
              <span className="text-[13px] leading-snug text-muted">{o.sub}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {k ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const v = parseEsNumber(valor.replace('€', ''));
            if (v === null || v < 0) { setError(k.kind === 'cuenta' ? 'Escribe el saldo de la cuenta.' : 'Escribe cuánto vale hoy.'); return; }
            const a = k.pideAportado && aportado.trim() ? parseEsNumber(aportado.replace('€', '')) : null;
            if (k.pideAportado && aportado.trim() && (a === null || a < 0)) { setError('Revisa lo aportado.'); return; }
            start(async () => {
              const r = await createManualProduct({ kind: k.kind, nombre, entidad, portfolioId: cartera ?? sugerida, fecha, valor: v, aportado: a });
              if (!r.ok) { setError(r.error ?? 'No se pudo guardar.'); return; }
              router.push(`/saldos?nuevo=${encodeURIComponent(nombre.trim())}`);
            });
          }}
        >
          <Field label="Nombre" htmlFor="ns-nombre">
            <Input id="ns-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={k.ejemplo} maxLength={200} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Banco o entidad" htmlFor="ns-entidad">
              <Input id="ns-entidad" list="ns-entidades" value={entidad} onChange={(e) => setEntidad(e.target.value)} placeholder="BBVA, ING, MyInvestor…" maxLength={60} />
              <datalist id="ns-entidades">{entidades.map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
            <Field label="¿En qué cartera va?" htmlFor="ns-cartera">
              <Select id="ns-cartera" value={cartera ?? sugerida} onChange={(e) => setCartera(e.target.value)}>
                {portfolios.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={k.kind === 'cuenta' ? 'Saldo (€)' : 'Valor hoy (€)'} htmlFor="ns-valor">
              <Input id="ns-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="tabular" required />
            </Field>
            {k.pideAportado ? (
              <Field label="Aportado en total (€)" htmlFor="ns-aportado" hint="Opcional. Con él calculamos lo que has ganado.">
                <Input id="ns-aportado" inputMode="decimal" value={aportado} onChange={(e) => setAportado(e.target.value)} placeholder="Si lo sabes" className="tabular" />
              </Field>
            ) : null}
            <Field label="Fecha" htmlFor="ns-fecha">
              <Input id="ns-fecha" type="date" value={fecha} max={today} onChange={(e) => setFecha(e.target.value)} required />
            </Field>
          </div>
          {k.kind === 'cuenta' ? (
            <p className="text-[13px] text-muted">Una cuenta no «rinde»: cada vez que anotes el saldo, la diferencia cuenta como dinero que metes o sacas.</p>
          ) : null}
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : `Añadir ${k.label.toLowerCase()}`}</Button>
        </form>
      ) : null}
    </div>
  );
}

/** Anotar un valor nuevo desde la ficha del producto. */
export function ValuationQuickForm({ holdingId, today, pideAportado: pide, ultimo }: {
  holdingId: string;
  today: string;
  pideAportado: boolean;
  ultimo: { valor: number; aportado: number | null } | null;
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(today);
  const [valor, setValor] = useState('');
  const [aportado, setAportado] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setOk(null);
        const v = parseEsNumber(valor.replace('€', ''));
        if (v === null || v < 0) { setError('Escribe el valor.'); return; }
        const a = pide && aportado.trim() ? parseEsNumber(aportado.replace('€', '')) : null;
        if (pide && aportado.trim() && (a === null || a < 0)) { setError('Revisa lo aportado.'); return; }
        start(async () => {
          const r = await saveValuations({ fecha, items: [{ holdingId, valor: v, aportado: pide ? a ?? ultimo?.aportado ?? null : null }] });
          if (!r.ok) { setError(r.error ?? 'No se pudo guardar.'); return; }
          setValor('');
          setAportado('');
          setOk('Guardado.');
          router.refresh();
        });
      }}
    >
      <div className={`grid gap-3 ${pide ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Field label={pide ? 'Valor (€)' : 'Saldo (€)'} htmlFor="vq-valor">
          <Input id="vq-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={ultimo ? fmt(ultimo.valor) : '0,00'} className="tabular" required />
        </Field>
        {pide ? (
          <Field label="Aportado en total (€)" htmlFor="vq-aportado">
            <Input id="vq-aportado" inputMode="decimal" value={aportado} onChange={(e) => setAportado(e.target.value)} placeholder={ultimo?.aportado != null ? fmt(ultimo.aportado) : 'Opcional'} className="tabular" />
          </Field>
        ) : null}
        <Field label="Fecha" htmlFor="vq-fecha">
          <Input id="vq-fecha" type="date" value={fecha} max={today} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {ok ? <Alert tone="ok">{ok}</Alert> : null}
      <Button type="submit" disabled={pending} className="sm:self-start">{pending ? 'Guardando…' : 'Anotar'}</Button>
    </form>
  );
}

export function DeleteValuationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label="Borrar este valor"
      onClick={() => {
        if (!confirm('¿Borrar este valor?')) return;
        start(async () => {
          const r = await deleteValuation(id);
          if (r.ok) router.refresh();
          else alert(r.error ?? 'No se pudo borrar.');
        });
      }}
      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-warn-bg hover:text-neg disabled:opacity-50">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7 H19 M10 11 V17 M14 11 V17 M7 7 L8 19 H16 L17 7 M9 7 V4 H15 V7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function DeleteManualProductButton({ holdingId, nombre }: { holdingId: string; nombre: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="danger" disabled={pending} className="self-start"
        onClick={() => {
          if (!confirm(`¿Borrar «${nombre}» y todos sus valores? No se puede deshacer.`)) return;
          start(async () => {
            const r = await deleteManualProduct(holdingId);
            if (!r.ok) { setError(r.error ?? 'No se pudo borrar.'); return; }
            router.push('/saldos');
          });
        }}>
        {pending ? 'Borrando…' : 'Borrar este producto'}
      </Button>
      {error ? <Alert>{error}</Alert> : null}
    </div>
  );
}
