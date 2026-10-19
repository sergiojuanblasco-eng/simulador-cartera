# Kartera · todas tus inversiones, en un solo sitio

**kartera.pro** tiene dos caras dentro de un mismo proyecto:

- **Web pública (SEO, sin login):**
  - la landing en `/`;
  - el simulador de cartera (`/simulador-cartera`);
  - la calculadora de interés compuesto (`/interes-compuesto`);
  - las simulaciones SEO (`/simulacion/...`);
  - la lista de espera.
- **App privada (PWA instalable):**
  - carteras por objetivo, cada una con su **cartera objetivo** (% por producto), aportación mensual y simulación;
  - aportaciones, retiradas y rebalanceos;
  - importación desde brókeres;
  - métricas: TIR, rentabilidad por año, caída máxima, comisiones y comparativa con el MSCI World.

Beta privada: se entra con invitación y es gratis.

## Qué incluye

| Parte | Rutas |
|---|---|
| Web pública | `/` (landing para visitantes; con sesión, el panel), `/simulador-cartera`, `/interes-compuesto`, `/simulacion/[slug]`, `/sitemap.xml`, `/robots.txt` |
| Acceso | `/login`, `/registro` (con invitación crea la cuenta; sin ella apunta a la lista de espera), `/recuperar`, `/privacidad` |
| Inicio | Patrimonio con barra de objetivo o del próximo hito, aportado, ganancia, TIR, aportación media y racha, caída máxima, comisiones, objetivos, gráficas, distribución, hitos (1.000 €, 5.000 €, 10.000 €…), recordatorio mensual de saldos y filtro por cartera |
| Saldos (`/saldos`) | Cuentas, planes de pensiones, depósitos y lo que no tiene precio en internet: se apunta su valor (y, si se sabe, lo aportado) y se actualizan todos de una vez. La primera anotación «entra al panel» (no es dinero nuevo ni mercado); en una cuenta, los cambios de saldo son dinero que entra o sale |
| Mes (`/mes`) | Mes a mes con ‹ ›: lo que pusiste tú, lo que puso el mercado y lo nuevo en el panel, producto a producto, y filtro por cartera |
| Movimientos | Botón **+**: invertir según mi plan, aportación, retirada, rebalanceo (traspaso o venta/compra) y nueva cartera |
| Cartera (`/carteras/[id]`) | Cartera objetivo frente a la real, reparto de la aportación del mes (equilibrar o fijo), «Invertir ahora» que registra las compras, y simulación con datos históricos (plazo según el objetivo y probabilidad de llegar a la meta) |
| Importar | MyInvestor, Trade Republic, plantilla CSV/Excel e IA (también PDF), con revisión y detección de duplicados |
| Clasificación | Cada producto tiene **clase de activo** (renta variable, renta fija, monetario, materias primas, cripto, inmobiliario, mixto, otros; deducida y editable) y **vehículo** (fondo, ETF/ETC, acción, plan de pensiones, cripto directa, cuenta) |
| Análisis | Activos y ficha con el valor liquidativo, Rendimiento (por año, frente al índice, comisiones, FIFO para la renta). La rentabilidad (TIR, caída, por año) se mide sobre lo invertido: las cuentas no la diluyen; el «¿y si…?» solo compara lo comprado en el bróker |
| Más | Carteras, historial, exportar CSV, simulador, invitaciones y lista de espera (admin), borrar cuenta |

URLs de la versión anterior: `/dashboard` y `/onboarding` redirigen a `/`, y `/landing.html` redirige a `/`.

## Estructura

```
packages/core        Motor de cálculo (XIRR, FIFO, traspasos, TWR, drawdown…) con tests
apps/web             App Next.js 15: web pública + app privada
apps/web/src/kartera Simulador y calculadoras originales de Kartera (+ datos de 31 activos)
apps/web/public/landing.html  Landing original de kartera.pro (el «Avísame» ya guarda emails)
supabase/migrations  0001 esquema + seguridad · 0002 lista de espera · 0003 permisos · 0004 cartera objetivo · 0005 clase de activo · 0006 TER propio
```

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto **nuevo** en la región de la **Unión Europea** (Frankfurt o Irlanda).
   El Supabase de la versión anterior de Kartera tiene otras tablas (`profiles`, `positions`…) que chocan con el esquema nuevo.
2. En **SQL Editor**, ejecuta `supabase/instalar-todo.sql` (todas las migraciones; se puede repetir sin riesgo).
   Si ya lo tenías instalado, basta con la última migración nueva (p. ej. `20261019000007_valores_anotados.sql`, que incluye de la 0004 a la 0006).
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

## Datos de mercado (gratis por defecto)
- **Yahoo Finance** (API pública no oficial, gratis y sin clave): valor liquidativo diario de los fondos europeos
  (tickers «0P…»), ETFs y acciones con precio del día. Puede cambiar o limitar peticiones sin aviso.
- **CoinGecko** (gratis): cripto en euros, en vivo.
- **BCE (Frankfurter)**: tipos de cambio (los ETFs que cotizan en USD/GBP se pasan a euros).
- **EODHD** (opcional, de pago): si se pone `EODHD_API_KEY`, se usa primero (datos con licencia; recomendable
  si Kartera pasa a ser de pago).
- **TER**: catálogo verificado en `src/lib/market/ter-catalog.ts` + TER propio por posición (ficha del producto).
- Cuándo se actualiza: cada noche (cron) y al abrir la app (cripto cada 5 min, ETFs/acciones cada 15 min,
  fondos cada 6 h). Admin: «Más → Actualizar precios ahora» (también enlaza los productos importados).

## Rendimiento
- Región de los servidores: **Dublín (`dub1`, en `apps/web/vercel.json`)**, junto a la base de datos de Supabase
  (medido: ~15-35 ms por consulta frente a ~100-150 ms desde EE. UU.).
- Sesión con `getClaims` (sin viaje al servidor de Auth si el proyecto usa claves de firma asimétricas).
- Datos en dos tandas de consultas en paralelo; páginas de 1000 filas pedidas a la vez; cálculos memorizados por petición.
- Esqueleto de carga instantáneo al navegar (`(app)/loading.tsx`); precios en segundo plano tras cargar.

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
