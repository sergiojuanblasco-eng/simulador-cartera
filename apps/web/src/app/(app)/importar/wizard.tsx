'use client';

import type { TxType } from '@kartera/core';
import Link from 'next/link';
import Papa from 'papaparse';
import { useMemo, useState, useTransition } from 'react';
import readXlsxFile from 'read-excel-file';
import { Alert, Button, Card, LinkButton, Select } from '@/components/ui';
import { StepTitle, WizardHeader } from '@/components/wizard-parts';
import { BROKERS } from '@/lib/db';
import { eur, fechaCorta } from '@/lib/format';
import {
  autoMap, FIELD_LABEL, FIELDS, findHeaderRow, ISSUE_LABEL, normalizeRows, rowIssues,
  type Field, type Mapping, type NormalizedRow,
} from '@/lib/import/parse';
import { TX_LABEL } from '@/lib/tx-labels';
import { commitImport, previewImport, type PreviewResult } from './actions';

type Source = 'myinvestor' | 'trade_republic' | 'excel' | 'ia';

const SOURCES: { id: Source; ini: string; name: string; sub: string; how: string[]; accept: string; broker: string }[] = [
  { id: 'myinvestor', ini: 'MI', name: 'MyInvestor', sub: 'Archivo CSV o Excel de movimientos', broker: 'MyInvestor', accept: '.csv,.xlsx',
    how: ['Entra en la web de MyInvestor.', 'Ve a los movimientos de tu cartera de fondos o de tu cuenta de valores.', 'Exporta a Excel o CSV y súbelo aquí.'] },
  { id: 'trade_republic', ini: 'TR', name: 'Trade Republic', sub: 'Extracto de operaciones', broker: 'Trade Republic', accept: '.csv,.xlsx',
    how: ['En la app de Trade Republic, exporta tus transacciones a CSV (desde tu perfil).', 'Súbelo tal cual: reconocemos sus columnas, la comisión de 1 € y las cripto.', 'Los pagos con tarjeta, transferencias e intereses se ignoran solos.', 'Si solo tienes PDFs, usa la opción «Otro bróker (con IA)».'] },
  { id: 'excel', ini: 'XL', name: 'Mi propio Excel', sub: 'Con nuestra plantilla de columnas', broker: 'Otro', accept: '.csv,.xlsx',
    how: ['Descarga la plantilla.', 'Copia tus operaciones: fecha, ISIN, producto, tipo (compra/venta), importe y participaciones.', 'Súbela aquí (CSV o Excel).'] },
  { id: 'ia', ini: 'IA', name: 'Otro bróker (con IA)', sub: 'Cualquier extracto, incluso PDF · Beta', broker: 'Otro', accept: '.csv,.xlsx,.pdf',
    how: ['Sube el extracto que te dé tu banco o bróker, en el formato que sea.', 'La IA detecta las operaciones y tú las revisas antes de guardar nada.'] },
];

const TIPOS: TxType[] = ['compra', 'venta', 'traspaso_entrada', 'traspaso_salida', 'dividendo', 'comision'];
const NEW = '__nueva__';

