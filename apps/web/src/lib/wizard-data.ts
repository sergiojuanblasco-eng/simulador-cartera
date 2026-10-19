import 'server-only';
import { requireUser } from '@/lib/auth';
import { compute, loadUserData } from '@/lib/data';
import { isValorAnotado } from '@/lib/db';

export interface WizardHolding {
  id: string;
  portfolioId: string;
  nombre: string;
  broker: string;
  valor: number;
  cantidad: number;
}

export interface WizardData {
  portfolios: { id: string; nombre: string }[];
  holdings: WizardHolding[];
  today: string;
}

export async function loadWizardData(): Promise<WizardData> {
  const { supabase } = await requireUser();
  const data = await loadUserData(supabase);
  const result = compute(data);
  const pos = new Map(result.positions.map((p) => [p.holdingId, p]));
  const cuentas = new Map(data.accounts.map((a) => [a.id, a.nombre]));
  return {
    portfolios: data.portfolios.map((p) => ({ id: p.id, nombre: p.nombre })),
    // Las cuentas, planes y depósitos anotados a mano no se mueven con aportaciones ni rebalanceos
    holdings: data.holdings.filter((h) => !isValorAnotado(h.asset)).map((h) => ({
      id: h.id,
      portfolioId: h.portfolio_id,
      nombre: h.asset.nombre,
      broker: cuentas.get(h.account_id) ?? '',
      valor: pos.get(h.id)?.valor ?? 0,
      cantidad: pos.get(h.id)?.cantidad ?? 0,
    })),
    today: data.today,
  };
}
