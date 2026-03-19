const INCOME_CATEGORIES = [
  { key: "employment", label: "Employment", icon: "💼" },
  { key: "freelance", label: "Freelance", icon: "💻" },
  { key: "investment", label: "Investment", icon: "📈" },
  { key: "rental", label: "Rental", icon: "🏠" },
  { key: "other", label: "Gift / Other", icon: "🎁" },
];

import { useState } from "react";
import { Card, CardHeader, SwipeToDelete, Overlay, FrequencyBadge, MetricBox } from "../components/ui.jsx";
import { fmt, nextId, INPUT_STYLE, FREQUENCY_LABELS } from "../engine.js";
import { FieldLabel } from "../components/forms.jsx"

export function IncomePage({ income, setIncome, showUndo }) {
  const [modal, setModal] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const totalMonthly = income.filter((i) => i.recurring).reduce((s, i) => {
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount * 2;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);
  const totalYearly = totalMonthly * 12;
  const recurringCount = income.filter((i) => i.recurring).length;
  const oneTimeTotal = income.filter((i) => !i.recurring).reduce((s, i) => s + i.amount, 0);

  const monthlyEquiv = (inc) => {
    if (!inc.recurring) return null;
    switch (inc.frequency) {
      case "weekly": return inc.amount * 52 / 12;
      case "biweekly": return inc.amount * 26 / 12;
      case "semimonthly": return inc.amount * 2;
      case "monthly": return inc.amount;
      case "quarterly": return inc.amount / 3;
      case "yearly": return inc.amount / 12;
      default: return inc.amount;
    }
  };

  const grouped = {};
  income.forEach((i) => {
    const cat = i.category || "gift";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  const deleteIncome = (id) => { const inc = income.find((i) => i.id === id); if (showUndo && inc) showUndo(`Deleted "${inc.source}"`); setIncome((prev) => prev.filter((i) => i.id !== id)); setConfirmingDelete(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Income</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track all household income sources</p>
        </div>
        <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Income</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Income" value={fmt(totalMonthly)} sub={`${recurringCount} recurring sources`} accent="var(--green)" />
        <MetricBox label="Annual Income" value={fmtCompact(totalYearly)} sub="projected yearly" />
        <MetricBox label="One-Time Income" value={fmt(oneTimeTotal)} sub={`${income.filter((i) => !i.recurring).length} entries`} accent="var(--amber)" />
        <MetricBox label="Total Sources" value={income.length} sub={`${Object.keys(grouped).length} categories`} />
      </div>

      {/* Income breakdown bar */}
      {totalMonthly > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader title="Monthly Income Breakdown" />
          <div style={{ padding: "0 20px 16px" }}>
            {/* Stacked bar */}
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
              {income.filter((i) => i.recurring).map((inc, idx) => {
                const mo = monthlyEquiv(inc) || 0;
                const pctWidth = (mo / totalMonthly) * 100;
                const colors = ["var(--green)", "var(--accent)", "var(--amber)", "#38bdf8", "#f472b6", "#fb923c"];
                return (
                  <div key={inc.id} style={{
                    width: `${pctWidth}%`, background: colors[idx % colors.length],
                    transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                  }} />
                );
              })}
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {income.filter((i) => i.recurring).map((inc, idx) => {
                const mo = monthlyEquiv(inc) || 0;
                const share = totalMonthly > 0 ? (mo / totalMonthly * 100).toFixed(0) : 0;
                const colors = ["var(--green)", "var(--accent)", "var(--amber)", "#38bdf8", "#f472b6", "#fb923c"];
                return (
                  <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[idx % colors.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{inc.source}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(mo)}/mo</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 32, textAlign: "right" }}>{share}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {Object.entries(INCOME_CATEGORIES).filter(([key]) => grouped[key]).map(([catKey, catInfo]) => (
        <div key={catKey} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: catInfo.color, background: catInfo.color + "18", padding: "2px 7px", borderRadius: 4 }}>{catInfo.label}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{grouped[catKey].length} source{grouped[catKey].length !== 1 ? "s" : ""}</span>
          </div>
          <Card>
            {grouped[catKey].map((inc, idx) => (
              <SwipeToDelete key={inc.id} onDelete={() => deleteIncome(inc.id)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < grouped[catKey].length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{inc.icon || "💰"}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{inc.source}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10 }}>
                        {inc.recurring && <FrequencyBadge frequency={inc.frequency} />}
                        {!inc.recurring && <span>One-time · {new Date(inc.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>+{fmt(inc.amount)}</div>
                      {monthlyEquiv(inc) !== null && inc.frequency !== "monthly" && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(monthlyEquiv(inc))}/mo
                        </div>
                      )}
                    </div>
                    <button onClick={() => setModal({ type: "edit", income: inc })} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </div>
              </SwipeToDelete>
            ))}
          </Card>
        </div>
      ))}

      {income.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No income sources yet</div>
          <button onClick={() => setModal("add")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Your First Income</button>
        </Card>
      )}

      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <IncomeForm onSave={(inc) => { setIncome((p) => [...p, { ...inc, id: nextId() }]); setModal(null); }} onClose={() => setModal(null)} title="Add Income Source" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <IncomeForm existing={modal.income} onSave={(updated) => { setIncome((p) => p.map((i) => i.id === updated.id ? updated : i)); setModal(null); }} onClose={() => setModal(null)} title="Edit Income Source" />
        </Overlay>
      )}
    </div>
  );
}

export function IncomeForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    source: existing.source, amount: String(existing.amount), date: existing.date,
    recurring: existing.recurring, frequency: existing.frequency || "monthly",
    category: existing.category || "employment", icon: existing.icon || "💰",
  } : {
    source: "", amount: "", date: new Date().toISOString().split("T")[0],
    recurring: true, frequency: "monthly", category: "employment", icon: "💼",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.source.trim() && parseFloat(form.amount) > 0;
  const icons = ["💼", "🎨", "📈", "🏠", "🎁", "💰", "🛒", "📱"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Source Name</FieldLabel><input value={form.source} onChange={(e) => update("source", e.target.value)} placeholder="e.g. My Salary" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Category</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(INCOME_CATEGORIES).map(([key, info]) => {
              const active = form.category === key;
              return (<button key={key} onClick={() => update("category", key)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? info.color : "var(--border)"}`, background: active ? info.color + "22" : "transparent", color: active ? info.color : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{info.label}</button>);
            })}
          </div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
        <div onClick={() => update("recurring", !form.recurring)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}>
          <div style={{ width: 40, height: 22, borderRadius: 11, padding: 2, background: form.recurring ? "var(--accent)" : "var(--track)", transition: "background 0.2s", display: "flex", alignItems: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "transform 0.2s", transform: form.recurring ? "translateX(18px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recurring</div></div>
        </div>
        {form.recurring && (
          <div><FieldLabel>Frequency</FieldLabel>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => {
                const active = form.frequency === key;
                return (<button key={key} onClick={() => update("frequency", key)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)22" : "transparent", color: active ? "var(--accent)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{label}</button>);
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), source: form.source.trim(), amount: parseFloat(form.amount), date: form.date, recurring: form.recurring, frequency: form.recurring ? form.frequency : null, category: form.category, icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Income"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// DEBT PAGE
// ─────────────────────────────────────────────

