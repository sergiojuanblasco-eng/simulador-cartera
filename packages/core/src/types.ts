/**
 * Tipos de entrada y salida del motor de cálculo.
 *
 * Convenciones:
 *  - Fechas como texto ISO 'YYYY-MM-DD' (sin horas ni zonas: los mercados cierran por día).
 *  - Importes siempre positivos; el sentido lo da el tipo de operación.
 *  - `fxEur` = unidades de la moneda de la operación por 1 EUR ese día (1 si es EUR).
 *  - Valores numéricos de entrada aceptan number o string (Postgres NUMERIC llega como string).
 */

export type Num = number | string;

export type AssetType =
  | 'fondo' | 'etf' | 'accion' | 'cripto' | 'monetario' | 'plan_pensiones' | 'efectivo' | 'deposito' | 'otro';

export type TxType =
  | 'compra' | 'venta' | 'traspaso_salida' | 'traspaso_entrada' | 'dividendo' | 'comision';

export interface CoreHolding {
  id: string;
  assetId: string;
  portfolioId: string;
  accountId: string;
  nombre: string;
  tipo: AssetType;
  moneda: string;
  /** TER como fracción (0.0012 = 0,12 %). */
  ter?: number | null;
  /** Clase de activo (rv, rf, monetario, materias_primas, cripto, inmobiliario, mixto, otros). */
  clase?: string | null;
  /**
   * Valor anotado a mano (cuentas, planes de pensiones, depósitos…): su valor sale de las
   * valoraciones que apunta la persona, no de operaciones ni precios de mercado.
   */
  manual?: boolean;
}

/**
 * Valor de un producto anotado a mano en una fecha.
 * `aportado` = dinero puesto en total hasta esa fecha (si se sabe). Sin él, todo cambio de
 * valor se toma como dinero que entra o sale (una cuenta corriente no "rinde").
 */
export interface Valuation {
  fecha: string;
  valor: Num;
  aportado?: Num | null;
}

export interface CoreTx {
  id: string;
  holdingId: string;
  tipo: TxType;
  fecha: string;
  cantidad: Num;
  importe: Num;
  comision?: Num;
  fxEur?: Num;
  grupoId?: string | null;
}

export interface PricePoint {
  fecha: string;
  precio: Num;
}

export interface ComputeInput {
  holdings: CoreHolding[];
  txs: CoreTx[];
  /** Precios por assetId, en la moneda del activo. No hace falta que estén ordenados. */
  prices: Record<string, PricePoint[]>;
  /** Tipos de cambio por moneda (unidades por 1 EUR). EUR no hace falta. */
  fx?: Record<string, PricePoint[]>;
  /** Fecha de valoración (hoy). */
  today: string;
  /** Si se indica, solo se analizan estas posiciones (p. ej. una cartera). */
  scope?: Iterable<string>;
  /** Valores anotados a mano, por posición (solo cuentan en posiciones con `manual`). */
  valuations?: Record<string, Valuation[]>;
}

export interface DailyPoint {
  fecha: string;
  /** Valor de mercado en EUR al cierre del día. */
  valor: number;
  /** Capital aportado neto acumulado (aportaciones − retiradas). */
  aportado: number;
  /** Flujo externo neto del día (+ entra dinero, − sale). Incluye `nuevo`. */
  flujo: number;
  /**
   * Parte del flujo que no es dinero nuevo: lo que ya tenías y empiezas a seguir ese día
   * (p. ej. el saldo de una cuenta la primera vez que lo anotas).
   */
  nuevo: number;
  /** Comisiones de compra/venta/custodia pagadas ese día (EUR). */
  comision: number;
  /** Valor por posición. */
  porHolding: Record<string, number>;
}

export interface PositionResult {
  holdingId: string;
  cantidad: number;
  /** Último precio conocido en EUR. */
  precio: number;
  fechaPrecio: string | null;
  valor: number;
  /** Coste de adquisición FIFO de las participaciones vivas (EUR, con comisiones). */
  coste: number;
  ganancia: number;
  gananciaPct: number | null;
  /** Precio medio de coste por participación. */
  precioMedio: number | null;
  /** Comisiones de compra/venta pagadas en este producto (EUR, histórico). */
  comisiones: number;
  /** Valor anotado a mano: `fechaPrecio` es la fecha del último valor y `coste` lo aportado. */
  manual?: boolean;
  /** Solo en valores anotados: se conoce lo aportado (si no, no hay ganancia que calcular). */
  conAportado?: boolean;
}

/** Dinero que entra o sale de un producto (para el detalle del mes). */
export interface HoldingFlow {
  fecha: string;
  holdingId: string;
  /** Dinero tuyo: + aportas, − retiras (incluye comisiones de compra). */
  aportado: number;
  /** Traspasos entre productos: + entra, − sale. */
  traspaso: number;
  /** Valor que empiezas a seguir ese día (primera anotación). */
  nuevo: number;
  comision: number;
}

export interface RealizedGain {
  txId: string;
  holdingId: string;
  fecha: string;
  importe: number;
  coste: number;
  ganancia: number;
}

export interface YearReturn {
  anio: number;
  rentabilidad: number;
  /** true si el año no está completo (primer año o año en curso). */
  parcial: boolean;
}

export interface MonthSummary {
  /** 'YYYY-MM' */
  mes: string;
  /** Dinero nuevo neto (incluye lo pagado en comisiones). */
  aportado: number;
  /** Lo que ya tenías y empiezas a seguir este mes (no es dinero nuevo ni mercado). */
  nuevo: number;
  /** Ganancia o pérdida del MERCADO (sin comisiones). */
  ganancia: number;
  /** Comisiones de compra/venta/custodia pagadas en el mes. */
  comisiones: number;
  valorFin: number;
}

export interface Metrics {
  valor: number;
  aportado: number;
  ganancia: number;
  gananciaPct: number | null;
  /** TIR anualizada (XIRR). null si hay menos de ~3 meses de historia o no converge. */
  tir: number | null;
  /** Peor caída desde máximos de la rentabilidad (no del valor), como fracción negativa. */
  maxDrawdown: number;
  aportacionMediaMensual: number;
  /** Meses consecutivos con al menos una aportación. */
  racha: number;
  /** TER medio ponderado por valor. null si no hay datos de TER. */
  terMedio: number | null;
  costeAnual: number;
  costeMensual: number;
  mesActual: { aportado: number; ganancia: number; comisiones: number };
  /** Comisiones de compra/venta/custodia pagadas en total (EUR). */
  comisionesPagadas: number;
  comisionesPorAnio: { anio: number; importe: number }[];
  rentabilidadAnual: YearReturn[];
}

export interface ComputeResult {
  series: DailyPoint[];
  positions: PositionResult[];
  realized: RealizedGain[];
  months: MonthSummary[];
  metrics: Metrics;
  /** Flujos externos por fecha (para XIRR). + entra dinero. Incluye lo que entra al panel. */
  flows: { fecha: string; importe: number }[];
  /** Solo las compras y ventas de productos con precio de mercado (para el «¿y si…?»). */
  flowsMercado: { fecha: string; importe: number }[];
  /** Entradas y salidas de dinero por producto. */
  holdingFlows: HoldingFlow[];
  warnings: string[];
}
