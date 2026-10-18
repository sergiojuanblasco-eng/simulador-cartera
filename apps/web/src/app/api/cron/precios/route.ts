import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env';
import { runDailyIngest } from '@/lib/market/ingest';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Proceso nocturno de precios. Vercel Cron envía "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: NextRequest) {
  const secret = serverEnv.cronSecret();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const summary = await runDailyIngest();
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