export function ImportWizard({ portfolios, initialPortfolio, aiEnabled }: {
  portfolios: { id: string; nombre: string }[]; initialPortfolio: string | null; aiEnabled: boolean;
}) {
  const [step, setStep] = useState(1);
  const [source, setSource] = useState<Source>('myinvestor');
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState<unknown[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [aiRows, setAiRows] = useState<NormalizedRow[] | null>(null);
  const [fixes, setFixes] = useState<Record<number, TxType | 'ignorar'>>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [assign, setAssign] = useState<Record<string, { portfolio: string; newName: string; broker: string }>>({});
  const [result, setResult] = useState<{ importadas: number; omitidas: number; avisos: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const src = SOURCES.find((s) => s.id === source)!;
  const headers = (table[headerRow] ?? []).map((c, i) => String(c ?? '').trim() || `Columna ${i + 1}`);

  const rows: NormalizedRow[] = useMemo(() => {
    const base = aiRows ?? (mapping ? normalizeRows(table.slice(headerRow + 1), mapping, headerRow + 2) : []);
    return base
      .filter((r) => fixes[r.fila] !== 'ignorar')
      .map((r) => (fixes[r.fila] && fixes[r.fila] !== 'ignorar' ? { ...r, tipo: fixes[r.fila] as TxType } : r));
  }, [aiRows, mapping, table, headerRow, fixes]);
  const valid = rows.filter((r) => rowIssues(r).length === 0);
  const unknownTipo = rows.filter((r) => rowIssues(r).length === 1 && rowIssues(r)[0] === 'tipo_desconocido');
  const cashRows = rows.filter((r) => r.noInversion);
  const broken = rows.filter((r) => !r.noInversion && rowIssues(r).some((x) => x !== 'tipo_desconocido'));

  async function onFile(file: File) {
    setError(null);
    setFileName(file.name);
    setAiRows(null);
    setFixes({});
    const ext = file.name.toLowerCase().split('.').pop();
    try {
      let parsed: unknown[][] = [];
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: true }).data;
      } else if (ext === 'xlsx') {
        parsed = (await readXlsxFile(file)) as unknown[][];
      } else if (ext !== 'pdf' || source !== 'ia') {
        setError('Formato no admitido. Usa CSV o Excel (.xlsx).');
        return;
      }

      if (source === 'ia') {
        const fd = new FormData();
        if (ext === 'pdf') fd.append('file', file);
        else fd.append('texto', parsed.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? ''))).join(';')).join('\n'));
        start(async () => {
          const res = await fetch('/api/importar/ia', { method: 'POST', body: fd });
          const body = (await res.json()) as { rows?: NormalizedRow[]; error?: string };
          if (!res.ok || !body.rows) { setError(body.error ?? 'No se pudo leer el archivo.'); return; }
          if (body.rows.length === 0) { setError('No hemos encontrado operaciones en el archivo.'); return; }
          setAiRows(body.rows);
          setStep(3);
        });
        return;
      }

      if (parsed.length < 2) { setError('El archivo está vacío.'); return; }
      const hr = findHeaderRow(parsed);
      setTable(parsed);
      setHeaderRow(hr);
      setMapping(autoMap((parsed[hr] ?? []).map((c) => String(c ?? '')), parsed.slice(hr + 1)));
      setStep(3);
    } catch {
      setError('No se pudo leer el archivo. ¿Es un CSV o un Excel válido?');
    }
  }

  function goReview() {
    setError(null);
    start(async () => {
      const p = await previewImport(valid);
      if (!p.ok) { setError(p.error ?? 'Error'); return; }
      setPreview(p);
      const def: typeof assign = {};
      for (const prod of p.products) {
        def[prod.key] = { portfolio: initialPortfolio ?? NEW, newName: initialPortfolio ? '' : 'Largo plazo', broker: src.broker };
      }
      setAssign(def);
      setStep(4);
    });
  }

  function doImport() {
    if (!preview) return;
    setError(null);
    start(async () => {
      const assignments: Parameters<typeof commitImport>[0]['assignments'] = {};
      for (const prod of preview.products) {
        const a = assign[prod.key]!;
        assignments[prod.key] = {
          portfolioId: a.portfolio !== NEW ? a.portfolio : undefined,
          newPortfolio: a.portfolio === NEW ? a.newName || 'Importada' : undefined,
          broker: a.broker,
          match: prod.match,
        };
      }
      const r = await commitImport({ source, rows: valid, assignments });
      if (!r.ok) { setError(r.error ?? 'Error'); return; }
      setResult({ importadas: r.importadas ?? 0, omitidas: r.omitidas ?? 0, avisos: r.avisos ?? [] });
      setStep(5);
    });
  }

  if (step === 5 && result) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col gap-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="32" fill="#E8F5EF" /><path d="M24 37 L32 45 L48 28" stroke="#16754E" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h1 className="font-display text-[26px] font-bold">{result.importadas} movimientos importados</h1>
          <p className="text-[15px] text-muted">{result.omitidas ? `${result.omitidas} omitidos (ya estaban o les faltaban datos). ` : ''}Tu patrimonio ya está recalculado.</p>
        </div>
        {result.avisos.length ? (
          <details className="rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
            <summary className="cursor-pointer font-semibold">{result.avisos.length} avisos</summary>
            <ul className="mt-2 list-disc pl-5">{result.avisos.slice(0, 20).map((a) => <li key={a}>{a}</li>)}</ul>
          </details>
        ) : null}
        <LinkButton href="/">Ver mi patrimonio</LinkButton>
      </div>
    );
  }

  const back = step > 1 ? () => { setError(null); setStep(step === 3 && source === 'ia' ? 2 : step - 1); } : undefined;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-5">
      <WizardHeader label="Importar" step={Math.min(step, 4)} total={4} onBack={back} closeHref="/" />

      {step === 1 ? (
        <>
          <StepTitle title="¿De dónde importas?" sub="Sube el archivo de movimientos de tu bróker y nosotros lo ordenamos." />
          <ul className="flex flex-col gap-2.5">
            {SOURCES.filter((s) => s.id !== 'ia' || aiEnabled).map((s) => (
              <li key={s.id}>
                <button type="button" aria-pressed={source === s.id} onClick={() => setSource(s.id)}
                  className={`flex min-h-[68px] w-full items-center gap-3.5 rounded-2xl bg-surface px-4 py-3 text-left ${source === s.id ? 'border-2 border-brand' : 'border border-line'}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${source === s.id ? 'bg-brand text-white' : 'bg-subtle text-muted-2'}`}>{s.ini}</span>
                  <span className="flex flex-col"><span className="font-semibold">{s.name}</span><span className="text-[13px] text-muted">{s.sub}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" className="mt-auto" onClick={() => setStep(2)}>Continuar</Button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepTitle title="Sube tu archivo" sub={<>Desde <strong className="text-ink">{src.name}</strong></>} />
          <Card className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Cómo conseguirlo</span>
            <ol className="list-decimal pl-5 text-sm leading-relaxed text-muted-2">{src.how.map((h) => <li key={h}>{h}</li>)}</ol>
            {source === 'excel' ? <a href="/plantilla.csv" download className="self-start py-1 text-sm font-semibold text-brand">Descargar plantilla</a> : null}
          </Card>
          <label htmlFor="file" className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#A1A1AA] bg-surface p-5 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16 V4 M7 9 L12 4 L17 9" stroke="#16754E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15 V19 H20 V15" stroke="#16754E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-semibold">{pending ? 'Leyendo con IA… (puede tardar un minuto)' : fileName || 'Toca para elegir el archivo'}</span>
            <span className="text-[13px] text-muted">{src.accept.replaceAll(',', ' · ')}</span>
            <input id="file" type="file" accept={src.accept} className="sr-only" disabled={pending}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
          </label>
          <p className="text-[13px] leading-relaxed text-muted">
            {source === 'ia' ? 'El archivo se envía a la IA solo para leer las operaciones; no se guarda.' : 'El archivo se lee en tu dispositivo. No pedimos claves ni accedemos a tu bróker.'}
          </p>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepTitle title="Comprueba los datos" sub={fileName} />
          {!aiRows && mapping ? (
            <Card className="flex flex-col gap-3">
              <span className="text-sm font-semibold">Columnas detectadas</span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {FIELDS.map((f: Field) => (
                  <label key={f} className="flex flex-col gap-1 text-[13px] text-muted-2">
                    {FIELD_LABEL[f]}
                    <Select value={mapping[f]} onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })} className="h-11 text-sm">
                      <option value={-1}>— No está —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </Select>
                  </label>
                ))}
              </div>
            </Card>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-line bg-surface p-2.5"><div className="text-xl font-bold">{valid.length}</div><div className="text-xs text-muted">válidas</div></div>
            <div className="rounded-xl border border-warn-line bg-warn-bg p-2.5"><div className="text-xl font-bold text-warn-ink">{unknownTipo.length}</div><div className="text-xs text-warn-ink">a revisar</div></div>
            <div className="rounded-xl border border-line bg-surface p-2.5"><div className="text-xl font-bold">{broken.length}</div><div className="text-xs text-muted">incompletas</div></div>
          </div>

          {valid.length ? (
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[480px] text-[13px]">
                <thead><tr className="text-left text-muted"><th className="px-3 py-2 font-medium">Fecha</th><th className="px-3 py-2 font-medium">Producto</th><th className="px-3 py-2 font-medium">Tipo</th><th className="px-3 py-2 text-right font-medium">Importe</th></tr></thead>
                <tbody>
                  {valid.slice(0, 6).map((r) => (
                    <tr key={r.fila} className="border-t border-line">
                      <td className="px-3 py-2 whitespace-nowrap">{fechaCorta(r.fecha!)}</td>
                      <td className="max-w-[180px] truncate px-3 py-2">{r.producto ?? r.isin}</td>
                      <td className="px-3 py-2">{TX_LABEL[r.tipo!]}</td>
                      <td className="px-3 py-2 text-right tabular">{eur(r.importe!, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {valid.length > 6 ? <p className="border-t border-line px-3 py-2 text-xs text-muted">… y {valid.length - 6} más</p> : null}
            </div>
          ) : null}

          {unknownTipo.length ? (
            <Card className="flex flex-col gap-2.5 border-warn-line">
              <span className="text-sm font-semibold">¿Qué tipo de operación es?</span>
              {unknownTipo.slice(0, 20).map((r) => (
                <div key={r.fila} className="flex flex-col gap-1.5 text-[13px]">
                  <span className="text-muted-2">Fila {r.fila} · {r.fecha ? fechaCorta(r.fecha) : ''} · «{r.tipoTexto || 'sin texto'}» · {r.importe ? eur(r.importe, 2) : ''}</span>
                  <Select aria-label={`Tipo de la fila ${r.fila}`} value={(fixes[r.fila] as string) ?? ''} className="h-11 text-sm"
                    onChange={(e) => setFixes({ ...fixes, [r.fila]: e.target.value as TxType | 'ignorar' })}>
                    <option value="">Elige…</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{TX_LABEL[t]}</option>)}
                    <option value="ignorar">No importar esta fila</option>
                  </Select>
                </div>
              ))}
            </Card>
          ) : null}

          {cashRows.length ? (
            <p className="text-[13px] text-muted">{cashRows.length} movimientos de cuenta (tarjeta, transferencias, intereses…) no son inversiones y no se importan.</p>
          ) : null}

          {broken.length ? (
            <details className="text-[13px] text-muted">
              <summary className="cursor-pointer py-1">{broken.length} filas incompletas no se importarán</summary>
              <ul className="mt-1 list-disc pl-5">{broken.slice(0, 15).map((r) => <li key={r.fila}>Fila {r.fila}: {rowIssues(r).map((i) => ISSUE_LABEL[i]).join(', ')}</li>)}</ul>
            </details>
          ) : null}

          {error ? <Alert>{error}</Alert> : null}
          <Button type="button" className="mt-auto" disabled={pending || valid.length === 0} onClick={goReview}>
            {pending ? 'Buscando productos…' : `Continuar con ${valid.length} operaciones`}
          </Button>
        </>
      ) : null}

      {step === 4 && preview ? (
        <>
          <StepTitle title="Revisa antes de guardar" sub={fileName} />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-surface p-2.5"><div className="text-xl font-bold">{preview.nuevas}</div><div className="text-xs text-muted">nuevas</div></div>
            <div className="rounded-xl border border-line bg-surface p-2.5"><div className="text-xl font-bold">{preview.duplicadas}</div><div className="text-xs text-muted">ya estaban (se omiten)</div></div>
          </div>
          <span className="text-sm font-semibold">¿A qué cartera va cada producto?</span>
          <ul className="flex flex-col gap-2.5">
            {preview.products.map((p) => {
              const a = assign[p.key]!;
              return (
                <li key={p.key} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold">{p.nombre}</span>
                    <span className="shrink-0 text-xs text-muted">{p.operaciones} op.</span>
                  </div>
                  <span className="text-xs text-muted">{p.isin ? `${p.isin} · ` : ''}{p.matchLabel}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-2">Cartera
                      <Select value={a.portfolio} className="h-11 text-sm" onChange={(e) => setAssign({ ...assign, [p.key]: { ...a, portfolio: e.target.value } })}>
                        {portfolios.map((pf) => <option key={pf.id} value={pf.id}>{pf.nombre}</option>)}
                        <option value={NEW}>+ Nueva cartera…</option>
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-2">Bróker
                      <Select value={a.broker} className="h-11 text-sm" onChange={(e) => setAssign({ ...assign, [p.key]: { ...a, broker: e.target.value } })}>
                        {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </Select>
                    </label>
                  </div>
                  {a.portfolio === NEW ? (
                    <input aria-label="Nombre de la nueva cartera" value={a.newName} placeholder="Nombre: Largo plazo, Colchón…" maxLength={60}
                      onChange={(e) => setAssign({ ...assign, [p.key]: { ...a, newName: e.target.value } })}
                      className="h-11 rounded-xl border border-line-strong px-3 text-sm" />
                  ) : null}
                </li>
              );
            })}
          </ul>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="button" disabled={pending || preview.nuevas === 0} onClick={doImport}>
            {pending ? 'Importando…' : preview.nuevas === 0 ? 'No hay nada nuevo que importar' : `Importar ${preview.nuevas} movimientos`}
          </Button>
          <Link href="/" className="self-center py-2 text-sm text-muted">Cancelar</Link>
        </>
      ) : null}

      {step === 2 && error ? <Alert>{error}</Alert> : null}
    </div>
  );
}

