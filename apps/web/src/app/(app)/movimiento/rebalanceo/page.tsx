import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadWizardData } from '@/lib/wizard-data';
import { RebalanceWizard } from './wizard';

export const metadata: Metadata = { title: 'Rebalanceo' };

export default async function RebalanceoPage() {
  const data = await loadWizardData();
  if (data.portfolios.length === 0) redirect('/carteras/nueva?primera=1');
  return <RebalanceWizard data={data} />;
}
