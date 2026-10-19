'use client';

import { useState, useTransition } from 'react';
import { ProductPicker } from '@/components/product-picker';
import { Alert, Button, Field, Input, AmountInput } from '@/components/ui';
import { BrokerChips, Done, HoldingList, PortfolioList, StepTitle, WizardHeader } from '@/components/wizard-parts';
import type { AssetChoice } from '@/lib/asset-choice';
import { eur, numEs, parseEsNumber } from '@/lib/format';
import type { WizardData } from '@/lib/wizard-data';
import { addMovement } from '../../actions';

export function MovementWizard({ tipo, data, initialPortfolio }: {
  tipo: 'aportacion' | 'retirada'; data: WizardData; initialPortfolio: string | null;
}) {
  const isA = tipo === 'aportacion';
  const label = isA ? 'Aportación' : 'Retirada';
  const [step, setStep] = useState(initialPortfolio ? 2 : 1);
  const [portfolio, setPortfolio] = useState<string | null>(initialPortfolio ?? (data.portfolios.length === 1 ? data.portfolios[0]!.id : null));
  const [holding, setHolding] = useState<string | null>(null);
  const [asset, setAsset] = useState<AssetChoice | null>(null);
  const [broker, setBroker] = useState('MyInvestor');
  const [fecha, setFecha] = useState(data.today);
  const [importe, setImporte] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [comision, setComision] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const inPortfolio = data.holdings.filter((h) => h.portfolioId === portfolio && (isA || h.cantidad > 1e-9));
  const h = data.holdings.find((x) => x.id === holding);
  const portfolioName = data.portfolios.find((p) => p.id === portfolio)?.nombre ?? '';
  const productName = h?.nombre ?? asset?.nombre ?? '';

  const reset = () => {
    setStep(1); setHolding(null); setAsset(null); setImporte(''); setCantidad(''); setComision(''); setError(null); setDone(false);
  };

  if (done) {
    return <Done title={isA ? 'Aportación registrada' : 'Retirada registrada'}
      text={isA ? <>{productName}<br />en tu cartera <strong className="text-ink">{portfolioName}</strong></> : 'Calcularemos la ganancia o pérdida de esta venta para tu resumen fiscal.'}
      onAgain={reset} />;
  }

  const back = step > 1 ? () => { setError(null); setStep(step - 1); } : undefined;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col gap-5">
      <WizardHeader label={label} step={step} total={3} onBack={back} />

      {step === 1 ? (
        <>
          <StepTitle title="¿En qué cartera?" sub={isA ? '¿A qué objetivo va esta aportación?' : '¿De qué cartera sacas el dinero?'} />
          <PortfolioList portfolios={data.portfolios} holdings={data.holdings} value={portfolio} onChange={(id) => { setPortfolio(id); setHolding(null); }} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepTitle title="¿Qué producto?" sub={<>En tu cartera <strong className="text-ink">{portfolioName}</strong></>} />
          <HoldingList holdings={inPortfolio} value={holding} onChange={(id) => { setHolding(id); setAsset(null); }}
            empty={!isA ? <Alert tone="info">No hay productos con saldo en esta cartera.</Alert> : null} />
          {isA ? (
            <div className="flex flex-col gap-4 border-t border-line pt-4">
              <ProductPicker value={asset} onChange={(c) => { setAsset(c); if (c) setHolding(null); }}
                label={inPortfolio.length ? '¿Otro producto? Búscalo' : 'Busca tu primer producto'} />
              {asset ? <BrokerChips value={broker} onChange={setBroker} /> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepTitle title={isA ? '¿Cuánto aportas?' : '¿Cuánto retiras?'} />
          <div className={`flex flex-col gap-0.5 rounded-xl px-4 py-3 ${isA ? 'bg-brand-soft text-brand-dark' : 'bg-warn-bg text-warn-ink'}`}>
            <span className="font-semibold">{productName}</span>
            <span className="text-[13px]">{portfolioName}{h ? ` · valor actual ${eur(h.valor)}` : asset ? ` · ${broker}` : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" htmlFor="fecha"><Input id="fecha" type="date" value={fecha} max={data.today} onChange={(e) => setFecha(e.target.value)} /></Field>
            <Field label={isA ? 'Importe (€)' : 'Importe retirado (€)'} htmlFor="imp"><AmountInput id="imp" value={importe} onValueChange={setImporte} placeholder="300,00" /></Field>
            <Field label="Participaciones" htmlFor="part"><AmountInput id="part" value={cantidad} onValueChange={setCantidad} placeholder="Opcional" /></Field>
            <Field label="Comisión (€)" htmlFor="com"><AmountInput id="com" value={comision} onValueChange={setComision} placeholder="0,00" /></Field>
          </div>
          {!isA && h ? (
            <button type="button" className="self-start py-1 text-sm font-semibold text-brand"
              onClick={() => { setImporte(numEs(h.valor, 2, 2)); setCantidad(numEs(h.cantidad, 10)); }}>
              Retirarlo todo ({eur(h.valor)})
            </button>
          ) : null}
          <p className="text-[13px] leading-relaxed text-muted">
            {isA ? 'Si no pones las participaciones, las calculamos con el valor liquidativo de esa fecha.' : 'Restaremos este importe de tu capital aportado y calcularemos la plusvalía o minusvalía (FIFO).'}
          </p>
        </>
      ) : null}

      <div className="mt-auto flex flex-col gap-3">
        {error ? <Alert>{error}</Alert> : null}
        <Button type="button" disabled={pending || (step === 1 && !portfolio) || (step === 2 && !holding && !asset)}
          onClick={() => {
            setError(null);
            if (step < 3) { setStep(step + 1); return; }
            const imp = parseEsNumber(importe);
            if (!imp || imp <= 0) { setError('Indica un importe mayor que cero.'); return; }
            start(async () => {
              const r = await addMovement({
                tipo, portfolioId: portfolio!, holdingId: holding, asset: holding ? null : asset, broker,
                fecha, importe: imp, cantidad: parseEsNumber(cantidad), comision: parseEsNumber(comision),
              });
              if (r.ok) setDone(true); else setError(r.error ?? 'Algo ha fallado.');
            });
          }}>
          {pending ? 'Guardando…' : step < 3 ? 'Continuar' : isA ? 'Guardar aportación' : 'Guardar retirada'}
        </Button>
      </div>
    </div>
  );
}
