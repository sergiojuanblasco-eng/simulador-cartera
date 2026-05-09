import { useState } from "react";
import { updateProfile, saveTargets, addPosition } from "../lib/backend";

const V = {
  bg: "#FBFAF8", bg2: "#F4F2EF", card: "#FFFFFF",
  dark: "#1A1A18", text: "#1E1E1C", muted: "#7A7A74",
  border: "#E5E3DF", borderDk: "#CCCAC5",
  green: "#16754E", greenLight: "#EAF5EF", greenText: "#0E5238",
  red: "#C0392B", redLight: "#FDECEA",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  serif: "'Instrument Serif', Georgia, serif",
};

const PROFILES = [
  { v: 0, t: "Conservador", d: "Priorizo no perder dinero" },
  { v: 1, t: "Moderado", d: "Acepto cierta volatilidad a cambio de rentabilidad" },
  { v: 2, t: "Agresivo", d: "Tolero caídas grandes si la rentabilidad potencial es alta" },
  { v: 3, t: "Muy agresivo", d: "Máximo riesgo, máxima rentabilidad esperada" },
];

const TEMPLATES = {
  con: { t: "Conservadora", a: [{ n: "Bonos Global", w: 60 }, { n: "MSCI World", w: 30 }, { n: "Oro", w: 10 }] },
  eq: { t: "Equilibrada", a: [{ n: "MSCI World", w: 60 }, { n: "Bonos Global", w: 30 }, { n: "Oro", w: 10 }] },
  ag: { t: "Agresiva", a: [{ n: "MSCI World", w: 80 }, { n: "Bitcoin", w: 10 }, { n: "Oro", w: 10 }] },
  cu: { t: "Personalizada", a: [] },
};

const inp = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: `1.5px solid ${V.border}`, background: V.bg,
  fontSize: 15, fontFamily: V.sans, color: V.text, outline: "none", boxSizing: "border-box",
};

