import { NextResponse, type NextRequest } from 'next/server';
import { joinWaitlist } from '@/lib/waitlist';

/** Formulario «Avísame» de la landing. Acepta JSON o formulario. */
export async function POST(request: NextRequest) {
  if (Number(request.headers.get('content-length') ?? 0) > 2000) {
    return NextResponse.json({ error: 'Petición demasiado grande' }, { status: 413 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 });
  }
  // Campo trampa para bots: si viene relleno, se ignora en silencio.
  if (body.web) return NextResponse.json({ ok: true });
  const r = await joinWaitlist(body.email, body.origen);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
