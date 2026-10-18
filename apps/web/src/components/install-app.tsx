'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Plataforma = 'instalada' | 'android' | 'ios' | 'ios-otro' | 'escritorio';

function detectar(): Plataforma {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return 'instalada';
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-otro' : 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'escritorio';
}

/** «Instala Kartera en tu móvil»: botón directo en Android/Chrome y pasos en iPhone. */
export function InstallApp({ compact = false }: { compact?: boolean }) {
  const [plat, setPlat] = useState<Plataforma | null>(null);
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    setPlat(detectar());
    try { setOculto(compact && localStorage.getItem('kartera_instalar_oculto') === '1'); } catch { /* sin almacenamiento */ }
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    const onInstalled = () => setPlat('instalada');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, [compact]);

  if (!plat || plat === 'instalada' || oculto) return null;
  // En Inicio solo se sugiere en el móvil
  if (compact && plat === 'escritorio') return null;

  const cerrar = () => { setOculto(true); try { localStorage.setItem('kartera_instalar_oculto', '1'); } catch { /* nada */ } };

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">Instala Kartera en tu móvil</span>
          <span className="text-[13px] text-muted">Se abre como una app, a pantalla completa y con su icono.</span>
        </div>
        {compact ? <button type="button" onClick={cerrar} aria-label="Ocultar" className="-mt-1 -mr-1 flex h-9 w-9 items-center justify-center text-muted">✕</button> : null}
      </div>
      {evt ? (
        <Button type="button" onClick={async () => { await evt.prompt(); const r = await evt.userChoice; if (r.outcome === 'accepted') setPlat('instalada'); setEvt(null); }}>
          Instalar
        </Button>
      ) : plat === 'ios' ? (
        <ol className="list-decimal pl-5 text-sm leading-relaxed text-muted-2">
          <li>Pulsa el botón <strong className="text-ink">Compartir</strong> de Safari (el cuadrado con la flecha hacia arriba).</li>
          <li>Elige <strong className="text-ink">«Añadir a pantalla de inicio»</strong> y pulsa <strong className="text-ink">Añadir</strong>.</li>
        </ol>
      ) : plat === 'ios-otro' ? (
        <p className="text-sm text-muted-2">En iPhone se instala desde <strong className="text-ink">Safari</strong>: abre kartera.pro en Safari, pulsa Compartir y «Añadir a pantalla de inicio».</p>
      ) : plat === 'android' ? (
        <p className="text-sm text-muted-2">En Chrome, abre el menú <strong className="text-ink">⋮</strong> y elige <strong className="text-ink">«Instalar aplicación»</strong> (o «Añadir a pantalla de inicio»).</p>
      ) : (
        <p className="text-sm text-muted-2">Abre <strong className="text-ink">kartera.pro</strong> en el móvil e inicia sesión: en iPhone, Safari → Compartir → «Añadir a pantalla de inicio»; en Android, Chrome → ⋮ → «Instalar aplicación».</p>
      )}
    </div>
  );
}
