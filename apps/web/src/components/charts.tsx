'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine,
  Scatter, Tooltip, XAxis, YAxis,
} from 'recharts';
import { eur, fechaCorta, mesCorto, pctSigned } from '@/lib/format';

/**
 * Mide el ancho disponible y pasa tamaños explícitos a la gráfica
 * (más fiable que ResponsiveContainer dentro de rejillas y al girar el móvil).
 */
function Sized({ height, label, children }: { height: number; label: string; children: (w: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.floor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setW(Math.floor(width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref} role="img" aria-label={label} style={{ height, width: '100%' }}>{w > 0 ? children(w) : null}</div>;
}

const AXIS = { fontSize: 11, fill: '#71717A' };
const GRID = '#EFEEE9';

const kfmt = (v: number) => {
  const a = Math.abs(v);
  if (a >= 10000) return `${Math.round(v / 1000)}k`;
  if (a >= 1000) return `${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}k`;
  return String(Math.round(v));
};

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px] shadow-md">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          {r.color ? <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} /> : null}
          <span className="text-muted">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** "Tu dinero vs. mercado": valor real frente a capital aportado (y opcionalmente el índice). */
export function ValueChart({ rows, showIndex = false, height = 220 }: {
  rows: { fecha: string; valor: number; aportado: number; indice?: number }[];
  showIndex?: boolean;
  height?: number;
}) {
  return (
    <Sized height={height} label="Gráfica del valor de tu cartera frente al capital aportado">
      {(w) => (
        <ComposedChart width={w} height={height} data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16754E" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#16754E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="fecha" tick={AXIS} tickFormatter={mesCorto} minTickGap={40} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} tickFormatter={kfmt} width={38} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!.payload as { valor: number; aportado: number; indice?: number };
              const rows2 = [
                { label: 'Valor', value: eur(p.valor), color: '#16754E' },
                { label: 'Aportado', value: eur(p.aportado), color: '#A1A1AA' },
              ];
              if (showIndex && p.indice !== undefined) rows2.push({ label: 'En el índice', value: eur(p.indice), color: '#D9822B' });
              return <TooltipBox title={fechaCorta(String(label))} rows={rows2} />;
            }}
          />
          <Area type="monotone" dataKey="valor" stroke="#16754E" strokeWidth={2.5} fill="url(#valFill)" isAnimationActive={false} />
          <Line type="stepAfter" dataKey="aportado" stroke="#A1A1AA" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          {showIndex ? <Line type="monotone" dataKey="indice" stroke="#D9822B" strokeWidth={2} dot={false} isAnimationActive={false} /> : null}
        </ComposedChart>
      )}
    </Sized>
  );
}

export function StackedChart({ keys, rows, height = 220 }: {
  keys: { key: string; label: string; color: string }[];
  rows: Record<string, number | string>[];
  height?: number;
}) {
  return (
    <Sized height={height} label="Gráfica apilada de la evolución del valor de cada parte de tu patrimonio">
      {(w) => (
        <AreaChart width={w} height={height} data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="fecha" tick={AXIS} tickFormatter={mesCorto} minTickGap={40} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} tickFormatter={kfmt} width={38} axisLine={false} tickLine={false} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const rows2 = [...payload].reverse().filter((p) => Number(p.value) > 0)
                .map((p) => ({ label: keys.find((k) => k.key === p.dataKey)?.label ?? '', value: eur(Number(p.value)), color: String(p.color) }));
              return <TooltipBox title={fechaCorta(String(label))} rows={rows2} />;
            }}
          />
          {keys.map((k) => (
            <Area key={k.key} type="monotone" dataKey={k.key} stackId="1" stroke="#FFFFFF" strokeWidth={1} fill={k.color} fillOpacity={1} isAnimationActive={false} />
          ))}
        </AreaChart>
      )}
    </Sized>
  );
}

