import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

/* ══ AUTH ══ */
export function useAuth() {
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

  const loginWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/dashboard" } });

  const loginWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signupWithEmail = (email, password) =>
    supabase.auth.signUp({ email, password });

  const logout = () => supabase.auth.signOut();

  const user = session?.user || null;
  const uid = user?.id || null;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";

  return { session, user, uid, userName, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout };
}

/* ══ PROFILE ══ */
export const getProfile = async (uid) => {
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
  return data;
};

export const updateProfile = async (uid, updates) => {
  await supabase.from("profiles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", uid);
};

/* ══ TARGET PORTFOLIO ══ */
export const getTargets = async (uid) => {
  const { data } = await supabase.from("target_portfolio").select("*").eq("user_id", uid);
  return data || [];
};

export const saveTargets = async (uid, targets) => {
  await supabase.from("target_portfolio").delete().eq("user_id", uid);
  if (targets.length > 0) {
    await supabase.from("target_portfolio").insert(targets.map(t => ({ user_id: uid, asset_id: t.asset_id, weight: t.weight })));
  }
};

/* ══ POSITIONS ══ */
export const getPositions = async (uid) => {
  const { data } = await supabase.from("positions").select("*").eq("user_id", uid).order("created_at");
  return data || [];
};

export const addPosition = async (uid, pos) => {
  await supabase.from("positions").insert({
    user_id: uid, asset_id: pos.asset_id, asset_name: pos.asset_id,
    broker: pos.broker || null, invested: pos.invested || 0, current_value: pos.current_value || 0
  });
};

export const updatePosition = async (id, updates) => {
  await supabase.from("positions").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
};

export const deletePosition = async (id) => {
  await supabase.from("positions").delete().eq("id", id);
};

/* ══ MOVEMENTS ══ */
export const getMovements = async (uid) => {
  const { data } = await supabase.from("movements").select("*").eq("user_id", uid).order("date", { ascending: false });
  return data || [];
};

export const saveMovement = async (uid, mov, positions) => {
  const amt = Number(mov.amount);
  if (!mov.asset_id || !amt) return null;

  await supabase.from("movements").insert({
    user_id: uid, asset_id: mov.asset_id, broker: mov.broker || null,
    type: mov.type, amount: amt, date: mov.date || new Date().toISOString().slice(0, 10),
    shares: mov.shares ? Number(mov.shares) : null,
    price: mov.price ? Number(mov.price) : null,
    commission: mov.commission ? Number(mov.commission) : 0,
    notes: mov.notes || null
  });

  const existing = positions.find(p => p.asset_id === mov.asset_id && (p.broker || "") === (mov.broker || ""));
  if (existing) {
    const newInv = mov.type === "sell" ? Number(existing.invested) - amt : Number(existing.invested) + amt;
    const newVal = mov.type === "sell" ? Number(existing.current_value) - amt : Number(existing.current_value) + amt;
    await updatePosition(existing.id, { invested: Math.max(0, newInv), current_value: Math.max(0, newVal) });
  } else if (mov.type === "buy") {
    await addPosition(uid, { asset_id: mov.asset_id, broker: mov.broker, invested: amt, current_value: amt });
  }

  return await getPositions(uid);
};

/* ══ HISTORY ══ */
export const getHistory = async (uid) => {
  const { data } = await supabase.from("history").select("*").eq("user_id", uid).order("month");
  return data || [];
};

export const saveSnapshot = async (uid, totalInvested, totalValue) => {
  const month = new Date().toISOString().slice(0, 7) + "-01";
  await supabase.from("history").upsert({ user_id: uid, month, total_invested: totalInvested, total_value: totalValue }, { onConflict: "user_id,month" });
};

/* ══ HOOK: usePortfolio ══ */
export function usePortfolio(uid) {
  const [positions, setPositions] = useState([]);
  const [targets, setTargets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const [pos, tgt, hist] = await Promise.all([getPositions(uid), getTargets(uid), getHistory(uid)]);
    setPositions(pos);
    setTargets(tgt);
    setHistory(hist);
    setLoading(false);
  }, [uid]);

  useEffect(() => { refresh(); }, [refresh]);

  const totalValue = positions.reduce((s, p) => s + Number(p.current_value), 0);
  const totalInvested = positions.reduce((s, p) => s + Number(p.invested), 0);
  const totalGain = totalValue - totalInvested;
  const totalPct = totalInvested > 0 ? (totalGain / totalInvested * 100) : 0;

  const targetMap = {};
  targets.forEach(t => { targetMap[t.asset_id] = Number(t.weight); });

  return { positions, targets, targetMap, history, totalValue, totalInvested, totalGain, totalPct, loading, refresh, setPositions };
}
