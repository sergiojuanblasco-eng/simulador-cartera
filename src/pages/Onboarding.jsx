import { useState } from "react";
import { updateProfile, saveTargets, addPosition } from "../lib/backend";

const D = {
  bg: "#0d0b08", s1: "#161412", s2: "#1c1a17",
  t1: "#eef1f8", t2: "#a8adb8", t3: "#5c6170",
  border: "rgba(255,255,255,0.06)",
  accent: "#b5e834", accentDim: "rgba(181,232,52,0.1)",
  gain: "#5dca8a",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  serif: "'Instrument Serif',Georgia,serif",
};

const PROFILES = [
  { label: "Conservador", desc: "Prefiero ganar poco pero no perder casi nunca" },
  { label: "Moderado", desc: "Acepto caídas temporales a cambio de crecimiento" },
  { label: "Agresivo", desc: "Busco máxima rentabilidad, tolero caídas fuertes" },
  { label: "Muy agresivo", desc: "Acepto riesgo extremo por altos retornos" },
];

const TEMPLATES = {
  0: [{ id: "Bonos Global", w: 60 }, { id: "MSCI World", w: 30 }, { id: "Oro", w: 10 }],
  1: [{ id: "MSCI World", w: 60 }, { id: "Bonos Global", w: 30 }, { id: "Oro", w: 10 }],
  2: [{ id: "MSCI World", w: 80 }, { id: "Bitcoin", w: 10 }, { id: "Oro", w: 10 }],
};

const inp = {
  width: "100%", padding: "14px 16px", background: D.s2,
  border: `1px solid ${D.border}`, borderRadius: 12,
  color: D.t1, fontSize: 15, fontFamily: D.sans, outline: "none", boxSizing: "border-box"
};