/** Valor liquidativo con tus compras (azul) y ventas (naranja) marcadas. */
export function PriceChart({ rows, marks, height = 240 }: {
  rows: { fecha: string; precio: number }[];
  marks: { fecha: string; precio: number; tipo: 'compra' | 'venta' }[];
  height?: number;
}) {
  const byDate = new Map(marks.map((m) => [m.fecha, m]));
  const data = rows.map((r) => {
    const m = byDate.get(r.fecha);
    return { ...r, compra: m?.tipo === 'compra' ? m.precio : null, venta: m?.tipo === 'venta' ? m.precio : null };
  });
  // Marcas en fechas sin precio (fines de semana): se añaden como puntos sueltos.
  for (const m of marks) if (!rows.some((r) => r.fecha === m.fecha)) {
    data.push({ fecha: m.fecha, precio: null as unknown as number, compra: m.tipo === 'compra' ? m.precio : null, venta: m.tipo === 'venta' ? m.precio : null });
  }
  data.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return (
    <Sized height={height} label="Gráfica del precio del producto con tus compras y ventas marcadas">
      {(w) => (
        <ComposedChart width={w} height={height} data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="fecha" tick={AXIS} tickFormatter={mesCorto} minTickGap={40} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} width={44} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 2 })} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]!.payload as { precio: number | null; compra: number | null; venta: number | null };
              const rows2 = [];
              if (p.precio) rows2.push({ label: 'Precio', value: p.precio.toLocaleString('es-ES', { maximumFractionDigits: 4 }) });
              if (p.compra) rows2.push({ label: 'Compraste a', value: p.compra.toLocaleString('es-ES', { maximumFractionDigits: 4 }), color: '#16754E' });
              if (p.venta) rows2.push({ label: 'Vendiste a', value: p.venta.toLocaleString('es-ES', { maximumFractionDigits: 4 }), color: '#D9822B' });
              return <TooltipBox title={fechaCorta(String(label))} rows={rows2} />;
            }}
          />
          <Line type="monotone" dataKey="precio" stroke="#1B1B18" strokeWidth={1.8} dot={false} connectNulls isAnimationActive={false} />
          <Scatter dataKey="compra" fill="#16754E" isAnimationActive={false} />
          <Scatter dataKey="venta" fill="#D9822B" shape="diamond" isAnimationActive={false} />
        </ComposedChart>
      )}
    </Sized>
  );
}

export function YearBars({ data, height = 200 }: { data: { anio: number; rentabilidad: number; indice?: number | null }[]; height?: number }) {
  return (
    <Sized height={height} label="Rentabilidad de cada año natural">
      {(w) => (
        <BarChart width={w} height={height} data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="anio" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS} width={44} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v * 100)} %`} />
          <ReferenceLine y={0} stroke="#A1A1AA" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return <TooltipBox title={String(label)} rows={payload.map((p) => ({ label: p.dataKey === 'indice' ? 'Índice' : 'Tu cartera', value: pctSigned(Number(p.value)), color: String(p.color) }))} />;
            }}
          />
          <Bar dataKey="rentabilidad" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.anio} fill={d.rentabilidad >= 0 ? '#16754E' : '#B91C1C'} />)}
          </Bar>
          {data.some((d) => d.indice !== undefined && d.indice !== null) ? <Bar dataKey="indice" fill="#D9C2A8" radius={[4, 4, 0, 0]} isAnimationActive={false} /> : null}
        </BarChart>
      )}
    </Sized>
  );
}

export function MonthBars({ data, height = 220 }: { data: { mes: string; aportado: number; ganancia: number }[]; height?: number }) {
  return (
    <Sized height={height} label="Por mes: dinero aportado y ganancia o pérdida del mercado">
      {(w) => (
        <BarChart width={w} height={height} data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} stackOffset="sign">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="mes" tick={AXIS} tickFormatter={mesCorto} axisLine={false} tickLine={false} minTickGap={10} />
          <YAxis tick={AXIS} width={38} axisLine={false} tickLine={false} tickFormatter={kfmt} />
          <ReferenceLine y={0} stroke="#A1A1AA" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return <TooltipBox title={mesCorto(String(label))} rows={payload.map((p) => ({ label: p.dataKey === 'aportado' ? 'Aportado' : 'Mercado', value: eur(Number(p.value)), color: String(p.color) }))} />;
            }}
          />
          <Bar dataKey="aportado" stackId="m" fill="#A7D7BF" isAnimationActive={false} />
          <Bar dataKey="ganancia" stackId="m" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.mes} fill={d.ganancia >= 0 ? '#14532D' : '#D9822B'} />)}
          </Bar>
        </BarChart>
      )}
    </Sized>
  );
}
