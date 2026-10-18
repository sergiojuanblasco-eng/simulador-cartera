'use client';

import { useState, useTransition } from 'react';
import { ProductPicker } from '@/components/product-picker';
import { Alert, Button, Field, Input, Segmented, Select } from '@/components/ui';
import { Done, PortfolioList, StepTitle, WizardHeader } from '@/components/wizard-parts';
import type { AssetChoice } from '@/lib/asset-choice';
import { eur, parseEsNumber } from '@/lib/format';
import type { WizardData } from '@/lib/wizard-data';
import { rebalance } from '../../actions';

const OTHER = '__otro__';

export function RebalanceWizard({ data }: { data: WizardData }) {
  const [step, setStep] = useState(1);
  const [portfolio, setPortfolio] = useState<string | null>(data.portfolios.length === 1 ? data.portfolios[0]!.id : null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [asset, setAsset] = useState<AssetChoice | null>(null);
  const [importe, setImporte] = useState('');
  const [fecha, setFecha] = useState(data.today);
  const [modo, setModo] = useState<'traspaso' | 'venta'>('traspaso');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const inPortfolio = data.holdings.filter((h) => h.portfolioId === portfolio);
  const withBalance = inPortfolio.filter((h) => h.cantidad > 1e-9);
  const portfolioName = data.portfolios.find((p) => p.id === portfolio)?.nombre ?? '';
  const fromH = data.holdings.find((h) => h.id === from);

  if (done) {
    return <Done title="Rebalanceo registrado" text={`Tu capital aportado no cambia: solo se ha movido dinero dentro de ${portfolioName}.`}
      onAgain={() => { setStep(1); setFrom(''); setTo(''); setAsset(null); setImporte(''); setDone(false); }} />;
  }

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col gap-5">
      <WizardHeader label="Rebalanceo" step={step} total={2} onBack={step > 1 ? () => setStep(1) : undefined} />

      {step === 1 ? (
        <>
          <StepTitle title="¿En qué cartera?" sub="¿Dentro de qué cartera reequilibras?" />
          <PortfolioList portfolios={data.portfolios} holdings={data.holdings} value={portfolio} onChange={(id) => { setPortfolio(id); setFrom(''); setTo(''); }} />
        </>
      ) : (
        <>
          <StepTitle title="Mover dinero" sub={<>Dentro de <strong className="text-ink">{portfolioName}</strong>. No cuenta como aportación nueva.</>} />
          {withBalance.length === 0 ? <Alert tone="info">Esta cartera no tiene productos con saldo.</Alert> : null}
          <Field label="Desde" htmlFor="desde">
            <Select id="desde" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="">Elige un producto…</option>
              {withBalance.map((h) => <option key={h.id} value={h.id}>{h.nombre} · {eur(h.valor)}</option>)}
            </Select>
          </Field>
          <Field label="Hacia" htmlFor="hacia">
            <Select id="hacia" value={to} onChange={(e) => { setTo(e.target.value); if (e.target.value !== OTHER) setAsset(null); }}>
              <option value="">Elige un producto…</option>
              {inPortfolio.filter((h) => h.id !== from).map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
              <option value={OTHER}>+ Otro producto…</option>
            </Select>
          </Field>
          {to === OTHER ? <ProductPicker value={asset} onChange={setAsset} label="Producto de destino" /> : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Importe (€)" htmlFor="rimp"><Input id="rimp" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="2.000,00" /></Field>
            <Field label="Fecha" htmlFor="rfecha"><Input id="rfecha" type="date" value={fecha} max={data.today} onChange={(e) => setFecha(e.target.value)} /></Field>
          </div>
          {fromH ? <button type="button" className="-mt-2 self-start py-1 text-sm font-semibold text-brand" onClick={() => setImporte(fromH.valor.toFixed(2).replace('.', ','))}>Moverlo todo ({eur(fromH.valor)})</button> : null}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">¿Cómo se ha hecho?</span>
            <Segmented label="Modo" value={modo} onChange={setModo} options={[{ value: 'traspaso', label: 'Traspaso entre fondos' }, { value: 'venta', label: 'Venta y compra' }]} />
            <p className="text-[13px] leading-relaxed text-muted">
              {modo === 'traspaso'
                ? 'Traspaso: en España los traspasos entre fondos no tributan; se mantiene la fecha y el coste de compra original.'
                : 'Venta y compra: se registra una venta (con su ganancia o pérdida) y una compra nueva por el mismo importe.'}
            </p>
          </div>
        </>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {error ? <Alert>{error}</Alert> : null}
        <Button type="button" disabled={pending || !portfolio || (step === 2 && (!from || !to || (to === OTHER && !asset)))}
          onClick={() => {
            setError(null);
            if (step === 1) { setStep(2); return; }
            const imp = parseEsNumber(importe);
            if (!imp || imp <= 0) { setError('Indica un importe mayor que cero.'); return; }
            start(async () => {
              const r = await rebalance({
                fromHoldingId: from, toHoldingId: to === OTHER ? null : to, toAsset: to === OTHER ? asset : null,
                importe: imp, fecha, modo,
              });
              if (r.ok) setDone(true); else setError(r.error ?? 'Algo ha fallado.');
            });
          }}>
          {pending ? 'Guardando…' : step === 1 ? 'Continuar' : 'Guardar rebalanceo'}
        </Button>
      </div>
    </div>
  );
}
