import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { groupEs } from '@/lib/format';

/** Componentes base del sistema visual (fondo claro, azul de marca, Space Grotesk en titulares). */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:opacity-60',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle disabled:opacity-60',
  ghost: 'bg-transparent text-brand hover:bg-brand-soft',
  danger: 'bg-surface text-neg border border-warn-line hover:bg-warn-bg',
};
const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors min-h-[48px] px-5 text-[15px]';

export function Button({ variant = 'primary', className, ...p }: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={cx(base, variants[variant], className)} {...p} />;
}

export function LinkButton({ variant = 'primary', className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(base, variants[variant], 'no-underline', className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<'section'>) {
  return <section className={cx('rounded-2xl border border-line bg-surface p-5', className)} {...p} />;
}

export function H1({ className, ...p }: ComponentProps<'h1'>) {
  return <h1 className={cx('font-display text-[32px] leading-[1.1]', className)} {...p} />;
}

export function H2({ className, ...p }: ComponentProps<'h2'>) {
  return <h2 className={cx('font-display text-[22px] leading-tight', className)} {...p} />;
}

export function Field({ label, htmlFor, hint, children, className }: { label: ReactNode; htmlFor: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
      {hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

const inputCls = 'h-12 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-muted/70';

export function Input({ className, ...p }: ComponentProps<'input'>) {
  return <input className={cx(inputCls, className)} {...p} />;
}

/**
 * Campo para importes y cantidades: al salir del campo pone el separador de miles
 * («6300» → «6.300»). Guarda texto; se lee con parseEsNumber.
 */
export function AmountInput({ value, onValueChange, onBlur, className, ...p }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <input inputMode="decimal" autoComplete="off" className={cx(inputCls, className)} value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onBlur={(e) => { const g = groupEs(e.target.value); if (g !== e.target.value) onValueChange(g); onBlur?.(e); }}
      {...p} />
  );
}

export function Select({ className, ...p }: ComponentProps<'select'>) {
  return <select className={cx(inputCls, 'pr-8', className)} {...p} />;
}

export function Alert({ tone = 'warn', children }: { tone?: 'warn' | 'info' | 'ok'; children: ReactNode }) {
  const t = {
    warn: 'bg-warn-bg border-warn-line text-warn-ink',
    info: 'bg-brand-soft border-brand-soft text-brand-dark',
    ok: 'bg-teal-soft border-teal-soft text-teal-ink',
  }[tone];
  return <div role={tone === 'warn' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-sm', t)}>{children}</div>;
}

export function BackLink({ href, label = 'Volver' }: { href: string; label?: string }) {
  return (
    <Link href={href} aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Link>
  );
}

export function PageHeader({ title, subtitle, back, action }: { title: ReactNode; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {back ? <BackLink href={back} /> : null}
        <div className="flex flex-col gap-1">
          <H1 className="text-[30px]">{title}</H1>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </header>
  );
}

export function Chip({ active, className, ...p }: ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        'min-h-10 rounded-full px-4 text-sm font-semibold transition-colors',
        active ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2 hover:bg-subtle',
        className,
      )}
      {...p}
    />
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5 rounded-xl bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx('h-9 flex-1 rounded-lg text-[13px] font-semibold', o.value === value ? 'bg-surface text-ink shadow-sm' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cx('h-1.5 flex-1 rounded-full', i < step ? 'bg-brand' : 'bg-line')} />
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'neg' | 'pos' | 'brand' }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={cx('text-[21px] font-bold tracking-tight tabular', tone === 'neg' && 'text-neg', tone === 'pos' && 'text-pos')}>{value}</span>
      {sub ? <span className={cx('text-xs', tone === 'brand' ? 'font-semibold text-brand' : 'text-muted')}>{sub}</span> : null}
    </div>
  );
}

export function Swatch({ color }: { color: string }) {
  return <span aria-hidden="true" className="inline-block h-3 w-3 shrink-0 rounded-[4px]" style={{ background: color }} />;
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="font-display text-[28px] leading-none text-ink">Kartera</span>
    </span>
  );
}


export const CHART_COLORS = ['#14532D', '#3E9A6F', '#4A7FB5', '#A7D7BF', '#D9822B', '#8A5A9E', '#71717A', '#C9C9C2'];
