# Kartera · todas tus inversiones, en un solo sitio

**kartera.pro** tiene dos caras dentro de un mismo proyecto:

- **Web pública (SEO, sin login):**
  - la landing en `/`;
  - el simulador de cartera (`/simulador-cartera`);
  - la calculadora de interés compuesto (`/interes-compuesto`);
  - las simulaciones SEO (`/simulacion/...`);
  - la lista de espera.
- **App privada (PWA instalable):**
  - carteras por objetivo;
  - aportaciones, retiradas y rebalanceos;
  - importación desde brókeres;
  - métricas: TIR, rentabilidad por año, caída máxima, comisiones y comparativa con el MSCI World.

Beta privada: se entra con invitación y es gratis.

## Qué incluye

| Parte | Rutas |
|---|---|
| Web pública | `/` (landing para visitantes; con sesión, el panel), `/simulador-cartera`, `/interes-compuesto`, `/simulacion/[slug]`, `/sitemap.xml`, `/robots.txt` |
| Acceso | `/login`, `/registro` (con invitación crea la cuenta; sin ella apunta a la lista de espera), `/recuperar`, `/privacidad` |
| Inicio | Patrimonio, aportado, ganancia, TIR, aportación media y racha, caída máxima, comisiones, gráficas, distribución, objetivos y filtro por cartera |
| Movimientos | Botón **+**: aportación, retirada, rebalanceo (traspaso o venta/compra) y nueva cartera |
| Importar | MyInvestor, Trade Republic, plantilla CSV/Excel e IA (también PDF), con revisión y detección de duplicados |
| Análisis | Activos y ficha con el valor liquidativo, Rendimiento (por año, frente al índice, comisiones, FIFO para la renta) y Mes |
| Más | Carteras, historial, exportar CSV, simulador, invitaciones y lista de espera (admin), borrar cuenta |

URLs de la versión anterior: `/dashboard` y `/onboarding` redirigen a `/`, y `/landing.html` redirige a `/`.

## Estructura

```
packages/core        Motor de cálculo (XIRR, FIFO, traspasos, TWR, drawdown…) con tests
apps/web             App Next.js 15: web pública + app privada
apps/web/src/kartera Simulador y calculadoras originales de Kartera (+ datos de 31 activos)
apps/web/public/landing.html  Landing original de kartera.pro (el «Avísame» ya guarda emails)
supabase/migrations  0001 esquema + seguridad · 0002 lista de espera
```

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto **nuevo** en la región **Frankfurt**.
   El Supabase de la versión anterior de Kartera tiene otras tablas (`profiles`, `positions`…) que chocan con el esquema nuevo.
2. En **SQL Editor**, ejecuta en orden las dos migraciones de `supabase/migrations/`.
3. En **Authentication → Sign In / Providers**, desactiva **«Allow new users to sign up»**.
4. En **Authentication → URL Configuration**:
   - Site URL: `https://www.kartera.pro`
   - Redirect URLs: `https://www.kartera.pro/auth/callback`
5. En **Project Settings → API**, copia la URL, la clave pública y la clave de servicio.

### 2. Vercel y el dominio kartera.pro
kartera.pro ya está en Vercel (proyecto *simulador-cartera*), así que **no hay que tocar el DNS**.
- **Opción A (recomendada): reutilizar el mismo proyecto.**
  1. Sube este código al repositorio `simulador-cartera`, primero en una rama.
  2. En Vercel, ve a **Settings → General → Root Directory** y pon `apps/web`.
  3. Añade las variables de entorno y despliega. El dominio sigue conectado.
- **Opción B: proyecto nuevo.**
  1. Quita kartera.pro del proyecto antiguo (**Settings → Domains**).
  2. Añádelo al proyecto nuevo, con Root Directory `apps/web`.

Variables de entorno (ver `apps/web/.env.example`):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio |
| `NEXT_PUBLIC_SITE_URL` | `https://www.kartera.pro` |
| `ADMIN_EMAILS` | Tu email |
| `CRON_SECRET` | Una cadena larga aleatoria |
| `EODHD_API_KEY` | Clave de EODHD (precios de fondos y ETFs) |
| `ANTHROPIC_API_KEY` | Opcional: importador con IA |

### 3. Tu cuenta
1. Ejecuta `supabase/seed.sql` en el SQL Editor.
2. Abre `https://www.kartera.pro/registro?invitacion=<código>`.
3. A partir de ahí, invita desde **Más → Invitaciones y lista de espera**.

### 4. En el móvil
- **iPhone (Safari):** Compartir → «Añadir a pantalla de inicio».
- **Android (Chrome):** menú → «Instalar aplicación».

## Desarrollo local

```bash
npm install
cp apps/web/.env.example apps/web/.env.local   # rellena las claves
npm run dev                                     # http://localhost:3000
npm test && npm run typecheck
```

## Decisiones técnicas clave
- Los importes de dinero se guardan como `NUMERIC` en la base de datos y se calculan con `decimal.js`; nunca con decimales flotantes.
- Las posiciones no se guardan: se derivan de las operaciones (`v_positions`).
- Hay RLS en todas las tablas, más triggers que impiden mezclar datos de dos usuarios.
- La lista de espera solo la lee el servidor.
- TIR (XIRR) con Newton y bisección de respaldo. No se muestra con menos de 90 días de historia.
- La rentabilidad anual y la caída máxima se ponderan en el tiempo (TWR); FIFO para lo fiscal.
- Los traspasos no tributan y conservan el coste original.
- La landing y las herramientas públicas son indexables; la app privada no (`robots`).

## Pendiente
- Confirmar el formato de los extractos de MyInvestor y Trade Republic con archivos reales.
- Validar la cobertura de EODHD con los ISIN reales.
- Ajustar los textos de la landing a la beta: el botón dice «Crear cuenta gratis» y lleva a la lista de espera.
- Más adelante: app nativa (Expo), Stripe y textos legales revisados.
