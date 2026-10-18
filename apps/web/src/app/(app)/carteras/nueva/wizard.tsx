'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, Button, Chip, Field, H1, Input, Progress } from '@/components/ui';
import { GOAL_PRESETS, type PortfolioGoal } from '@/lib/db';
import { parseEsNumber } from '@/lib/format';
import { createPortfolio } from '../../actions';

export function NewPortfolioWizard({ primera, existentes }: { primera: boolean; existentes: string[] }) {
  const router = useRouter();
  const libres = GOAL_PRESETS.filter((g) => !existentes.includes(g.nombre));
  const [preset, setPreset] = useState<PortfolioGoal | null>(libres[0]?.objetivo ?? null);
  const [custom, setCustom] = useState('');
  const [importe, setImporte] = useState('');
  const [anio, setAnio] = useState('');
  const [created, setCreated] = useState<{ id: string; nombre: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const nombre = custom.trim() || GOAL_PRESETS.find((g) => g.objetivo === preset)?.nombre || '';

  if (created) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <span className="text-[13px] font-semibold text-muted">Nueva cartera · paso 2 de 2</span>
        <Progress step={2} total={2} />
        <div className="flex flex-col gap-1.5">
          <H1>¿Cómo quieres empezar?</H1>
          <p className="text-sm text-muted">Cartera <strong className="text-ink">{created.nombre}</strong> creada. Ahora añade lo que ya tienes.</p>
        </div>
        <Link href={`/importar?cartera=${created.id}`} className="flex gap-3.5 rounded-2xl border-2 border-brand bg-surface p-[18px]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15 V4 M7 9 L12 4 L17 9" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15 V19 H20 V15" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2"><span className="text-[17px] font-bold">Importar movimientos</span><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-dark">RECOMENDADO</span></span>
            <span className="text-sm leading-snug text-muted-2">Si ya inviertes en MyInvestor, Trade Republic u otro bróker. Traemos todo tu histórico de golpe.</span>
          </span>
        </Link>
        <Link href={`/movimiento/aportacion?cartera=${created.id}`} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-[18px]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-subtle">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" stroke="#3F3F3A" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </span>
          <span className="flex flex-col gap-1"><span className="text-[17px] font-bold">Añadir a mano</span><span className="text-sm text-muted-2">Elige el producto y registra tu primera aportación.</span></span>
        </Link>
        <Link href={`/carteras/${created.id}/objetivo`} className="self-center py-2 text-[15px] font-semibold text-brand">Definir primero mi cartera objetivo</Link>
        <Link href="/" className="self-center py-3 text-[15px] font-semibold text-brand">Dejarla vacía por ahora</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex items-center justify-between">
        {primera ? <span /> : <Link href="/movimiento" className="py-2 text-sm font-semibold text-brand">Cancelar</Link>}
        <span className="text-[13px] font-semibold text-muted">Nueva cartera · paso 1 de 2</span>
      </div>
      <Progress step={1} total={2} />
      <div className="flex flex-col gap-1.5">
        <H1>{primera ? 'Crea tu primera cartera' : 'Nueva cartera'}</H1>
        <p className="text-sm leading-relaxed text-muted">Una cartera agrupa el dinero que tiene el mismo objetivo y plazo. Podrás crear más cuando quieras.</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">¿Para qué es este dinero?</span>
        <div className="flex flex-wrap gap-2">
          {GOAL_PRESETS.map((g) => (
            <Chip key={g.objetivo} active={!custom && preset === g.objetivo} disabled={existentes.includes(g.nombre)}
              className="disabled:opacity-40" onClick={() => { setPreset(g.objetivo); setCustom(''); }}>{g.nombre}</Chip>
          ))}
        </div>
      </div>
      <Field label="O ponle tu propio nombre" htmlFor="custom">
        <Input id="custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ej.: Entrada piso, Boda…" maxLength={60} />
      </Field>
      <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
        <span className="text-sm font-semibold">Objetivo <span className="font-normal text-muted">(opcional)</span></span>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Importe meta (€)" htmlFor="obj"><Input id="obj" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="100.000" /></Field>
          <Field label="Para el año" htmlFor="plazo"><Input id="plazo" inputMode="numeric" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2040" /></Field>
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="button" disabled={pending || !nombre} onClick={() => start(async () => {
        const r = await createPortfolio({
          nombre,
          objetivo: custom.trim() ? 'personalizado' : preset ?? 'personalizado',
          objetivoImporte: parseEsNumber(importe),
          objetivoAnio: parseEsNumber(anio),
        });
        if (r.ok && r.data) { setCreated(r.data); router.refresh(); } else setError(r.error ?? 'Error');
      })}>{pending ? 'Creando…' : 'Crear cartera'}</Button>
    </div>
  );
}
