import type { Metadata } from 'next';
import { BackLink, H1 } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacidad' };

/** Texto base. Revísalo con un profesional antes del lanzamiento público. */
export default function PrivacidadPage() {
  return (
    <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-muted-2">
      <BackLink href="/login" />
      <H1>Política de privacidad</H1>
      <p><strong>Responsable:</strong> [TU NOMBRE O EMPRESA] · [EMAIL DE CONTACTO].</p>
      <p><strong>Qué datos guardamos:</strong> tu nombre, tu email y las operaciones de inversión que registras o importas. No pedimos ni guardamos claves de tus bancos o brókeres.</p>
      <p><strong>Para qué:</strong> únicamente para calcular y mostrarte tu patrimonio. No vendemos ni cedemos tus datos.</p>
      <p><strong>Dónde:</strong> en servidores de la Unión Europea (Supabase, región Frankfurt). Cada cuenta está aislada: nadie más puede ver tus datos.</p>
      <p><strong>Tus derechos:</strong> puedes descargar tus datos y borrar tu cuenta en cualquier momento desde «Más». También puedes escribirnos para acceso, rectificación o supresión.</p>
      <p><strong>Aviso:</strong> Kartera muestra información; no es asesoramiento financiero ni recomienda productos.</p>
    </div>
  );
}
