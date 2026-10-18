'use client';

import { CLASE_LABEL } from '@kartera/core';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateProduct } from '@/app/(app)/actions';
import { ASSET_TYPE_OPTIONS } from '@/lib/asset-choice';
import { CLASE_OPTIONS } from '@/lib/asset-class';
import { parseEsNumber } from '@/lib/format';
import { Alert, Button, Card, Field, H2, Input, Select } from './ui';

/**
 * Editar un producto. La clase de activo se puede cambiar siempre (es tuya);
 * nombre, vehículo, TER e ISIN solo en productos creados por ti (los demás vienen de datos de mercado).
 */
export function EditAssetCard(p: {
  holdingId: string; propio: boolean; nombre: string; tipo: string; terPct: number | null; isin: string | null;
  sugerencia?: string | null; clase: string; claseAuto: boolean; claseDetectada: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!!p.sugerencia);
  const [nombre, setNombre] = useState(p.nombre);
  const [tipo, setTipo] = useState(p.sugerencia ? 'cripto' : p.tipo);
  const [ter, setTer] = useState(p.terPct === null ? '' : String(p.terPct).replace('.', ','));
  const [isin, setIsin] = useState(p.isin ?? '');
  const [clase, setClase] = useState(p.claseAuto ? 'auto' : p.clase);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-2">
          {p.propio ? 'Producto creado por ti: puedes corregir su nombre, clase, vehículo, TER o ISIN.' : `Clase de activo: ${CLASE_LABEL[p.clase]}. ¿No es correcta?`}
        </span>
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
          if (p.propio && ter.trim() !== '' && terPct === null) { setError('Escribe el TER como número, p. ej. 0,20'); return; }
          start(async () => {
            const r = await updateProduct({ holdingId: p.holdingId, clase, ...(p.propio ? { nombre, tipo, terPct, isin } : {}) });
            if (!r.ok) { setError(r.error ?? 'No se pudo guardar.'); return; }
            setOk(r.data?.enlazado ? `Guardado y enlazado con datos de mercado: ${r.data.enlazado}.` : 'Guardado.');
            if (r.data && r.data.holdingId !== p.holdingId) router.replace(`/activos/${r.data.holdingId}`);
            else router.refresh();
          });
        }}
      >
        <Field label="Clase de activo" htmlFor="ea-clase" hint="Para tu distribución: renta variable, renta fija, monetario…">
          <Select id="ea-clase" value={clase} onChange={(e) => setClase(e.target.value)}>
            <option value="auto">Automática ({CLASE_LABEL[p.claseDetectada]})</option>
            {CLASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        {p.propio ? (
          <>
            <Field label="Nombre" htmlFor="ea-nombre"><Input id="ea-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Vehículo" htmlFor="ea-tipo">
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
          </>
        ) : null}
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
