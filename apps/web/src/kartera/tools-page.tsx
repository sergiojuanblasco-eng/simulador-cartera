import { AppShell } from '@/components/app-shell';
import { isLoggedIn } from './session';
import { ToolsClient } from './tools-client';

/**
 * Herramientas públicas (simulador, interés compuesto, simulaciones).
 * Sin sesión: la web pública de siempre. Con sesión: dentro del menú de la app.
 */
export async function ToolsPage({ path, slug }: { path: string; slug?: string | null }) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) return <ToolsClient path={path} slug={slug} loggedIn={false} />;
  return (
    <AppShell>
      <ToolsClient path={path} slug={slug} loggedIn embedded />
    </AppShell>
  );
}
