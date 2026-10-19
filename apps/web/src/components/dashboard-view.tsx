import Link from 'next/link';
import type { Metrics, Milestones } from '@kartera/core';
import { DashboardCharts, DistributionCard } from '@/components/dashboard';
import { InstallApp } from '@/components/install-app';
import { Card, H2, LinkButton, Stat } from '@/components/ui';
import { eur, eurSigned, fechaCorta, mesLargo, pct, pctSigned } from '@/lib/format';
import type { DistributionSets, StackSeries } from '@/lib/view-models';
import type { PlanSimulation } from '@/lib/plan';

export interface GoalView {
  id: string;
  nombre: string;
  valor: number;
  objetivo: number;
  anio: number | null;
  eta: string | null;
}

export interface DashboardViewProps {
  nombre: string;
  today: string;
  carteras: { id: string; nombre: string }[];
  selected: string | null;
  metrics: Metrics;
  value: { fecha: string; valor: number; aportado: number }[];
  byProduct: StackSeries;
  byClass: StackSeries;
  dists: DistributionSets;
  goals: GoalView[];
  warnings: string[];
  baseHref?: string;
  /** Última actualización de precios (texto ya formateado). */
  actualizado?: string | null;
  /** Tarjeta «Tu cartera objetivo» (se pinta en el servidor; va al final). */
  objetivo?: React.ReactNode;
  /** Cifras redondas superadas y la siguiente. */
  hitos?: Milestones;
  /** Cuentas, planes y depósitos anotados a mano: recordatorio si este mes aún no se han anotado. */
  saldos?: { total: number; pendientes: number } | null;
  /** Simulación resumida con datos históricos (la cartera elegida o todo junto). */
  simulacion?: SimResumenProps | null;
}

export interface SimResumenProps {
  sim: PlanSimulation;
  initial: number;
  monthly: number;
  goal: number | null;
  conPlan: boolean;
  anio: number;
  /** true = todas las carteras juntas. */
  todo: boolean;
  href: string;
}

