import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getPositions, getTargets, getHistory, saveMovement, updatePosition } from "../lib/backend";

const D = {
  bg: "#0d0b08", s1: "#161412", s2: "#1c1a17", s3: "#262420",
  t1: "#eef1f8", t2: "#a8adb8", t3: "#5c6170",
  border: "rgba(255,255,255,0.06)",
  accent: "#b5e834", accentDim: "rgba(181,232,52,0.1)",
  gain: "#5dca8a", gainDim: "rgba(93,202,138,0.12)",
  loss: "#e86060", lossDim: "rgba(232,96,96,0.12)",
  amber: "#fbbf24",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  serif: "'Instrument Serif',Georgia,serif",
};

const COLORS = ["#b5e834", "#4d9eff", "#f7931a", "#c084fc", "#fb923c", "#e86060", "#5dca8a", "#60a5fa"];
const fmt = n => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(n);
const fmtP = n => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export default function Dashboard({ go, session }) {
  const uid = session?.user?.id;
  const userName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split("@")[0] || "";

  const [positions, setPositions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [mov, setMov] = useState({ type: "buy", date: new Date().toISOString().slice(0, 10), asset_id: "", broker: "", amount: "", shares: "", price: "", commission: "", notes: "" });
  const [movSaving, setMovSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const refresh = async () => {
    const [pos, tgt, hist, { data: profile }] = await Promise.all([
      getPositions(uid),
      getTargets(uid),
      getHistory(uid),
      supabase.from("profiles").select("onboarding_done").eq("id", uid).single()
    ]);
    if (profile && !profile.onboarding_done && pos.length === 0) {
      setNeedsOnboarding(true);
    }
    setPositions(pos);
    setTargets(tgt);
    setHistory(hist);
    setLoading(false);
  };

  useEffect(() => { if (uid) refresh(); }, [uid]);

  if (loading) return <div style={{ background: D.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: D.t3, fontFamily: D.sans }}>Cargando...</div>;

  if (needsOnboarding) { go("/onboarding"); return null; }

  const totalValue = positions.reduce((s, p) => s + Number(p.current_value), 0);
  const totalInvested = positions.reduce((s, p) => s + Number(p.invested), 0);
  const totalGain = totalValue - totalInvested;
  const totalPct = totalInvested > 0 ? (totalGain / totalInvested * 100) : 0;

  const targetMap = {};
  targets.forEach(t => { targetMap[t.asset_id] = Number(t.weight); });

  const rebalData = positions.map((p, i) => {
    const val = Number(p.current_value), inv = Number(p.invested);
    const realW = totalValue > 0 ? (val / totalValue * 100) : 0;
    const tgtW = targetMap[p.asset_id] || 0;
    const gain = inv > 0 ? ((val - inv) / inv * 100) : 0;
    return { ...p, val, inv, realW, tgtW, diff: realW - tgtW, gain, color: COLORS[i % COLORS.length] };
  });

  const worstDev = rebalData.filter(r => r.tgtW > 0).sort((a, b) => a.diff - b.diff)[0] || null;
  const bestAsset = rebalData.length > 0 ? rebalData.reduce((best, r) => r.gain > best.gain ? r : best, rebalData[0]) : null;

  // Chart data
  const chartData = history.map(s => Number(s.total_value));
  const chartMin = chartData.length > 0 ? Math.min(...chartData) * 0.96 : 0;
  const chartMax = chartData.length > 0 ? Math.max(...chartData) * 1.01 : 100;
  const chartRange = chartMax - chartMin || 1;
  const chartW = 350, chartH = 110;
  const chartPts = chartData.map((v, i) => {
    const x = (i / (Math.max(chartData.length - 1, 1))) * chartW;
    const y = chartH - ((v - chartMin) / chartRange) * (chartH - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const chartLine = chartPts.length > 1 ? chartPts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ") : "";
  const chartArea = chartLine ? `${chartLine} L${chartW},${chartH} L0,${chartH} Z` : "";

  // Save movement
  const doSaveMov = async () => {
    if (!mov.asset_id || !mov.amount) return;
    setMovSaving(true);
    const updated = await saveMovement(uid, mov, positions);
    if (updated) setPositions(updated);
    setShowMov(false);
    setMov({ type: "buy", date: new Date().toISOString().slice(0, 10), asset_id: "", broker: "", amount: "", shares: "", price: "", commission: "", notes: "" });
    setMovSaving(false);
    setShowDetails(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); go("/"); };

  const inp = { width: "100%", padding: "12px 14px", background: D.s2, border: `1px solid ${D.border}`, borderRadius: 10, color: D.t1, fontSize: 15, fontFamily: D.sans, outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 10, color: D.t3, letterSpacing: "0.07em", display: "block", marginBottom: 7 };

  /* ── MOVEMENT MODAL ── */
  if (showMov) return (
    <div style={{ background: D.bg, minHeight: "100vh", fontFamily: D.sans, color: D.t1 }}>
      <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${D.border}` }}>
        <button onClick={() => { setShowMov(false); setShowDetails(false); }} style={{ background: "none", border: "none", color: D.t2, cursor: "pointer", display: "flex", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M14 18L7 11L14 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Registrar movimiento</div>
          <div style={{ fontSize: 11, color: D.t3, marginTop: 1 }}>Escribe el activo como tú lo llamas</div>
        </div>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, padding: 4, background: D.s2, borderRadius: 11, border: `1px solid ${D.border}` }}>
          {[["buy", "Compra"], ["sell", "Venta"], ["dividend", "Dividendo"]].map(([v, l]) => (
            <button key={v} onClick={() => setMov({ ...mov, type: v })} style={{ padding: 10, borderRadius: 8, fontFamily: "inherit", cursor: "pointer", fontSize: 13, fontWeight: 600, border: "none", background: mov.type === v ? (v === "buy" ? D.gain : v === "sell" ? D.loss : D.amber) : "transparent", color: mov.type === v ? D.bg : D.t3, transition: "all 0.18s" }}>{l}</button>
          ))}
        </div>
        <div><label style={lbl}>Activo</label><input value={mov.asset_id} onChange={e => setMov({ ...mov, asset_id: e.target.value })} placeholder='Ej. "MSCI World Vanguard", "Bitcoin"...' style={inp} /></div>
        <div><label style={lbl}>Broker</label><input value={mov.broker} onChange={e => setMov({ ...mov, broker: e.target.value })} placeholder='Ej. "MyInvestor", "Coinbase"...' style={inp} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label style={lbl}>Importe (€)</label><input type="number" value={mov.amount} onChange={e => setMov({ ...mov, amount: e.target.value })} placeholder="0.00" style={inp} /></div>
          <div><label style={lbl}>Fecha</label><input type="date" value={mov.date} onChange={e => setMov({ ...mov, date: e.target.value })} style={inp} /></div>
        </div>
        <button onClick={() => setShowDetails(!showDetails)} style={{ background: "none", border: "none", color: D.t3, fontSize: 12, cursor: "pointer", fontFamily: D.sans, textAlign: "left" }}>{showDetails ? "▲" : "▾"} Más detalles</button>
        {showDetails && <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label style={lbl}>Participaciones</label><input type="number" value={mov.shares} onChange={e => setMov({ ...mov, shares: e.target.value })} placeholder="0.00" style={inp} /></div>
            <div><label style={lbl}>Precio (€)</label><input type="number" value={mov.price} onChange={e => setMov({ ...mov, price: e.target.value })} placeholder="0.00" style={inp} /></div>
          </div>
          <div><label style={lbl}>Comisión</label><input type="number" value={mov.commission} onChange={e => setMov({ ...mov, commission: e.target.value })} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Notas</label><input value={mov.notes} onChange={e => setMov({ ...mov, notes: e.target.value })} style={inp} /></div>
        </div>}
        <button onClick={doSaveMov} disabled={movSaving || !mov.asset_id || !mov.amount} style={{ padding: 15, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, fontFamily: "inherit", background: D.accent, color: D.bg, opacity: (!mov.asset_id || !mov.amount) ? 0.4 : 1 }}>{movSaving ? "✓ Guardado" : "Guardar movimiento"}</button>
        <div style={{ fontSize: 11, color: D.t3, textAlign: "center", lineHeight: 1.6 }}>Kartera no se conecta a ningún banco. Solo tú introduces tus datos.</div>
      </div>
    </div>
  );

  /* ── EMPTY STATE ── */
  if (positions.length === 0) return (
    <div style={{ background: D.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: D.sans, color: D.t1, padding: 40 }}>
      <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em", marginBottom: 8 }}>0 <span style={{ fontSize: 24, fontWeight: 300, color: D.t3 }}>€</span></div>
      <div style={{ fontSize: 16, color: D.t3, marginBottom: 24 }}>No tienes posiciones registradas</div>
      <button onClick={() => setShowMov(true)} style={{ padding: "14px 32px", borderRadius: 12, border: "none", background: D.accent, color: D.bg, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: D.sans }}>Añadir primera posición</button>
      <button onClick={handleLogout} style={{ marginTop: 16, background: "none", border: "none", color: D.t3, fontSize: 12, cursor: "pointer", fontFamily: D.sans }}>Cerrar sesión</button>
    </div>
  );

  /* ── DASHBOARD ── */
  return (
    <div style={{ background: D.bg, minHeight: "100vh", fontFamily: D.sans, color: D.t1, paddingBottom: 90 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: D.t3 }}>{userName}</div>
          <button onClick={handleLogout} style={{ fontSize: 11, color: D.t3, background: "none", border: "none", cursor: "pointer", fontFamily: D.sans }}>Cerrar sesión</button>
        </div>
        <div style={{ fontSize: 11, color: D.t3, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Patrimonio total</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}>{fmt(Math.round(totalValue))}<span style={{ fontSize: 22, fontWeight: 300, color: D.t2, marginLeft: 4 }}>€</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: totalGain >= 0 ? D.gain : D.loss, background: totalGain >= 0 ? D.gainDim : D.lossDim, padding: "2px 8px", borderRadius: 5 }}>{fmtP(totalPct)}</span>
              <span style={{ fontSize: 13, color: totalGain >= 0 ? D.gain : D.loss, fontWeight: 500 }}>{totalGain >= 0 ? "+" : ""}{fmt(Math.round(totalGain))} €</span>
              <span style={{ fontSize: 12, color: D.t3 }}>desde el inicio</span>
            </div>
          </div>
        </div>
        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { label: "Aportado total", val: `${fmt(Math.round(totalInvested))} €`, sub: `${positions.length} activos` },
            { label: "Rentabilidad", val: fmtP(totalPct), sub: "total", c: totalGain >= 0 ? D.gain : D.loss },
            { label: "Mejor activo", val: bestAsset ? fmtP(bestAsset.gain) : "--", sub: bestAsset ? (bestAsset.asset_name || bestAsset.asset_id) : "", c: bestAsset && bestAsset.gain >= 0 ? D.gain : D.loss },
            { label: "Posiciones", val: `${positions.length}`, sub: "activos en cartera" },
          ].map(s => (
            <div key={s.label} style={{ padding: "12px 14px", background: D.s1, borderRadius: 10, border: `1px solid ${D.border}` }}>
              <div style={{ fontSize: 10, color: D.t3, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c || D.t1, letterSpacing: "-0.01em" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: D.t3, marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && <div style={{ padding: "0 20px 14px", borderBottom: `1px solid ${D.border}` }}>
        <div style={{ fontSize: 11, color: D.t3, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Evolución</div>
        <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
          <defs><linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={D.accent} stopOpacity="0.15" /><stop offset="85%" stopColor={D.accent} stopOpacity="0" /></linearGradient></defs>
          {chartArea && <path d={chartArea} fill="url(#dbGrad)" />}
          {chartLine && <path d={chartLine} fill="none" stroke={D.accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        </svg>
      </div>}

      {/* Allocation bar */}
      {rebalData.length > 0 && <div style={{ padding: "14px 20px", borderBottom: `1px solid ${D.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: D.t3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Distribución</span>
          <span style={{ fontSize: 11, color: D.t3 }}>Actual vs objetivo</span>
        </div>
        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
          {rebalData.map(r => <div key={r.id} style={{ flex: r.realW, background: r.color, transition: "flex 0.4s ease" }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 4 }}>
          {rebalData.map(r => <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: r.color }} />
            <span style={{ fontSize: 10, color: D.t3 }}>{(r.asset_name || r.asset_id).split(" ")[0]} {r.realW.toFixed(0)}%</span>
          </div>)}
        </div>
      </div>}

      {/* Rebalance alert */}
      {worstDev && Math.abs(worstDev.diff) > 2 && <div style={{ margin: "14px 20px", padding: "12px 14px", background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.16)", borderRadius: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: D.amber, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>Rebalanceo pendiente</div>
        {rebalData.filter(r => r.tgtW > 0 && Math.abs(r.diff) > 2).sort((a, b) => a.diff - b.diff).slice(0, 3).map(r => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, padding: "6px 8px", background: "rgba(255,255,255,0.02)", borderRadius: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.diff > 0 ? D.loss : D.gain }}>{r.diff > 0 ? "↓" : "↑"}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: D.t1 }}>{r.asset_name || r.asset_id}</div>
                <div style={{ fontSize: 10, color: D.t3 }}>{Math.abs(r.diff).toFixed(1)}% {r.diff > 0 ? "sobre objetivo" : "bajo objetivo"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>}

      {/* Positions */}
      <div style={{ padding: "14px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: D.t3, letterSpacing: "0.06em", textTransform: "uppercase" }}>Posiciones ({positions.length})</span>
          <button onClick={() => setShowMov(true)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 7, fontFamily: "inherit", cursor: "pointer", background: D.accent, color: D.bg, border: "none", fontWeight: 700 }}>+ Añadir</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rebalData.map(r => {
            const open = expanded === r.id;
            return <div key={r.id} onClick={() => setExpanded(open ? null : r.id)} style={{ padding: "14px 16px", background: D.s1, borderRadius: 10, border: `1px solid ${D.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: D.t1 }}>{r.asset_name || r.asset_id}</div>
                      <div style={{ fontSize: 10, color: D.t3, marginTop: 1 }}>{r.broker || ""}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(Math.round(r.val))} €</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: r.gain >= 0 ? D.gain : D.loss }}>{fmtP(r.gain)}</div>
                    </div>
                  </div>
                  {r.tgtW > 0 && <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 4, background: D.s3, borderRadius: 2, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(r.realW / Math.max(...rebalData.map(x => x.realW)) * 100, 100)}%`, background: r.color, borderRadius: 2 }} />
                      <div style={{ position: "absolute", top: -3, height: 10, width: 2, background: D.t3, left: `${r.tgtW / Math.max(...rebalData.map(x => x.realW)) * 100}%`, borderRadius: 1 }} />
                    </div>
                    <span style={{ fontSize: 10, color: D.t3, flexShrink: 0 }}>
                      {r.realW.toFixed(0)}% <span style={{ color: Math.abs(r.diff) > 1.5 ? (r.diff > 0 ? D.loss : D.gain) : D.t3 }}>
                        {r.diff > 0 ? "↑" : "↓"}{Math.abs(r.diff).toFixed(1)}%
                      </span>
                    </span>
                  </div>}
                </div>
              </div>
              {open && <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${D.border}`, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                  { l: "Aportado", v: `${fmt(Math.round(r.inv))} €` },
                  { l: "Ganancia", v: `${r.gain >= 0 ? "+" : ""}${fmt(Math.round(r.val - r.inv))} €`, c: r.gain >= 0 ? D.gain : D.loss },
                  { l: "Objetivo", v: r.tgtW > 0 ? `${r.tgtW}%` : "—" },
                ].map(x => <div key={x.l}><div style={{ fontSize: 10, color: D.t3, marginBottom: 3 }}>{x.l}</div><div style={{ fontSize: 13, fontWeight: 600, color: x.c || D.t1 }}>{x.v}</div></div>)}
              </div>}
            </div>;
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(13,11,8,0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${D.border}`, padding: "10px 0 26px", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 200 }}>
        <button onClick={() => go("/dashboard")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 24px", color: D.accent, fontFamily: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="11" width="3.5" height="6" rx="1" fill="currentColor" opacity="0.5" /><rect x="8.25" y="7" width="3.5" height="10" rx="1" fill="currentColor" opacity="0.7" /><rect x="13.5" y="3" width="3.5" height="14" rx="1" fill="currentColor" /></svg>
          <span style={{ fontSize: 10, fontWeight: 600 }}>Cartera</span>
        </button>
        <button onClick={() => setShowMov(true)} style={{ width: 52, height: 52, borderRadius: "50%", background: D.accent, color: D.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(181,232,52,0.3)", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
        <button onClick={() => go("/simulador-cartera")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 24px", color: D.t3, fontFamily: "inherit" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M7 7.5h6M7 11h3M7 14h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 10, fontWeight: 400 }}>Simulador</span>
        </button>
      </div>
    </div>
  );
}
