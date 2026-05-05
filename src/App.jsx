import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";

function useRouter() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = (p) => { window.history.pushState({}, "", p); setPath(p); };
  return { path, go };
}

export default function App() {
  const { path, go } = useRouter();
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
    return <div style={{ background: "#0d0b08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5c6170", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>Cargando...</div>;
  }

  if (path === "/dashboard" && !session) { go("/login"); return null; }
  if (path === "/onboarding" && !session) { go("/login"); return null; }

  if (path === "/login") return <Login go={go} session={session} />;
  if (path === "/onboarding" && session) return <Onboarding go={go} session={session} />;
  if (path === "/dashboard" && session) return <Dashboard go={go} session={session} />;

  // Default: redirect to landing (served by Vercel as static HTML)
  // If we're here, it means the SPA loaded but path is "/" or unknown
  // Redirect to landing or show nothing (landing.html handles "/")
  if (path === "/") {
    window.location.href = "/landing.html";
    return null;
  }

  return <div style={{ background: "#0d0b08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5c6170", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>Página no encontrada · <a href="/" style={{ color: "#b5e834", marginLeft: 6 }}>Volver</a></div>;
}