function saludo(): string {
  const h = Number(new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(new Date()));
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function Bar({ ratio, label, onDark = false, big = false }: { ratio: number; label: string; onDark?: boolean; big?: boolean }) {
  const r = Math.max(0, Math.min(1, ratio));
  return (
    <div className={`${big ? 'h-3.5' : 'h-2.5'} w-full overflow-hidden rounded-full ${onDark ? 'bg-white/12' : 'bg-subtle'}`}
      role="progressbar" aria-valuenow={Math.round(r * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`h-full rounded-full ${onDark ? 'bg-gradient-to-r from-[#3E9A6F] to-[#7FD1A8]' : 'bg-brand'}`} style={{ width: `${Math.max(r * 100, r > 0 ? 2 : 0)}%` }} />
    </div>
  );
}

const etaText = (g: GoalView) =>
  g.eta === 'conseguido' ? '¡Objetivo conseguido!' : g.eta ? `A este ritmo, en ${mesLargo(g.eta)}` : 'A este ritmo no llegas: prueba a aportar algo más';

export function DashboardView(p: DashboardViewProps) {
  const m = p.metrics;
  const base = p.baseHref ?? '/';
  const up = m.ganancia >= 0;
  // En la cabecera: el objetivo de la cartera elegida (o de la única cartera) y, si no, el próximo hito del total.
  const meta = p.selected ? p.goals.find((g) => g.id === p.selected) ?? null : p.carteras.length === 1 ? p.goals[0] ?? null : null;
  const sig = p.hitos?.siguiente ?? null;
  const ultimoHito = p.hitos?.logrados[p.hitos.logrados.length - 1] ?? null;
  // Se celebra el último hito si es de este último mes y no llegó solo por añadir algo que ya tenías
  const hitoReciente = ultimoHito && !ultimoHito.alEmpezar && Date.parse(p.today) - Date.parse(ultimoHito.fecha) <= 31 * 86_400_000 ? ultimoHito : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm text-muted">{saludo()}</span>
          <h1 className="font-display text-[26px] font-bold tracking-tight">{p.nombre}</h1>
        </div>
        <Link href="/movimiento" aria-label="Nuevo movimiento" className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white lg:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 V19 M5 12 H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </Link>
      </header>

      {p.carteras.length > 1 ? (
        <nav aria-label="Filtrar por cartera" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Link href={base} aria-current={!p.selected ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!p.selected ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>Todo</Link>
          {p.carteras.map((c) => (
            <Link key={c.id} href={`${base}?cartera=${c.id}`} aria-current={p.selected === c.id ? 'page' : undefined}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${p.selected === c.id ? 'bg-ink text-white' : 'border border-line-strong bg-surface text-muted-2'}`}>{c.nombre}</Link>
          ))}
        </nav>
      ) : null}

      <section className="flex flex-col gap-4 rounded-[20px] bg-ink p-5 text-white sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-semibold tracking-[0.08em] text-[#B8B8B0] uppercase">Patrimonio {p.selected ? 'de la cartera' : 'total'}</span>
          {p.actualizado ? <span className="text-[11px] text-[#8A8A82]">Precios: {p.actualizado}</span> : null}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[44px] leading-none font-bold tracking-[-0.03em] tabular sm:text-[56px]">{eur(m.valor)}</span>
          <span className={`text-[15px] font-semibold tabular ${up ? 'text-pos-on-dark' : 'text-neg-on-dark'}`}>
            {up ? '▲' : '▼'} {eurSigned(m.ganancia)} ({pctSigned(m.gananciaPct)}) desde el inicio
          </span>
        </div>

        {meta ? (
          <div className="flex flex-col gap-2">
            <Bar ratio={meta.valor / meta.objetivo} label={`Progreso hacia ${eur(meta.objetivo)}`} onDark big />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]">
              <span><span className="font-bold tabular">{pct(Math.min(1, meta.valor / meta.objetivo), 1)}</span> <span className="text-[#B8B8B0]">del camino hacia {eur(meta.objetivo)}{meta.anio ? ` en ${meta.anio}` : ''}</span></span>
              <span className="text-[#B8B8B0]">{meta.valor >= meta.objetivo ? '¡Conseguido!' : <>Faltan <span className="font-semibold text-white tabular">{eur(meta.objetivo - meta.valor)}</span>{meta.eta && meta.eta !== 'conseguido' ? ` · ${mesLargo(meta.eta)}` : ''}</>}</span>
            </div>
          </div>
        ) : sig ? (
          <div className="flex flex-col gap-2">
            <Bar ratio={sig.progreso} label={`Progreso hacia ${eur(sig.importe)}`} onDark big />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]">
              <span><span className="text-[#B8B8B0]">Próximo hito:</span> <span className="font-bold tabular">{eur(sig.importe)}</span></span>
              <span className="text-[#B8B8B0]">Llevas el <span className="font-semibold text-white tabular">{pct(sig.progreso, 0)}</span> · faltan {eur(sig.falta)}</span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 border-t border-ink-2 pt-3">
          <div className="flex flex-col"><span className="text-xs text-[#B8B8B0]">Capital aportado</span><span className="font-semibold tabular">{eur(m.aportado)}</span></div>
          <div className="flex flex-col"><span className="text-xs text-[#B8B8B0]">Mercado este mes</span>
            <span className={`font-semibold tabular ${m.mesActual.ganancia >= 0 ? 'text-pos-on-dark' : 'text-neg-on-dark'}`}>{eurSigned(m.mesActual.ganancia)}</span></div>
        </div>
      </section>

      {hitoReciente ? (
        <div className="flex items-center gap-3.5 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3 L14.6 8.6 L20.6 9.3 L16.1 13.4 L17.3 19.4 L12 16.4 L6.7 19.4 L7.9 13.4 L3.4 9.3 L9.4 8.6 Z" fill="currentColor" /></svg>
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-brand-dark">¡Nuevo hito! Has superado los {eur(hitoReciente.importe)}</span>
            <span className="text-[13px] text-muted-2">Lo conseguiste el {fechaCorta(hitoReciente.fecha)}. Sigue así: lo importante es no parar de aportar.</span>
          </div>
        </div>
      ) : null}

      {p.saldos && p.saldos.pendientes > 0 ? (
        <Link href="/saldos" className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 hover:border-line-strong">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal-ink" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M3 10 H21 M7 15 H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold">Mes nuevo: anota tus saldos</span>
            <span className="text-[13px] text-muted">{p.saldos.pendientes === p.saldos.total ? 'Tus cuentas, planes y depósitos' : `${p.saldos.pendientes} de ${p.saldos.total} sin anotar`} · un minuto</span>
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 L16 12 L9 19" stroke="#A1A1AA" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="TIR anualizada" value={m.tir === null ? '—' : pct(m.tir)} sub={m.tir === null ? 'Con 3 meses de historia' : 'Rentabilidad real por año'} />
        <Stat label="Aportación media" value={`${eur(m.aportacionMediaMensual)}/mes`} sub={m.racha > 0 ? `Racha: ${m.racha} ${m.racha === 1 ? 'mes' : 'meses seguidos'}` : 'Sin racha activa'} tone={m.racha > 0 ? 'brand' : undefined} />
        <Stat label="Caída máxima" value={pct(m.maxDrawdown)} sub="Peor bache (drawdown)" tone={m.maxDrawdown < -0.0005 ? 'neg' : undefined} />
        <Stat label="Comisiones" value={eur(m.comisionesPagadas, 2)}
          sub={`Ya pagadas · ${m.costeAnual > 0
            ? `${m.terMedio !== null ? `TER ${pct(m.terMedio, 2)}` : ''}${m.terMedio !== null && m.comisionesFijas > 0 ? ' + ' : ''}${m.comisionesFijas > 0 ? `${eur(m.comisionesFijas)} fijos` : ''} ≈ ${eur(m.costeAnual)}/año`
            : 'TER de los fondos: pendiente'}`} />
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <H2>{p.goals.length === 1 ? 'Tu objetivo' : 'Tus objetivos'}</H2>
          {p.goals.length ? <Link href="/carteras" className="text-sm font-semibold text-brand">Cambiar</Link> : null}
        </div>
        {p.goals.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Ponle un importe meta a tus carteras para ver cuánto te falta y cuándo llegarías.</p>
            <LinkButton href="/carteras" variant="secondary" className="self-start">Poner un objetivo</LinkButton>
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
            {p.goals.map((g) => {
              const ratio = Math.min(1, g.valor / g.objetivo);
              return (
                <div key={g.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/carteras/${g.id}`} className="min-w-0 truncate font-semibold hover:underline">{g.nombre}</Link>
                    <span className="text-lg font-bold text-brand tabular">{pct(ratio, 0)}</span>
                  </div>
                  <Bar ratio={ratio} label={`Progreso de ${g.nombre}`} big />
                  <div className="flex flex-wrap justify-between gap-x-3 text-[13px] text-muted">
                    <span><span className="font-semibold text-ink tabular">{eur(g.valor)}</span> de {eur(g.objetivo)}{g.anio ? ` en ${g.anio}` : ''}</span>
                    <span>{etaText(g)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {p.simulacion ? <SimResumen {...p.simulacion} /> : null}

      <DashboardCharts today={p.today} value={p.value} byProduct={p.byProduct} byClass={p.byClass} />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <DistributionCard sets={p.dists} />
        {p.hitos ? <HitosCard hitos={p.hitos} /> : null}
      </div>

      {p.objetivo}

      <InstallApp compact />

      {p.warnings.length ? (
        <details className="rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          <summary className="cursor-pointer font-semibold">Hay {p.warnings.length} aviso{p.warnings.length > 1 ? 's' : ''} sobre tus datos</summary>
          <ul className="mt-2 list-disc pl-5">{p.warnings.slice(0, 8).map((w) => <li key={w}>{w}</li>)}</ul>
        </details>
      ) : null}
    </div>
  );
}

function HitosCard({ hitos }: { hitos: Milestones }) {
  const sig = hitos.siguiente;
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <H2>Hitos</H2>
        <p className="text-[13px] text-muted">La primera vez que tu patrimonio superó cada cifra</p>
      </div>
      <ol className="flex flex-col">
        {hitos.logrados.map((h) => (
          <li key={h.importe} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12.5 L10 17 L19 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="flex-1 font-semibold tabular">{eur(h.importe)}</span>
            <span className="text-[13px] text-muted">{fechaCorta(h.fecha)}</span>
          </li>
        ))}
        {sig ? (
          <li className="flex flex-col gap-2 py-2.5">
            <div className="flex items-center gap-3">
              <span className="h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-line-strong" aria-hidden="true" />
              <span className="flex-1 font-semibold tabular">{eur(sig.importe)}</span>
              <span className="text-[13px] text-muted">faltan {eur(sig.falta)}</span>
            </div>
            <div className="pl-10"><Bar ratio={sig.progreso} label={`Progreso hacia ${eur(sig.importe)}`} /></div>
          </li>
        ) : null}
      </ol>
      {hitos.logrados.length === 0 ? <p className="text-[13px] text-muted">Tu primer hito llega con los primeros {eur(sig?.importe ?? 1000)}. ¡A por él!</p> : null}
    </Card>
  );
}

const pctTxt = (v: number) => (v >= 0.995 ? '> 99 %' : v < 0.005 ? '< 1 %' : `${Math.round(v * 100)} %`);

/** «Si sigues así»: escenarios, rentabilidad esperada y probabilidad de perder dinero, en corto. */
function SimResumen(s: SimResumenProps) {
  const r = s.sim;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <H2>{s.todo ? 'Si sigues así, todo junto' : s.conPlan ? 'Si sigues tu plan' : 'Si sigues así'}</H2>
          <p className="text-[13px] text-muted">
            En {r.years} {r.years === 1 ? 'año' : 'años'} ({s.anio}), con {eur(s.initial)} de hoy{s.monthly > 0 ? ` y ${eur(s.monthly)} al mes` : ''}
            {s.todo ? ', cada cartera con su peso y sus %' : ''}.
          </p>
        </div>
        <Link href={s.href} className="shrink-0 text-sm font-semibold text-brand">Ver más</Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { k: 'Pesimista', v: r.pesimista, t: r.rentPesimista, cls: 'bg-warn-bg text-warn-ink' },
          { k: 'Esperado', v: r.esperado, t: r.rentEsperada, cls: 'bg-brand-soft text-brand-dark' },
          { k: 'Optimista', v: r.optimista, t: r.rentOptimista, cls: 'bg-subtle text-ink' },
        ].map((x) => (
          <div key={x.k} className={`flex flex-col gap-0.5 rounded-xl px-1.5 py-3 ${x.cls}`}>
            <span className="text-xs">{x.k}</span>
            <span className="text-[16px] font-bold tabular sm:text-[19px]">{eur(x.v)}</span>
            <span className="text-[11px] opacity-80 tabular">{pctSigned(x.t)} al año</span>
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div className="flex flex-col"><dt className="text-xs text-muted">Rentabilidad esperada</dt><dd className="font-semibold tabular">{pctSigned(r.rentEsperada)} al año</dd></div>
        <div className="flex flex-col"><dt className="text-xs text-muted">Probabilidad de perder dinero</dt><dd className="font-semibold tabular">{pctTxt(r.probPerdida)}</dd></div>
        <div className="flex flex-col"><dt className="text-xs text-muted">Habrás aportado</dt><dd className="font-semibold tabular">{eur(r.invertido)}</dd></div>
        {s.goal && r.probMeta !== null ? (
          <div className="flex flex-col"><dt className="text-xs text-muted">Llegar a {eur(s.goal)}</dt><dd className="font-semibold tabular text-brand-dark">{pctTxt(r.probMeta)}</dd></div>
        ) : null}
      </dl>
      <p className="text-xs text-muted">Con lo que pasó de verdad en los mercados entre {r.desde} y {r.hasta} ({r.ventanas} periodos de {r.recortado ?? r.years} {(r.recortado ?? r.years) === 1 ? 'año' : 'años'}). Pesimista y optimista: el 10 % peor y el 10 % mejor. Lo pasado no garantiza lo futuro.</p>
    </Card>
  );
}
