import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const V = {
  bg: "#FBFAF8", bg2: "#F4F2EF", card: "#FFFFFF",
  dark: "#1A1A18", text: "#1E1E1C", muted: "#7A7A74",
  border: "#E5E3DF", borderDk: "#CCCAC5",
  green: "#16754E", greenLight: "#EAF5EF",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  serif: "'Instrument Serif', Georgia, serif",
};

export default function Login({ go, session }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) go("/dashboard");
  }, [session]);

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = mode === "signup"
      ? await supabase.auth.signUp({ email, password: pass })
      : await supabase.auth.signInWithPassword({ email, password: pass });
    if (err) { setError(err.message); setLoading(false); }
    else go("/dashboard");
  };

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1.5px solid ${V.border}`, background: V.bg,
    fontSize: 15, fontFamily: V.sans, color: V.text, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: V.bg2, fontFamily: V.sans, color: V.text, padding: 20 }}>
      <div style={{ background: V.card, border: `1.5px solid ${V.border}`, borderRadius: 20, padding: "40px 40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,0.07)" }}>

        <div style={{ fontFamily: V.serif, fontSize: 26, letterSpacing: "-0.02em", color: V.dark, marginBottom: 6 }}>Kartera</div>
        <div style={{ fontSize: 14, color: V.muted, marginBottom: 32 }}>
          {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta gratuita"}
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{
          width: "100%", padding: "13px 16px", borderRadius: 12,
          border: `1.5px solid ${V.border}`, background: V.card,
          color: V.text, fontSize: 15, fontWeight: 500, cursor: "pointer",
          fontFamily: V.sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar con Google
        </button>

        <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: V.border }} />
          <span style={{ fontSize: 13, color: V.muted }}>o con email</span>
          <div style={{ flex: 1, height: 1, background: V.border }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: V.dark, marginBottom: 6 }}>Email</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: V.dark, marginBottom: 6 }}>Contraseña</label>
            <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required style={inp} />
          </div>
          {error && <div style={{ fontSize: 13, color: "#C0392B", marginBottom: 12, textAlign: "center", padding: "8px 12px", background: "#FDECEA", borderRadius: 8 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: 14, borderRadius: 12, border: "none",
            background: V.green, color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: "pointer", fontFamily: V.sans, marginTop: 4,
          }}>
            {loading ? "Un momento…" : (mode === "login" ? "Entrar" : "Crear cuenta")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: V.muted }}>
          {mode === "login"
            ? <>¿No tienes cuenta? <span style={{ color: V.green, fontWeight: 700, cursor: "pointer" }} onClick={() => { setMode("signup"); setError(""); }}>Regístrate</span></>
            : <>¿Ya tienes cuenta? <span style={{ color: V.green, fontWeight: 700, cursor: "pointer" }} onClick={() => { setMode("login"); setError(""); }}>Entrar</span></>
          }
        </div>
      </div>
    </div>
  );
}