export default function Onboarding({ go, session }) {
  const uid = session?.user?.id;
  const [step, setStep] = useState(1);
  const [risk, setRisk] = useState(null);
  const [tpl, setTpl] = useState(null);
  const [targets, setTargetsLocal] = useState([]);
  const [customName, setCustomName] = useState("");
  const [customW, setCustomW] = useState("");
  const [positions, setPositions] = useState([]);
  const [pos, setPos] = useState({ asset_id: "", broker: "", invested: "", value: "" });
  const [saving, setSaving] = useState(false);

  const totalW = targets.reduce((s, t) => s + t.w, 0);

  const selectTpl = (key) => {
    setTpl(key);
    setTargetsLocal(key === "cu" ? [] : TEMPLATES[key].a.map(a => ({ ...a })));
  };

  const addCustom = () => {
    if (!customName || !customW) return;
    setTargetsLocal([...targets, { n: customName, w: Number(customW) }]);
    setCustomName("");
    setCustomW("");
  };

  const addPos = () => {
    if (!pos.asset_id || !pos.invested || !pos.value) return;
    setPositions([...positions, { ...pos }]);
    setPos({ asset_id: "", broker: "", invested: "", value: "" });
  };

  const finish = async () => {
    setSaving(true);
    if (risk !== null) await updateProfile(uid, { risk_profile: risk });
    if (targets.length > 0) await saveTargets(uid, targets.map(t => ({ asset_id: t.n, weight: t.w })));
    for (const p of positions) {
      await addPosition(uid, { asset_id: p.asset_id, broker: p.broker, invested: Number(p.invested), current_value: Number(p.value) });
    }
    await updateProfile(uid, { onboarding_done: true });
    go("/dashboard");
  };

  const gain = pos.invested && pos.value ? Number(pos.value) - Number(pos.invested) : null;

  const Progress = ({ s }) => (
    <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
      {[1, 2, 3].map(i => <div key={i} style={{ height: 3, borderRadius: 2, flex: 1, background: i <= s ? V.green : V.border, transition: "background 0.3s" }} />)}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: V.bg, fontFamily: V.sans, color: V.text, padding: "48px 20px 60px" }}>
      <div style={{ background: V.card, border: `1.5px solid ${V.border}`, borderRadius: 20, padding: "40px 40px 36px", width: "100%", maxWidth: 560, boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>

        {/* ── STEP 1: Risk Profile ── */}
        {step === 1 && <>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: V.green, marginBottom: 12 }}>Paso 1 de 3</div>
          <Progress s={1} />
          <div style={{ fontFamily: V.serif, fontSize: 28, letterSpacing: "-0.02em", color: V.dark, marginBottom: 6 }}>¿Cuál es tu perfil?</div>
          <div style={{ fontSize: 14, color: V.muted, marginBottom: 28 }}>Esto nos ayuda a darte mejores sugerencias de rebalanceo.</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PROFILES.map(p => (
              <div key={p.v} onClick={() => setRisk(p.v)} style={{
                padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                border: `1.5px solid ${risk === p.v ? V.green : V.border}`,
                background: risk === p.v ? V.greenLight : V.card,
                display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: V.dark }}>{p.t}</div>
                  <div style={{ fontSize: 13, color: V.muted, marginTop: 2 }}>{p.d}</div>
                </div>
                {risk === p.v && <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke={V.green} strokeWidth="1.5" fill={V.greenLight} /><path d="M6 10l3 3 5-5" stroke={V.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            ))}
          </div>

          <button onClick={() => setStep(2)} disabled={risk === null} style={{
            width: "100%", padding: 14, borderRadius: 12, border: "none", marginTop: 28,
            background: V.green, color: "#fff", fontSize: 15, fontWeight: 700,
            fontFamily: V.sans, cursor: "pointer", opacity: risk === null ? 0.4 : 1,
          }}>Continuar</button>
        </>}

        {/* ── STEP 2: Target Portfolio ── */}
        {step === 2 && <>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: V.green, marginBottom: 12 }}>Paso 2 de 3</div>
          <Progress s={2} />
          <div style={{ fontFamily: V.serif, fontSize: 28, letterSpacing: "-0.02em", color: V.dark, marginBottom: 6 }}>¿Cómo quieres distribuir tu cartera?</div>
          <div style={{ fontSize: 14, color: V.muted, marginBottom: 28 }}>Esto nos permite avisarte cuándo rebalancear.</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {Object.entries(TEMPLATES).map(([key, tmpl]) => (
              <div key={key} onClick={() => selectTpl(key)} style={{
                padding: "14px 12px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                border: `1.5px solid ${tpl === key ? V.green : V.border}`,
                background: tpl === key ? V.greenLight : V.card,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: V.dark }}>{tmpl.t}</div>
              </div>
            ))}
          </div>

          {targets.length > 0 && <div style={{ background: V.bg, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${V.border}` }}>
            {targets.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < targets.length - 1 ? `1px solid ${V.border}` : "none" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: V.dark }}>{t.n}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: V.green }}>{t.w}%</span>
                  <span onClick={() => setTargetsLocal(targets.filter((_, j) => j !== i))} style={{ fontSize: 14, color: V.muted, cursor: "pointer" }}>✕</span>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, fontWeight: 600, color: totalW === 100 ? V.green : V.red, marginTop: 8 }}>
              Total: {totalW}% {totalW === 100 ? "✓" : "(debe sumar 100%)"}
            </div>
          </div>}

          {tpl === "cu" && <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input placeholder="Activo" value={customName} onChange={e => setCustomName(e.target.value)} style={{ ...inp, flex: 2 }} />
            <input type="number" placeholder="%" value={customW} onChange={e => setCustomW(e.target.value)} style={{ ...inp, flex: 1 }} />
            <button onClick={addCustom} style={{ padding: "12px 16px", borderRadius: 12, border: "none", background: V.green, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 16 }}>+</button>
          </div>}

          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${V.border}`, background: V.card, color: V.muted, fontSize: 15, fontWeight: 600, fontFamily: V.sans, cursor: "pointer" }}>Anterior</button>
            <button onClick={() => setStep(3)} disabled={targets.length > 0 && totalW !== 100} style={{
              flex: 1, padding: 14, borderRadius: 12, border: "none",
              background: V.green, color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: V.sans, cursor: "pointer", opacity: (targets.length > 0 && totalW !== 100) ? 0.4 : 1,
            }}>Continuar</button>
          </div>

          <div onClick={() => setStep(3)} style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: V.muted, cursor: "pointer" }}>Saltar este paso →</div>
        </>}

        {/* ── STEP 3: First Positions ── */}
        {step === 3 && <>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: V.green, marginBottom: 12 }}>Paso 3 de 3</div>
          <Progress s={3} />
          <div style={{ fontFamily: V.serif, fontSize: 28, letterSpacing: "-0.02em", color: V.dark, marginBottom: 6 }}>Registra tu primera inversión</div>
          <div style={{ fontSize: 14, color: V.muted, marginBottom: 28 }}>Mira tu app del broker y copia los datos. 10 segundos.</div>

          {positions.length > 0 && <div style={{ background: V.bg, borderRadius: 12, padding: 14, marginBottom: 16, border: `1px solid ${V.border}` }}>
            {positions.map((p, i) => {
              const g = Number(p.value) - Number(p.invested);
              const pct = Number(p.invested) > 0 ? (g / Number(p.invested) * 100) : 0;
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < positions.length - 1 ? `1px solid ${V.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: V.dark }}>{p.asset_id}</div>
                    <div style={{ fontSize: 12, color: V.muted }}>{p.broker}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: g >= 0 ? V.green : V.red }}>
                    {g >= 0 ? "+" : ""}{g.toFixed(0)}€ ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: V.dark, marginBottom: 6 }}>Activo</label>
              <input placeholder='Ej. "MSCI World", "Bitcoin"...' value={pos.asset_id} onChange={e => setPos({ ...pos, asset_id: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: V.dark, marginBottom: 6 }}>Broker</label>
              <input placeholder='Ej. "MyInvestor", "Degiro"...' value={pos.broker} onChange={e => setPos({ ...pos, broker: e.target.value })} style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: V.dark, marginBottom: 6 }}>Total invertido (€)</label>
                <input type="number" placeholder="0" value={pos.invested} onChange={e => setPos({ ...pos, invested: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: V.dark, marginBottom: 6 }}>Valor actual (€)</label>
                <input type="number" placeholder="0" value={pos.value} onChange={e => setPos({ ...pos, value: e.target.value })} style={inp} />
              </div>
            </div>
          </div>

          {gain !== null && Number(pos.invested) > 0 && <div style={{ textAlign: "center", marginTop: 12, padding: "8px 12px", borderRadius: 8, background: gain >= 0 ? V.greenLight : V.redLight }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: gain >= 0 ? V.greenText : V.red }}>
              Ganancia: {gain >= 0 ? "+" : ""}{gain.toFixed(0)}€ ({((gain / Number(pos.invested)) * 100).toFixed(1)}%)
            </span>
          </div>}

          <button onClick={addPos} disabled={!pos.asset_id || !pos.invested || !pos.value} style={{
            width: "100%", padding: 14, borderRadius: 12,
            border: `1.5px solid ${V.border}`, background: V.bg,
            color: V.dark, fontSize: 14, fontWeight: 600, marginTop: 16,
            fontFamily: V.sans, cursor: "pointer", opacity: (!pos.asset_id || !pos.invested || !pos.value) ? 0.4 : 1,
          }}>Añadir posición</button>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${V.border}`, background: V.card, color: V.muted, fontSize: 15, fontWeight: 600, fontFamily: V.sans, cursor: "pointer" }}>Anterior</button>
            <button onClick={finish} disabled={saving || positions.length === 0} style={{
              flex: 1, padding: 14, borderRadius: 12, border: "none",
              background: V.green, color: "#fff", fontSize: 15, fontWeight: 700,
              fontFamily: V.sans, cursor: "pointer", opacity: positions.length === 0 ? 0.4 : 1,
            }}>{saving ? "Guardando..." : "Ir al dashboard →"}</button>
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: V.muted }}>
            Puedes añadir más posiciones después desde tu dashboard
          </div>
        </>}
      </div>
    </div>
  );
}
