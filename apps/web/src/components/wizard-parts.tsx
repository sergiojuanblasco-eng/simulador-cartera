'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BROKERS } from '@/lib/db';
import { eur } from '@/lib/format';
import type { WizardHolding } from '@/lib/wizard-data';
import { Chip, H1, LinkButton, Progress } from './ui';

export function WizardHeader({ label, step, total, onBack, closeHref = '/movimiento' }: {
  label: string; step: number; total: number; onBack?: () => void; closeHref?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Atrás" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : (
          <Link href={closeHref} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </Link>
        )}
        <span className="text-[13px] font-semibold text-muted">{label} · paso {step} de {total}</span>
      </div>
      <Progress step={step} total={total} />
    </div>
  );
}

export function StepTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <H1>{title}</H1>
      {sub ? <p className="text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

const DOT = ['#14532D', '#4A7FB5', '#3E9A6F', '#D9822B', '#A7D7BF', '#8A5A9E'];

export function PortfolioList({ portfolios, holdings, value, onChange }: {
  portfolios: { id: string; nombre: string }[]; holdings: WizardHolding[]; value: string | null; onChange: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {portfolios.map((p, i) => {
        const n = holdings.filter((h) => h.portfolioId === p.id && h.cantidad > 1e-9).length;
        const on = value === p.id;
        return (
          <li key={p.id}>
            <button type="button" aria-pressed={on} onClick={() => onChange(p.id)}
              className={`flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ${on ? 'border-2 border-brand' : 'border border-line'}`}>
              <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[4px]" style={{ background: DOT[i % DOT.length] }} />
              <span className="flex flex-1 flex-col"><span className="font-semibold">{p.nombre}</span><span className="text-[13px] text-muted">{n} {n === 1 ? 'producto' : 'productos'}</span></span>
              {on ? <Check /> : null}
            </button>
          </li>
        );
      })}
      <li><Link href="/carteras/nueva" className="block py-2 text-sm font-semibold text-brand">+ Crear otra cartera</Link></li>
    </ul>
  );
}

export function HoldingList({ holdings, value, onChange, empty }: {
  holdings: WizardHolding[]; value: string | null; onChange: (id: string) => void; empty?: ReactNode;
}) {
  if (holdings.length === 0) return <>{empty}</>;
  return (
    <ul className="flex flex-col gap-2">
      {holdings.map((h) => {
        const on = value === h.id;
        return (
          <li key={h.id}>
            <button type="button" aria-pressed={on} onClick={() => onChange(h.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-3 text-left ${on ? 'border-2 border-brand' : 'border border-line'}`}>
              <span className="flex min-w-0 flex-col"><span className="truncate text-[15px] font-semibold">{h.nombre}</span><span className="text-xs text-muted">{h.broker}</span></span>
              <span className="shrink-0 text-sm font-semibold tabular">{eur(h.valor)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function BrokerChips({ value, onChange }: { value: string; onChange: (b: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">¿Dónde lo tienes?</span>
      <div className="flex flex-wrap gap-2">
        {BROKERS.map((b) => <Chip key={b} active={value === b} onClick={() => onChange(b)}>{b}</Chip>)}
      </div>
    </div>
  );
}

export function Done({ title, text, onAgain }: { title: string; text: ReactNode; onAgain: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col gap-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32" fill="#E8F5EF" /><path d="M24 37 L32 45 L48 28" stroke="#16754E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <h1 className="font-display text-[26px] font-bold">{title}</h1>
        <p className="text-[15px] leading-relaxed text-muted">{text}</p>
      </div>
      <button type="button" onClick={onAgain} className="min-h-12 rounded-xl border border-line-strong bg-surface font-semibold">Registrar otro movimiento</button>
      <LinkButton href="/">Ir al inicio</LinkButton>
    </div>
  );
}

function Check() {
  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#16754E" /><path d="M7.5 12.5 L10.5 15.5 L16.5 9" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
