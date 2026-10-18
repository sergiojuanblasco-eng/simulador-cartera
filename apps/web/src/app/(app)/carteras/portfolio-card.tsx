'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { eur, parseEsNumber, pct } from '@/lib/format';
import { deletePortfolio, updatePortfolio } from '../actions';

export function PortfolioCard(p: {
  id: string; nombre: string; objetivoImporte: number | null; objetivoAnio: number | null;
  valor: number; productos: number; peso: number; tienePlan: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(p.nombre);
  const [importe, setImporte] = useState(p.objetivoImporte ? String(p.objetivoImporte) : '');
  const [anio, setAnio] = useState(p.objetivoAnio ? String(p.objetivoAnio) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-line-strong">
        <Link href={`/carteras/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{p.nombre}</span>
            <span className="text-[13px] text-muted">
              {p.productos} {p.productos === 1 ? 'producto' : 'productos'} · {pct(p.peso)} de tu patrimonio
              {p.objetivoImporte ? ` · meta ${eur(p.objetivoImporte)}${p.objetivoAnio ? ` en ${p.objetivoAnio}` : ''}` : ''}
            </span>
            <span className={`text-xs font-semibold ${p.tienePlan ? 'text-brand' : 'text-muted-2'}`}>{p.tienePlan ? '✓ Cartera objetivo definida' : 'Sin cartera objetivo · defínela →'}</span>
          </span>
          <span className="font-semibold tabular">{eur(p.valor)}</span>
        </Link>
        <button type="button" onClick={() => setEditing(true)} className="min-h-11 px-2 text-sm font-semibold text-brand">Editar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-brand bg-surface p-4">
      <Field label="Nombre" htmlFor={`n-${p.id}`}><Input id={`n-${p.id}`} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Objetivo (€)" htmlFor={`i-${p.id}`}><Input id={`i-${p.id}`} inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="Opcional" /></Field>
        <Field label="Para el año" htmlFor={`a-${p.id}`}><Input id={`a-${p.id}`} inputMode="numeric" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="Opcional" /></Field>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => start(async () => {
          const r = await updatePortfolio(p.id, { nombre, objetivoImporte: parseEsNumber(importe), objetivoAnio: parseEsNumber(anio) });
          if (r.ok) setEditing(false); else setError(r.error ?? 'Error');
        })}>Guardar</Button>
        <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
        <Button type="button" variant="danger" className="ml-auto" disabled={pending} onClick={() => {
          if (!confirm(`¿Borrar la cartera "${p.nombre}" con todos sus productos y movimientos? No se puede deshacer.`)) return;
          start(async () => { const r = await deletePortfolio(p.id); if (!r.ok) setError(r.error ?? 'Error'); });
        }}>Borrar</Button>
      </div>
    </div>
  );
}
