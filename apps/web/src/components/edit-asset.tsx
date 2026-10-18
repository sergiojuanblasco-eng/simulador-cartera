'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateOwnAsset } from '@/app/(app)/actions';
import { ASSET_TYPE_OPTIONS } from '@/lib/asset-choice';
import { parseEsNumber } from '@/lib/format';
import { Alert, Button, Card, Field, H2, Input, Select } from './ui';

export function EditAssetCard(p: { holdingId: string; nombre: string; tipo: string; terPct: number | null; isin: string | null; sugerencia?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!p.sugerencia);
  const [nombre, setNombre] = useState(p.nombre);
  const [tipo, setTipo] = useState(p.sugerencia ? 'cripto' : p.tipo);
  const [ter, setTer] = useState(p.terPct === null ? '' : String(p.terPct).replace('.', ','));
  const [isin, setIsin] = useState(p.isin ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-2">Producto creado por ti: puedes corregir su nombre, tipo, TER o ISIN.</span>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>Editar</Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <H2>Editar producto</H2>
      {p.sugerencia ? <Alert tone="info">Parece una criptomoneda ({p.sugerencia}). Guárdalo como «Cripto» y lo enlazamos con su precio real.</Alert> : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setOk(null);
          const terPct = ter.trim() === '' ? null : parseEsNumber(ter.replace('%', ''));
          if (ter.trim() !== '' && terPct === null) { setError('Escribe el TER como número, p. ej. 0,20'); return; }
          start(async () => {
            const r = await updateOwnAsset({ holdingId: p.holdingId, nombre, tipo, terPct, isin });
            if (!r.ok) { setError(r.error ?? 'No se pudo guardar.'); return; }
            setOk(r.data?.enlazado ? `Guardado y enlazado con datos de mercado: ${r.data.enlazado}.` : 'Guardado.');
            if (r.data && r.data.holdingId !== p.holdingId) router.replace(`/activos/${r.data.holdingId}`);
            else router.refresh();
          });
        }}
      >
        <Field label="Nombre" htmlFor="ea-nombre"><Input id="ea-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Tipo" htmlFor="ea-tipo">
            <Select id="ea-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {ASSET_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="TER (% al año)" htmlFor="ea-ter" hint="En la ficha del fondo: «gastos corrientes».">
            <Input id="ea-ter" inputMode="decimal" value={ter} onChange={(e) => setTer(e.target.value)} placeholder="0,20" />
          </Field>
          <Field label="ISIN" htmlFor="ea-isin" hint="Con el ISIN buscamos su precio diario.">
            <Input id="ea-isin" value={isin} onChange={(e) => setIsin(e.target.value.toUpperCase())} placeholder="IE00B4L5Y983" maxLength={12} autoCapitalize="characters" />
          </Field>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {ok ? <Alert tone="ok">{ok}</Alert> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
        </div>
      </form>
    </Card>
  );
}
