'use client';

import type { AssetType } from '@kartera/core';
import { useEffect, useRef, useState } from 'react';
import { searchAssets } from '@/app/(app)/actions';
import { ASSET_TYPE_OPTIONS, type AssetChoice, type SearchResult } from '@/lib/asset-choice';
import { parseEsNumber } from '@/lib/format';
import { Button, Field, Input, Select } from './ui';

/** Buscador de productos: catálogo propio + EODHD (fondos/ETFs) + CoinGecko (cripto) + alta manual. */
export function ProductPicker({ value, onChange, label = 'Busca por nombre, ISIN o ticker' }: {
  value: AssetChoice | null;
  onChange: (c: AssetChoice | null) => void;
  label?: string;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchAssets(term);
        if (id === seq.current) setResults(r);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    const nombre = value.nombre;
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-brand bg-surface px-4 py-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{nombre}</span>
          <span className="text-xs text-muted">{value.kind === 'manual' ? 'Producto propio (precio manual)' : value.kind === 'external' ? value.detalle : 'Del catálogo'}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="min-h-11 px-2 text-sm font-semibold text-brand">Cambiar</button>
      </div>
    );
  }

  if (manual) return <ManualProduct onCancel={() => setManual(false)} onDone={(c) => { onChange(c); setManual(false); }} />;

  return (
    <div className="flex flex-col gap-2">
      <Field label={label} htmlFor="buscar-producto">
        <Input id="buscar-producto" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="MSCI World, IE00B4L5Y983, Bitcoin…" autoComplete="off" />
      </Field>
      <div aria-live="polite" className="text-xs text-muted">{loading ? 'Buscando…' : q.trim().length >= 2 && results.length === 0 ? 'Sin resultados.' : ''}</div>
      {results.length ? (
        <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => onChange(r.choice)} className="flex w-full flex-col gap-0.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left hover:border-brand">
                <span className="text-[15px] font-semibold">{r.nombre}</span>
                <span className="text-xs text-muted">{r.detalle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" onClick={() => setManual(true)} className="self-start py-2 text-sm font-semibold text-brand">¿No lo encuentras? Créalo a mano</button>
    </div>
  );
}

function ManualProduct({ onDone, onCancel }: { onDone: (c: AssetChoice) => void; onCancel: () => void }) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<AssetType>('fondo');
  const [ter, setTer] = useState('');
  const [isin, setIsin] = useState('');
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <span className="font-semibold">Producto propio</span>
      <p className="-mt-2 text-[13px] text-muted">Para cuentas remuneradas, depósitos o fondos que no encontremos. Su valor se calculará con el precio de tus operaciones.</p>
      <Field label="Nombre" htmlFor="m-nombre"><Input id="m-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Cuenta remunerada MyInvestor" /></Field>
      <Field label="Tipo" htmlFor="m-tipo">
        <Select id="m-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as AssetType)}>
          {ASSET_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="TER (%)" htmlFor="m-ter"><Input id="m-ter" inputMode="decimal" value={ter} onChange={(e) => setTer(e.target.value)} placeholder="0,12" /></Field>
        <Field label="ISIN" htmlFor="m-isin"><Input id="m-isin" value={isin} onChange={(e) => setIsin(e.target.value.toUpperCase())} placeholder="Opcional" maxLength={12} /></Field>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="button" disabled={!nombre.trim()} className="flex-1" onClick={() => {
          const t = parseEsNumber(ter);
          onDone({ kind: 'manual', nombre: nombre.trim(), tipo, ter: t !== null ? t / 100 : null, isin: isin || null });
        }}>Usar este producto</Button>
      </div>
    </div>
  );
}
