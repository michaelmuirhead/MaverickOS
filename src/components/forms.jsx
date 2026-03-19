import { useState, useCallback } from "react";
import { Card, Overlay, ProgressBar } from "./ui.jsx";
import { fmt, nextId, INPUT_STYLE, FREQUENCY_LABELS } from "../engine.js";

export function ModalForm({ title, children }) {
  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </>
  );
}

export function ModalActions({ onClose, onSubmit, canSubmit, label = "Save" }) {
  return (
    <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        {label}
      </button>
    </div>
  );
}

export function FieldLabel({ children }) {
  return <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{children}</label>;
}

export function AddTransactionFields({ categories, onSubmit, onClose, existing, prefilledCategoryId }) {
  const [form, setForm] = useState(existing ? {
    categoryId: existing.categoryId,
    description: existing.description,
    amount: String(existing.amount),
    date: existing.date,
  } : { categoryId: prefilledCategoryId || categories[0]?.id || "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Split transaction state
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState([
    { id: 1, categoryId: prefilledCategoryId || categories[0]?.id || "", amount: "" },
    { id: 2, categoryId: categories[1]?.id || categories[0]?.id || "", amount: "" },
  ]);
  const updateSplit = (id, k, v) => setSplits((prev) => prev.map((s) => s.id === id ? { ...s, [k]: v } : s));
  const addSplit = () => setSplits((prev) => [...prev, { id: Date.now(), categoryId: categories[0]?.id || "", amount: "" }]);
  const removeSplit = (id) => setSplits((prev) => prev.filter((s) => s.id !== id));

  const totalAmount = parseFloat(form.amount) || 0;
  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  const splitRemaining = Math.round((totalAmount - splitTotal) * 100) / 100;
  const splitValid = splits.every((s) => s.categoryId && parseFloat(s.amount) > 0) && Math.abs(splitRemaining) < 0.01;

  const canSubmit = isSplit
    ? form.description.trim() && totalAmount > 0 && form.date && splitValid
    : form.categoryId && form.description.trim() && parseFloat(form.amount) > 0 && form.date;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (isSplit) {
      // Pass array of transactions for split mode
      const splitTxs = splits.map((sp) => ({
        id: nextId(), categoryId: sp.categoryId,
        description: form.description.trim(), amount: parseFloat(sp.amount), date: form.date,
      }));
      onSubmit(splitTxs, true);
    } else {
      onSubmit({ id: existing?.id || nextId(), categoryId: form.categoryId, description: form.description.trim(), amount: parseFloat(form.amount), date: form.date });
    }
  };

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Description</FieldLabel><input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Grocery store run" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Total Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} /></div>
        </div>

        {!isSplit && (
          <div><FieldLabel>Category</FieldLabel><select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
        )}

        {/* Split toggle */}
        {!existing && (
          <button onClick={() => setIsSplit((v) => !v)} style={{ alignSelf: "flex-start", background: "none", border: `1px solid ${isSplit ? "var(--accent)" : "var(--border)"}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: isSplit ? "var(--accent)" : "var(--text-muted)", cursor: "pointer" }}>
            ✂ {isSplit ? "Split On" : "Split by Category"}
          </button>
        )}

        {isSplit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <FieldLabel>Split Amounts</FieldLabel>
              <span style={{ fontSize: 12, color: splitRemaining === 0 ? "var(--green)" : splitRemaining < 0 ? "var(--red)" : "var(--amber)", fontWeight: 600 }}>
                {splitRemaining === 0 ? "✓ Balanced" : splitRemaining > 0 ? `${fmt(splitRemaining)} remaining` : `${fmt(Math.abs(splitRemaining))} over`}
              </span>
            </div>
            {splits.map((sp) => (
              <div key={sp.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={sp.categoryId} onChange={(e) => updateSplit(sp.id, "categoryId", e.target.value)} style={{ ...INPUT_STYLE, flex: 2, cursor: "pointer" }}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
                <div style={{ position: "relative", flex: 1 }}>
                  <input type="number" step="0.01" min="0" value={sp.amount} onChange={(e) => updateSplit(sp.id, "amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
                </div>
                {splits.length > 2 && (
                  <button onClick={() => removeSplit(sp.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
            <button onClick={addSplit} style={{ alignSelf: "flex-start", background: "none", border: "1px dashed var(--border)", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>+ Add Split</button>
            {totalAmount > 0 && splitRemaining > 0 && (
              <button onClick={() => updateSplit(splits[splits.length - 1].id, "amount", String(Math.round((parseFloat(splits[splits.length - 1].amount || 0) + splitRemaining) * 100) / 100))}
                style={{ alignSelf: "flex-start", background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
                Fill remaining {fmt(splitRemaining)}
              </button>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label={existing ? "Save Changes" : isSplit ? `Add ${splits.length} Transactions` : "Add Transaction"}
        onSubmit={handleSubmit} />
    </>
  );
}

export function AddCategoryFields({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: "", icon: "●", limit: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.limit) > 0;
  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12 }}>
          <div><FieldLabel>Icon</FieldLabel><input value={form.icon} onChange={(e) => update("icon", e.target.value)} maxLength={2} style={{ ...INPUT_STYLE, textAlign: "center", fontSize: 18 }} /></div>
          <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Subscriptions" style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Monthly Limit ($)</FieldLabel><input type="number" step="1" min="0" value={form.limit} onChange={(e) => update("limit", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Category"
        onSubmit={() => { if (canSubmit) onSubmit({ id: form.name.toLowerCase().replace(/\s+/g, "-"), name: form.name.trim(), icon: form.icon || "●", limit: parseFloat(form.limit) }); }} />
    </>
  );
}

export function EditCategoryFields({ category, onSubmit, onClose }) {
  const [form, setForm] = useState({ name: category.name, icon: category.icon || "●" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim().length > 0;
  const QUICK_ICONS = ["🏠","🛒","🍽","⚡","🎵","❤","👤","🚗","📱","✈","💰","🎓","🐾","👶","🏋","💊","🎮","📦","🛠","🌿","☕","🍕","🎁","📚","🏦","📊","💼","🎨"];
  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12 }}>
          <div><FieldLabel>Icon</FieldLabel><input value={form.icon} onChange={(e) => update("icon", e.target.value)} maxLength={2} style={{ ...INPUT_STYLE, textAlign: "center", fontSize: 18 }} /></div>
          <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Category name" style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Quick Pick</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUICK_ICONS.map((ic) => (
              <button key={ic} onClick={() => update("icon", ic)}
                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)18" : "transparent", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ic}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Save Changes"
        onSubmit={() => { if (canSubmit) onSubmit({ ...category, name: form.name.trim(), icon: form.icon || "●" }); }} />
    </>
  );
}

export function EditLimitFields({ category, onSubmit, onClose }) {
  const [limit, setLimit] = useState(String(category.limit));
  const valid = parseFloat(limit) > 0;
  return (
    <>
      <div style={{ padding: "16px 24px" }}>
        <FieldLabel>Monthly Limit ($)</FieldLabel>
        <input type="number" step="1" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} style={INPUT_STYLE} />
      </div>
      <ModalActions onClose={onClose} canSubmit={valid} label="Save"
        onSubmit={() => { if (valid) onSubmit(category.id, parseFloat(limit)); }} />
    </>
  );
}

// ─────────────────────────────────────────────
// PWA HEAD (App Icon for Home Screen)
// ─────────────────────────────────────────────