export default function Onboarding({ go, session }) {
  const uid = session?.user?.id;
  const [step, setStep] = useState(1);
  const [risk, setRisk] = useState(null);
  const [tpl, setTpl] = useState(null);
  const [targets, setTargets] = useState([]);
  const [customAsset, setCustomAsset] = useState("");
  const [customWeight, setCustomWeight] = useState("");
  const [positions, setPositions] = useState([]);
  const [pos, setPos] = useState({ asset_id: "", broker: "", invested: "", value: "" });
  const [saving, setSaving] = useState(false);

  const totalWeight = targets.reduce((s, t) => s + t.w, 0);

  const selectTpl = (i) => {
    if (i === 3) { setTpl(3); setTargets([]); return; }
    setTpl(i);
    setTargets(TEMPLATES[i].map(t => ({ ...t })));
  };

  const addCustomTarget = () => {
    if (!customAsset || !customWeight) return;
    setTargets([...targets, { id: customAsset, w: Number(customWeight) }]);
    setCustomAsset("");
    setCustomWeight("");
  };

  const removeTarget = (i) => setTargets(targets.filter((_, j) => j !== i));

  const addPos = () => {
    if (!pos.asset_id || !pos.invested || !pos.value) return;
    setPositions([...positions, { ...pos }]);
    setPos({ asset_id: "", broker: "", invested: "", value: "" });
  };

  const finish = async () => {
    setSaving(true);
    if (risk !== null) await updateProfile(uid, { risk_profile: risk });
    if (targets.length > 0) await saveTargets(uid, targets.map(t => ({ asset_id: t.id, weight: t.w })));
    for (const p of positions) {
      await addPosition(uid, { asset_id: p.asset_id, broker: p.broker, invested: Number(p.invested), current_value: Number(p.value) });
    }
    await updateProfile(uid, { onboarding_done: true });
    go("/dashboard");
  };

  const progress = (step / 3) * 100;
  const gain = pos.invested && pos.value ? Number(pos.value) - Number(pos.invested) : null;

  return (
    <div style={{ background: D.bg, minHeight: "100vh", fontFamily: D.sans, color: D.t1 }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: D.s2 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: D.accent, transition: "width 0.3s" }} />
      </div>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "32px 24px" }}>

        {/* STEP 1 — Risk profile */}
        {step === 1 && <>
          <div style={{ fontSize: 12, color: D.t3, marginBottom: 8 }}>Paso 1 de 3</div>
          <h2 style={{ fontFamily: D.serif, fontSize: 26, fontWeight: 400, marginBottom: 6 }}>¿Cómo te defines como inversor?</h2>
          <p style={{ fontSize: 14, color: D.t3, marginBottom: 28 }}>Esto nos ayuda a personalizar tu análisis. Puedes cambiarlo después.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PROFILES.map((p, i) => (
              <div key={i} onClick={() => setRisk(i)} style={{
                padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${risk === i ? D.accent : D.border}`,
                background: risk === i ? D.accentDim : D.s1,
                transition: "all 0.15s"
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: D.t1, marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontSize: 13, color: D.t3 }}>{p.desc}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setStep(2)} disabled={risk === null} style={{
            width: "100%", padding: 15, borderRadius: 12, border: "none", marginTop: 28,
            background: D.accent, color: D.bg, fontSize: 15, fontWeight: 700,
            fontFamily: D.sans, cursor: "pointer", opacity: risk === null ? 0.4 : 1
          }}>Siguiente</button>
        </>}

        {/* STEP 2 — Target portfolio */}
        {step === 2 && <>
          <div style={{ fontSize: 12, color: D.t3, marginBottom: 8 }}>Paso 2 de 3</div>
          <h2 style={{ fontFamily: D.serif, fontSize: 26, fontWeight: 400, marginBottom: 6 }}>¿Cómo quieres distribuir tu cartera?</h2>
          <p style={{ fontSize: 14, color: D.t3, marginBottom: 28 }}>Esto nos permite avisarte cuándo rebalancear.</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {["Conservadora", "Equilibrada", "Agresiva", "Personalizada"].map((label, i) => (
              <div key={i} onClick={() => selectTpl(i)} style={{
                padding: "14px 12px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                border: `1.5px solid ${tpl === i ? D.accent : D.border}`,
                background: tpl === i ? D.accentDim : D.s1
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: D.t1 }}>{label}</div>
              </div>
            ))}
          </div>

          {targets.length > 0 && <div style={{ background: D.s1, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${D.border}` }}>
            {targets.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < targets.length - 1 ? `1px solid ${D.border}` : "none" }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.id}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: D.accent }}>{t.w}%</span>
                  <span onClick={() => removeTarget(i)} style={{ fontSize: 16, color: D.t3, cursor: "pointer" }}>✕</span>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: totalWeight === 100 ? D.gain : "#e86060", marginTop: 8, fontWeight: 600 }}>
              Total: {totalWeight}% {totalWeight === 100 ? "✓" : "(debe sumar 100%)"}
            </div>
          </div>}

          {tpl === 3 && <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input placeholder="Activo" value={customAsset} onChange={e => setCustomAsset(e.target.value)} style={{ ...inp, flex: 2 }} />
            <input type="number" placeholder="%" value={customWeight} onChange={e => setCustomWeight(e.target.value)} style={{ ...inp, flex: 1 }} />
            <button onClick={addCustomTarget} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: D.accent, color: D.bg, fontWeight: 700, cursor: "pointer", fontSize: 16 }}>+</button>
          </div>}

          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: 15, borderRadius: 12, border: `1px solid ${D.border}`, background: "transparent", color: D.t2, fontSize: 15, fontWeight: 600, fontFamily: D.sans, cursor: "pointer" }}>Anterior</button>
            <button onClick={() => setStep(3)} disabled={totalWeight !== 100 && targets.length > 0} style={{
              flex: 1, padding: 15, borderRadius: 12, border: "none",
              background: D.accent, color: D.bg, fontSize: 15, fontWeight: 700,
              fontFamily: D.sans, cursor: "pointer", opacity: (targets.length > 0 && totalWeight !== 100) ? 0.4 : 1
            }}>Siguiente</button>
          </div>

          <div onClick={() => setStep(3)} style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: D.t3, cursor: "pointer" }}>Saltar este paso →</div>
        </>}

        {/* STEP 3 — First positions */}
        {step === 3 && <>
          <div style={{ fontSize: 12, color: D.t3, marginBottom: 8 }}>Paso 3 de 3</div>
          <h2 style={{ fontFamily: D.serif, fontSize: 26, fontWeight: 400, marginBottom: 6 }}>Registra tu primera inversión</h2>
          <p style={{ fontSize: 14, color: D.t3, marginBottom: 28 }}>Mira tu app del broker y copia los datos. 10 segundos.</p>

          {positions.length > 0 && <div style={{ background: D.s1, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${D.border}` }}>
            {positions.map((p, i) => {
              const g = Number(p.value) - Number(p.invested);
              const pct = Number(p.invested) > 0 ? (g / Number(p.invested) * 100) : 0;
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < positions.length - 1 ? `1px solid ${D.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.asset_id}</div>
                    <div style={{ fontSize: 11, color: D.t3 }}>{p.broker}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: g >= 0 ? D.gain : "#e86060" }}>
                    {g >= 0 ? "+" : ""}{g.toFixed(0)}€ ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input placeholder='Activo (ej: "MSCI World", "Bitcoin"...)' value={pos.asset_id} onChange={e => setPos({ ...pos, asset_id: e.target.value })} style={inp} />
            <input placeholder='Broker (ej: "MyInvestor", "Degiro"...)' value={pos.broker} onChange={e => setPos({ ...pos, broker: e.target.value })} style={inp} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input type="number" placeholder="Total invertido (€)" value={pos.invested} onChange={e => setPos({ ...pos, invested: e.target.value })} style={inp} />
              <input type="number" placeholder="Valor actual (€)" value={pos.value} onChange={e => setPos({ ...pos, value: e.target.value })} style={inp} />
            </div>
          </div>

          {gain !== null && <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, fontWeight: 600, color: gain >= 0 ? D.gain : "#e86060" }}>
            Ganancia: {gain >= 0 ? "+" : ""}{gain.toFixed(0)}€ ({Number(pos.invested) > 0 ? ((gain / Number(pos.invested)) * 100).toFixed(1) : "0"}%)
          </div>}

          <button onClick={addPos} disabled={!pos.asset_id || !pos.invested || !pos.value} style={{
            width: "100%", padding: 14, borderRadius: 12, border: `1px solid ${D.border}`,
            background: D.s1, color: D.t1, fontSize: 14, fontWeight: 600, marginTop: 16,
            fontFamily: D.sans, cursor: "pointer", opacity: (!pos.asset_id || !pos.invested || !pos.value) ? 0.4 : 1
          }}>Añadir posición</button>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: 15, borderRadius: 12, border: `1px solid ${D.border}`, background: "transparent", color: D.t2, fontSize: 15, fontWeight: 600, fontFamily: D.sans, cursor: "pointer" }}>Anterior</button>
            <button onClick={finish} disabled={saving || positions.length === 0} style={{
              flex: 1, padding: 15, borderRadius: 12, border: "none",
              background: D.accent, color: D.bg, fontSize: 15, fontWeight: 700,
              fontFamily: D.sans, cursor: "pointer", opacity: positions.length === 0 ? 0.4 : 1
            }}>{saving ? "Guardando..." : "Ir al dashboard →"}</button>
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: D.t3, lineHeight: 1.6 }}>
            Puedes añadir más posiciones después desde tu dashboard
          </div>
        </>}
      </div>
    </div>
  );
}
