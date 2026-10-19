'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mesLargo } from '@/lib/format';

/** ‹ mes › para moverse entre meses (el mes va en la URL). */
export function MonthPicker({ months, value, hrefFor }: { months: string[]; value: string; hrefFor: Record<string, string> }) {
  const router = useRouter();
  const i = months.indexOf(value);
  const prev = i > 0 ? months[i - 1] : null;
  const next = i >= 0 && i < months.length - 1 ? months[i + 1] : null;
  const arrow = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-lg font-semibold';
  return (
    <div className="flex items-center gap-2">
      {prev ? <Link href={hrefFor[prev]!} className={arrow} aria-label="Mes anterior">‹</Link> : <span className={`${arrow} opacity-35`} aria-hidden="true">‹</span>}
      <select aria-label="Elegir mes" value={value} onChange={(e) => router.push(hrefFor[e.target.value]!)}
        className="h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-[15px] font-semibold capitalize sm:flex-none sm:px-4">
        {[...months].reverse().map((m) => <option key={m} value={m}>{mesLargo(m)}</option>)}
      </select>
      {next ? <Link href={hrefFor[next]!} className={arrow} aria-label="Mes siguiente">›</Link> : <span className={`${arrow} opacity-35`} aria-hidden="true">›</span>}
    </div>
  );
}
