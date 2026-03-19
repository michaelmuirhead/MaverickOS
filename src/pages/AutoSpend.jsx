import { useState, useMemo, useCallback } from "react";
import { Card, CardHeader, SwipeToDelete, Overlay, FrequencyBadge } from "../components/ui.jsx";
import { fmt, nextId, INPUT_STYLE, FREQUENCY_LABELS } from "../engine.js";

export function RecurringTransactionsPage({ recurringTransactions, setRecurringTransactions, categories, transactions, setTransactions, showUndo }) {
  const [modal, setModal] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c.id] = c; });
    return map;
  }, [categories]);

  // Pattern detection — find transactions that appear in 2+ months with consistent amounts
  const suggestions = useMemo(() => {
    if (transactions.length < 4) return [];
    const groups = {};
    transactions.forEach((t) => {
      const key = `${t.categoryId}||${t.description.toLowerCase().trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const results = [];
    Object.entries(groups).forEach(([key, txs]) => {
      if (txs.length < 2) return;
      const months = [...new Set(txs.map((t) => t.date.substring(0, 7)))].sort();
      if (months.length < 2) return;
      const amounts = txs.map((t) => t.amount);
      const avgAmt = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      const maxDev = Math.max(...amounts.map((a) => Math.abs(a - avgAmt) / avgAmt));
      if (maxDev > 0.1) return;
      const [catId, desc] = key.split("||");
      const alreadyTracked = recurringTransactions.some(
        (rt) => rt.categoryId === catId && rt.description.toLowerCase().trim() === desc
      );
      if (alreadyTracked) return;
      results.push({
        id: key, description: txs[0].description, categoryId: catId,
        amount: Math.round(avgAmt * 100) / 100, frequency: "monthly",
        monthCount: months.length, lastSeen: months[months.length - 1],
      });
    });
    return results.sort((a, b) => b.monthCount - a.monthCount).slice(0, 6);
  }, [transactions, recurringTransactions]);

  const visibleSuggestions = suggestions.filter((s) => !dismissedSuggestions.has(s.id));

  const addFromSuggestion = (s) => {
    const today = new Date().toISOString().split("T")[0];
    setRecurringTransactions((prev) => [...prev, {
      id: nextId(), description: s.description, amount: s.amount,
      categoryId: s.categoryId, frequency: s.frequency, anchorDate: today, active: true,
    }]);
    setDismissedSuggestions((prev) => new Set([...prev, s.id]));
  };

  const dismissSuggestion = (id) => setDismissedSuggestions((prev) => new Set([...prev, id]));

  // Monthly cost equivalent
  const monthlyEquiv = (rt) => {
    switch (rt.frequency) {
      case "weekly": return rt.amount * 52 / 12;
      case "biweekly": return rt.amount * 26 / 12;
      case "monthly": return rt.amount;
      case "quarterly": return rt.amount / 3;
      case "yearly": return rt.amount / 12;
      default: return rt.amount;
    }
  };

  const activeTemplates = recurringTransactions.filter((rt) => rt.active);
  const inactiveTemplates = recurringTransactions.filter((rt) => !rt.active);
  const totalMonthly = activeTemplates.reduce((s, rt) => s + monthlyEquiv(rt), 0);
  const totalYearly = totalMonthly * 12;

  // Next occurrence for a template
  const getNextDate = (rt) => {
    const now = new Date();
    const anchor = new Date(rt.anchorDate + "T00:00:00");
    if (rt.frequency === "monthly") {
      const day = anchor.getDate();
      let next = new Date(now.getFullYear(), now.getMonth(), day);
      if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, day);
      return next;
    }
    if (rt.frequency === "weekly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getTime() + 7 * 86400000);
      return cur;
    }
    if (rt.frequency === "biweekly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getTime() + 14 * 86400000);
      return cur;
    }
    if (rt.frequency === "quarterly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getFullYear(), cur.getMonth() + 3, cur.getDate());
      return cur;
    }
    if (rt.frequency === "yearly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate());
      return cur;
    }
    return now;
  };

  // Check if a recurring transaction has already been logged this period
  const isLoggedThisPeriod = (rt) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return transactions.some((t) =>
      t.categoryId === rt.categoryId &&
      t.description === rt.description &&
      Math.abs(t.amount - rt.amount) < 0.01 &&
      t.date.startsWith(monthKey)
    );
  };

  // Log a recurring transaction as a real transaction now
  const handleLogNow = (rt) => {
    const today = new Date().toISOString().split("T")[0];
    setTransactions((prev) => [...prev, {
      id: nextId(),
      categoryId: rt.categoryId,
      description: rt.description,
      amount: rt.amount,
      date: today,
    }]);
  };

  // Log all active un-logged templates at once
  const handleLogAll = () => {
    const today = new Date().toISOString().split("T")[0];
    const toLog = activeTemplates.filter((rt) => !isLoggedThisPeriod(rt));
    if (toLog.length === 0) return;
    setTransactions((prev) => [
      ...prev,
      ...toLog.map((rt) => ({
        id: nextId(),
        categoryId: rt.categoryId,
        description: rt.description,
        amount: rt.amount,
        date: today,
      })),
    ]);
  };

  const toggleActive = (id) => {
    setRecurringTransactions((prev) => prev.map((rt) => rt.id === id ? { ...rt, active: !rt.active } : rt));
  };

  const deleteTemplate = (id) => {
    const rt = recurringTransactions.find((r) => r.id === id);
    if (showUndo && rt) showUndo(`Deleted "${rt.description}"`);
    setRecurringTransactions((prev) => prev.filter((rt) => rt.id !== id));
  };

  const saveTemplate = (template) => {
    setRecurringTransactions((prev) => {
      const exists = prev.find((rt) => rt.id === template.id);
      if (exists) return prev.map((rt) => rt.id === template.id ? template : rt);
      return [...prev, template];
    });
    setModal(null);
  };

  const unloggedCount = activeTemplates.filter((rt) => !isLoggedThisPeriod(rt)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Recurring Transactions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Auto-log regular spending — subscriptions, memberships, and habits</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unloggedCount > 0 && (
            <button onClick={handleLogAll} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Log All ({unloggedCount})
            </button>
          )}
          <button onClick={() => setModal({ type: "add" })} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Add Template
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Monthly Auto-Spend" value={fmt(totalMonthly)} sub={`${activeTemplates.length} active`} accent="var(--accent)" />
        <MetricBox label="Yearly Total" value={fmt(totalYearly)} sub="projected" accent="var(--text-secondary)" />
        <MetricBox label="Unlogged" value={unloggedCount} sub="this month" accent={unloggedCount > 0 ? "var(--amber)" : "var(--green)"} />
        <MetricBox label="Templates" value={recurringTransactions.length} sub={`${inactiveTemplates.length} paused`} accent="var(--text-muted)" />
      </div>

      {/* Pattern detection suggestions */}
      {visibleSuggestions.length > 0 && (
        <Card style={{ marginBottom: 20, border: "1px solid var(--amber)", background: "var(--amber-bg)" }}>
          <CardHeader title={`Detected Patterns — ${visibleSuggestions.length} suggestion${visibleSuggestions.length !== 1 ? "s" : ""}`} />
          <div style={{ padding: "0 20px 16px", fontSize: 13, color: "var(--text-muted)", marginTop: -4, marginBottom: 8 }}>
            These transactions appear every month. Add them as templates?
          </div>
          <div>
            {visibleSuggestions.map((s) => {
              const cat = catMap[s.categoryId];
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderTop: "1px solid var(--border-subtle)" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    {cat?.icon || "●"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{s.description}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {cat?.name || "Unknown"} · seen {s.monthCount} months · last {s.lastSeen}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmt(s.amount)}</span>
                  <button onClick={() => addFromSuggestion(s)}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    Track
                  </button>
                  <button onClick={() => dismissSuggestion(s.id)}
                    style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Active templates */}
      {activeTemplates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Active" action={
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalMonthly)}/mo</span>
          } />
          <div>
            {activeTemplates.map((rt) => {
              const cat = catMap[rt.categoryId];
              const logged = isLoggedThisPeriod(rt);
              const nextDate = getNextDate(rt);
              return (
                <SwipeToDelete key={rt.id} onDelete={() => deleteTemplate(rt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                    {/* Category icon */}
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cat?.icon || "●"}
                    </span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rt.description}</span>
                        <FrequencyBadge frequency={rt.frequency} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {cat?.name || "Unknown"} · Next: {nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>

                    {/* Amount + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(rt.amount)}</span>
                      {logged ? (
                        <span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--green-bg)", color: "var(--green)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Logged</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleLogNow(rt); }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Log
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", template: rt }); }}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(rt.id); }}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Pause
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        </Card>
      )}

      {/* Inactive / Paused templates */}
      {inactiveTemplates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Paused" />
          <div>
            {inactiveTemplates.map((rt) => {
              const cat = catMap[rt.categoryId];
              return (
                <SwipeToDelete key={rt.id} onDelete={() => deleteTemplate(rt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", opacity: 0.5 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cat?.icon || "●"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rt.description}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{cat?.name || "Unknown"} · {fmt(rt.amount)} · {FREQUENCY_LABELS[rt.frequency]}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(rt.id)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        Resume
                      </button>
                      <button onClick={() => setModal({ type: "edit", template: rt })}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {recurringTransactions.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>↻</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No recurring transactions yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
            Add templates for subscriptions, memberships, and regular spending. Log them each month with one tap.
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={modal.type === "add" ? "Add Recurring Transaction" : "Edit Recurring Transaction"}>
            <RecurringTransactionFields
              categories={categories}
              existing={modal.type === "edit" ? modal.template : null}
              onSubmit={saveTemplate}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
    </div>
  );
}

export function RecurringTransactionFields({ categories, existing, onSubmit, onClose }) {
  const [form, setForm] = useState({
    description: existing?.description || "",
    amount: existing ? String(existing.amount) : "",
    categoryId: existing?.categoryId || categories[0]?.id || "",
    frequency: existing?.frequency || "monthly",
    anchorDate: existing?.anchorDate || new Date().toISOString().split("T")[0],
    active: existing?.active ?? true,
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = form.description.trim() && parseFloat(form.amount) > 0 && form.categoryId && form.anchorDate;

  const handleSave = () => {
    if (!canSubmit) return;
    onSubmit({
      id: existing?.id || nextId(),
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      frequency: form.frequency,
      anchorDate: form.anchorDate,
      active: form.active,
    });
  };

  // Monthly equivalent preview
  const monthlyEq = (() => {
    const amt = parseFloat(form.amount) || 0;
    switch (form.frequency) {
      case "weekly": return amt * 52 / 12;
      case "biweekly": return amt * 26 / 12;
      case "monthly": return amt;
      case "quarterly": return amt / 3;
      case "yearly": return amt / 12;
      default: return amt;
    }
  })();

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Description</FieldLabel>
          <input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Netflix, Gym, Weekly groceries" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Amount ($)</FieldLabel>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Frequency</FieldLabel>
            <select value={form.frequency} onChange={(e) => update("frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="semimonthly">1st & 15th</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <FieldLabel>Start Date</FieldLabel>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>
        {parseFloat(form.amount) > 0 && form.frequency !== "monthly" && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
            ≈ {fmt(monthlyEq)} per month · {fmt(monthlyEq * 12)} per year
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label={existing ? "Save" : "Add Template"} onSubmit={handleSave} />
    </>
  );
}

// ─────────────────────────────────────────────
// BUDGET TARGETS PAGE (YNAB-Style)
// ─────────────────────────────────────────────

const TARGET_TYPES = [
  { id: "monthly", label: "Monthly Limit", desc: "Spend up to this amount each month", icon: "📅" },
  { id: "target_by_date", label: "Target by Date", desc: "Save a total amount by a specific date", icon: "🎯" },
  { id: "weekly", label: "Weekly Limit", desc: "Spend up to this amount each week", icon: "🗓" },
];

