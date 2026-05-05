import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const D = {
  bg: "#0d0b08", s1: "#161412", s2: "#1c1a17",
  t1: "#eef1f8", t2: "#a8adb8", t3: "#5c6170",
  border: "rgba(255,255,255,0.06)",
  accent: "#b5e834",
  sans: "'Plus Jakarta Sans',system-ui,sans-serif",
  serif: "'Instrument Serif',Georgia,serif",
};

export default function Login({ go, session }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) go("/dashboard");
  }, [session]);

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" }
    });
  };

  const handleEmail = async () => {
    setError("");
    setLoading(true);
    const { error: err } = mode === "signup"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    else go("/dashboard");
    setLoading(false);
  };

  const inp = {
    width: "100%", padding: "14px 16px", background: D.s2,
    border: `1px solid ${D.border}`, borderRadius: 12,
    color: D.t1, fontSize: 15, fontFamily: D.sans, outline: "none", boxSizing: "border-box"
  };

  return (
    <div style={{ background: D.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: D.sans, color: D.t1 }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "40px 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: D.serif, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 10 }}>
            Kartera<span style={{ color: D.accent }}>.</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
            {mode === "signup" ? "Crea tu cuenta gratis" : "Entra en tu cuenta"}
          </h2>
          <p style={{ fontSize: 14, color: D.t3 }}>
            {mode === "signup" ? "Empieza a controlar tus inversiones en un solo sitio" : "Bienvenido de vuelta"}
          </p>
        </div>

        <button onClick={handleGoogle} style={{
          width: "100%", padding: "14px", borderRadius: 12,
          border: `1px solid ${D.border}`, background: D.s1,
          color: D.t1, fontSize: 15, fontWeight: 500, cursor: "pointer",
          fontFamily: D.sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          marginBottom: 24
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar con Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: D.border }} />
          <span style={{ fontSize: 12, color: D.t3 }}>o</span>
          <div style={{ flex: 1, height: 1, background: D.border }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} style={inp} onKeyDown={e => e.key === "Enter" && handleEmail()} />
        </div>

        {error && <div style={{ fontSize: 13, color: "#e86060", marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <button onClick={handleEmail} disabled={loading || !email || !password} style={{
          width: "100%", padding: 15, borderRadius: 12, border: "none", cursor: "pointer",
          fontSize: 15, fontWeight: 700, fontFamily: D.sans,
          background: D.accent, color: D.bg,
          opacity: (!email || !password) ? 0.4 : 1
        }}>
          {loading ? "..." : mode === "signup" ? "Crear cuenta" : "Entrar"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: D.t3 }}>
          {mode === "signup" ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <span onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }} style={{ color: D.accent, cursor: "pointer", fontWeight: 600 }}>
            {mode === "signup" ? "Entrar" : "Crear cuenta gratis"}
          </span>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: D.t3, lineHeight: 1.6 }}>
          Al continuar aceptas nuestros Términos y Política de Privacidad
        </div>
      </div>
    </div>
  );
}
