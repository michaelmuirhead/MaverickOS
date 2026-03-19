import { useState, useCallback } from "react";
import { Card, CardHeader, Overlay } from "../components/ui.jsx";
import { fmt, INPUT_STYLE, pillStyle } from "../engine.js";
import { COLOR_THEMES, DEFAULT_SETTINGS } from "../themes.js";
import { DASHBOARD_WIDGETS } from "../constants.js";
import { supabase } from "../supabase.js";

export function SettingsPage({ settings, setSettings, onExport, onExportCsv, onImport, onImportCsv, onReset, onRestartWizard, user, onSignOut }) {
  const fileRef = useRef(null);
  const csvRef = useRef(null);
  const hiddenPages = settings.hiddenPages || [];
  const dashWidgets = settings.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;

  const togglePage = (pageId) => {
    setSettings((s) => {
      const hidden = s.hiddenPages || [];
      return { ...s, hiddenPages: hidden.includes(pageId) ? hidden.filter((p) => p !== pageId) : [...hidden, pageId] };
    });
  };

  const toggleWidget = (widgetId) => {
    setSettings((s) => {
      const w = s.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;
      return { ...s, dashboardWidgets: w.includes(widgetId) ? w.filter((id) => id !== widgetId) : [...w, widgetId] };
    });
  };

  const toggleablePages = NAV_ITEMS.filter((p) => p.id !== "dashboard" && p.id !== "settings");

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Customize your experience</p>
      </div>

      {/* Account */}
      {user && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Account" />
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{user.email}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Signed in · data synced across devices</div>
              </div>
              <button onClick={onSignOut} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)",
                background: "transparent", color: "var(--text-secondary)", fontSize: 13,
                fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>Sign Out</button>
            </div>
          </div>
        </Card>
      )}

      {/* Household */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Household" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <FieldLabel>Household Name</FieldLabel>
            <input value={settings.householdName} onChange={(e) => setSettings((s) => ({ ...s, householdName: e.target.value }))} style={INPUT_STYLE} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <FieldLabel>Currency</FieldLabel>
              <select value={settings.currency || "USD"} onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                {[
                  ["USD", "USD — US Dollar ($)"],
                  ["EUR", "EUR — Euro (€)"],
                  ["GBP", "GBP — British Pound (£)"],
                  ["CAD", "CAD — Canadian Dollar ($)"],
                  ["AUD", "AUD — Australian Dollar ($)"],
                  ["JPY", "JPY — Japanese Yen (¥)"],
                  ["MXN", "MXN — Mexican Peso ($)"],
                  ["INR", "INR — Indian Rupee (₹)"],
                  ["BRL", "BRL — Brazilian Real (R$)"],
                  ["CHF", "CHF — Swiss Franc (Fr)"],
                  ["KRW", "KRW — South Korean Won (₩)"],
                  ["SGD", "SGD — Singapore Dollar ($)"],
                ].map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Budget Period Start Day</FieldLabel>
              <select value={settings.startDayOfMonth || 1} onChange={(e) => setSettings((s) => ({ ...s, startDayOfMonth: parseInt(e.target.value) }))} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                {[1, 5, 10, 15, 20, 25].map((d) => (
                  <option key={d} value={d}>{d === 1 ? `1st (calendar month)` : `${d}th of the month`}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {(() => {
                  const d = settings.startDayOfMonth || 1;
                  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
                  return `Budget period: ${ord(d)} → ${d === 1 ? "last day" : ord(d - 1)} of the month`;
                })()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Appearance — Dark / Light toggle */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Appearance" />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "dark", label: "Dark", icon: "🌙" },
              { key: "light", label: "Light", icon: "☀" },
            ].map((mode) => {
              const active = (settings.theme || "dark") === mode.key;
              return (
                <div key={mode.key} onClick={() => setSettings((s) => ({ ...s, theme: mode.key }))}
                  style={{
                    flex: 1, padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "10" : "var(--surface)",
                    transition: "all 0.15s", textAlign: "center",
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{mode.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {mode.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Color Theme */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Color Theme" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Changes apply instantly</span>} />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {Object.entries(COLOR_THEMES).map(([key, theme]) => {
              const active = (settings.colorTheme || "blue_gold") === key;
              return (
                <div key={key} onClick={() => setSettings((s) => ({ ...s, colorTheme: key }))}
                  style={{
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "10" : "var(--surface)",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {theme.preview.map((color, i) => (
                      <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: color, border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {theme.label}
                  </div>
                  {active && (
                    <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Page Visibility */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Pages" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Toggle pages on/off</span>} />
        <div style={{ padding: "0 12px 12px" }}>
          {toggleablePages.map((page) => {
            const enabled = !hiddenPages.includes(page.id);
            return (
              <div key={page.id} onClick={() => togglePage(page.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: enabled ? "transparent" : "var(--surface)",
                  opacity: enabled ? 1 : 0.5,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "flex", color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{page.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{page.label}</span>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 11, padding: 2,
                  background: enabled ? "var(--green)" : "var(--track)",
                  transition: "background 0.2s", display: "flex", alignItems: "center",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff",
                    transition: "transform 0.2s", transform: enabled ? "translateX(18px)" : "translateX(0)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dashboard Widgets */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Dashboard Widgets" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Choose what shows on Dashboard</span>} />
        <div style={{ padding: "0 12px 12px" }}>
          {DASHBOARD_WIDGETS.map((widget) => {
            const enabled = dashWidgets.includes(widget.id);
            return (
              <div key={widget.id} onClick={() => toggleWidget(widget.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  opacity: enabled ? 1 : 0.5,
                }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{widget.label}</span>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: enabled ? "none" : "2px solid var(--border-hover)",
                  background: enabled ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {enabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Data Management" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onExport} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Backup (JSON)
            </button>
            <button onClick={onExportCsv} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Transactions (CSV)
            </button>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Backup (JSON)
            </button>
            <button onClick={() => csvRef.current?.click()} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Transactions (CSV)
            </button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { onImport(ev.target.result); };
              reader.readAsText(file);
              e.target.value = "";
            }} />
            <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { onImportCsv && onImportCsv(ev.target.result); };
              reader.readAsText(file);
              e.target.value = "";
            }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>JSON backup saves everything and can be fully restored. CSV export/import works with transactions — columns: Date, Description, Category, Amount.</div>
        </div>
      </Card>

      {/* Notifications */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Notifications & Reminders" />
        <NotificationsSettings settings={settings} setSettings={setSettings} />
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader title="Danger Zone" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Restart Setup Wizard</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Clear your data and start fresh with the onboarding flow.</div>
              </div>
              <button onClick={onRestartWizard} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--accent)",
                background: "transparent", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Restart</button>
            </div>
          </div>
          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--red)33", background: "var(--red-bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Reset All Data</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Restore default sample data. This cannot be undone.</div>
              </div>
              <button onClick={onReset} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--red)",
                background: "transparent", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Reset</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// RECURRING TRANSACTIONS PAGE (Auto-Spend)
// ─────────────────────────────────────────────

