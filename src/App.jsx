import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Tools from "./pages/Tools";

function useRouter() {
  const parsePath = () => {
    const raw = window.location.pathname.replace(/\/+$/, "") || "/";
    const m = raw.match(/\/simulacion\/(.+)/);
    return { path: m ? "/simulacion" : raw, slug: m ? m[1].replace(/\/+$/, "") : null };
  };
  const [state, setState] = useState(parsePath);
  useEffect(() => {
    const update = () => setState(parsePath());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const go = (p) => { window.history.pushState({}, "", p); setState(parsePath()); };
  useEffect(() => { setState(parsePath()); }, []);
  return { path: state.path, go, simSlug: state.slug };
}

export default function App() {
  const { path, go, simSlug } = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading && (path === "/dashboard" || path === "/onboarding")) {
    return <div style={{ background: "#FBFAF8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A7A74", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>Cargando...</div>;
  }

  if ((path === "/dashboard" || path === "/onboarding") && !session) { go("/login"); return null; }

  if (path === "/login") return <Login go={go} session={session} mode="login" />;
  if (path === "/registro") return <Login go={go} session={session} mode="signup" />;
  if (path === "/onboarding" && session) return <Onboarding go={go} session={session} />;
  if (path === "/dashboard" && session) return <Dashboard go={go} session={session} />;

  if (path === "/simulador-cartera" || path === "/interes-compuesto" || path === "/simulacion") {
    return <Tools path={path} go={go} simSlug={simSlug} session={session} />;
  }

  if (path === "/") { window.location.href = "/landing.html"; return null; }

  return <div style={{ background: "#FBFAF8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A7A74", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>Página no encontrada · <a href="/" style={{ color: "#16754E", marginLeft: 6 }}>Volver</a></div>;
}
