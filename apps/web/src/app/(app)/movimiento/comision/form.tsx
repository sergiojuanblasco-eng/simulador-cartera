'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Alert, Button, Field, Input, Select, AmountInput } from '@/components/ui';
import { eur, parseEsNumber } from '@/lib/format';
import { addFee } from '../../actions';

export function FeeForm({ grupos, inicial, today }: {
  grupos: { nombre: string; productos: { id: string; nombre: string; broker: string }[] }[];
  inicial: string;
  today: string;
}) {
  const [producto, setProducto] = useState(inicial);
  const [fecha, setFecha] = useState(today);
  const [importe, setImporte] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<number | null>(null);
  const [pending, start] = useTransition();

  if (hecho !== null) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="ok">Comisión de {eur(hecho, 2)} registrada. Ya está restada de tu ganancia (no cuenta como pérdida del mercado).</Alert>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => { setHecho(null); setImporte(''); setNota(''); }}>Registrar otra</Button>
          <Link href={`/activos/${producto}`} className="inline-flex min-h-12 items-center px-3 font-semibold text-brand">Ver el producto →</Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const v = parseEsNumber(importe.replace('€', ''));
        if (v === null || v <= 0) { setError('Escribe cuánto te han cobrado.'); return; }
        start(async () => {
          const r = await addFee({ holdingId: producto, fecha, importe: v, notas: nota });
          if (!r.ok) { setError(r.error ?? 'No se pudo guardar.'); return; }
          setHecho(v);
        });
      }}
    >
      <Field label="¿De qué producto?" htmlFor="fe-producto">
        <Select id="fe-producto" value={producto} onChange={(e) => setProducto(e.target.value)}>
          {grupos.map((g) => (
            <optgroup key={g.nombre} label={g.nombre}>
              {g.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.broker ? ` · ${p.broker}` : ''}</option>)}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Importe (€)" htmlFor="fe-importe">
          <AmountInput id="fe-importe" value={importe} onValueChange={setImporte} placeholder="12,50" className="tabular" required />
        </Field>
        <Field label="Fecha" htmlFor="fe-fecha">
          <Input id="fe-fecha" type="date" value={fecha} max={today} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
      </div>
      <Field label="Nota (opcional)" htmlFor="fe-nota">
        <Input id="fe-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Custodia 2.º semestre" maxLength={200} />
      </Field>
      <p className="text-[13px] text-muted">Es para lo que te cargan en la cuenta. Las comisiones de compra o venta se ponen al registrar la operación, y el TER de los fondos ya va dentro de su precio.</p>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Guardando…' : 'Registrar comisión'}</Button>
    </form>
  );
}
