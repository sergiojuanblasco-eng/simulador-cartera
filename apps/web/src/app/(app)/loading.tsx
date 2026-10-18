/** Mientras llega la pantalla: un esqueleto inmediato para que la app responda al toque. */
export default function Loading() {
  const bar = 'animate-pulse rounded-xl bg-subtle';
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-col gap-2">
        <div className={`${bar} h-4 w-24`} />
        <div className={`${bar} h-8 w-48`} />
      </div>
      <div className="h-40 animate-pulse rounded-[18px] bg-ink/90" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${bar} h-24`} />)}
      </div>
      <div className={`${bar} h-64`} />
    </div>
  );
}
