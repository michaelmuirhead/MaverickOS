import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qjkmbvgshiczvzrstajn.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZHDZeQRm34mvKREG6s7Rng__t_Unx-a";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────
// PERSISTENCE LAYER
// localStorage = offline fallback; Supabase = source of truth when online
// ─────────────────────────────────────────────

const STORAGE_KEY = "maverickos_data";

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.paidDates) data.paidDates = new Set(data.paidDates);
    return data;
  } catch { return null; }
}

export function saveState(state) {
  try {
    const toSave = { ...state, paidDates: [...state.paidDates] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// Save full state to Supabase (upsert — insert or update)
async function saveStateToSupabase(userId, state) {
  try {
    const toSave = { ...state, paidDates: [...state.paidDates] };
    const { error } = await supabase
      .from("user_data")
      .upsert({ user_id: userId, data: toSave }, { onConflict: "user_id" });
    if (error) console.error("Supabase save error:", error.message);
  } catch (e) { console.error("Supabase save failed:", e); }
}

// Load full state from Supabase
async function loadStateFromSupabase(userId) {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    const state = data.data;
    if (state.paidDates) state.paidDates = new Set(state.paidDates);
    return state;
  } catch (e) { console.error("Supabase load failed:", e); return null; }
}

// ─────────────────────────────────────────────
// AUTH SCREEN COMPONENT
// ─────────────────────────────────────────────

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setError(""); setMessage("");
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (mode !== "reset" && password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setError(error.message); }
        else { onAuth(data.user); }
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) { setError(error.message); }
        else if (data.user && !data.user.confirmed_at) {
          setMessage("Check your email for a confirmation link, then come back and log in.");
          setMode("login");
        } else if (data.user) { onAuth(data.user); }
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) { setError(error.message); }
        else { setMessage("Password reset email sent. Check your inbox."); setMode("login"); }
      }
    } catch (e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 15,
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "-webkit-fill-available",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", color: "var(--text-primary)",
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px" }}>💰</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>MaverickOS</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Your personal finance command center</p>
        </div>

        {/* Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>
            {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
          </h2>

          {error && (
            <div style={{ background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--red)" }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: "var(--green-bg)", border: "1px solid var(--green)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--green)" }}>
              {message}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com" style={inputStyle} autoComplete="email" />
            </div>
            {mode !== "reset" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"} style={inputStyle} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </div>
            )}
            <button onClick={handleSubmit} disabled={loading} style={{
              padding: "13px", borderRadius: 10, border: "none",
              background: loading ? "var(--border)" : "#1e40af",
              color: loading ? "var(--text-muted)" : "#fff",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4, transition: "background 0.15s",
            }}>
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
            </button>
          </div>

          {/* Mode switchers */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {mode === "login" && (<>
              <button onClick={() => { setMode("signup"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                Don't have an account? Sign up
              </button>
              <button onClick={() => { setMode("reset"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                Forgot password?
              </button>
            </>)}
            {mode !== "login" && (
              <button onClick={() => { setMode("login"); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
          Your data is encrypted and private — only you can access it.
        </p>
      </div>
    </div>
  );
}

// Settings defaults
