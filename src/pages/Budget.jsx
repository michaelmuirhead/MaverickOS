import { useState, useMemo, useCallback } from "react";
import { Card, CardHeader, MetricBox, ProgressBar, SwipeToDelete, Overlay, DragHandle, useDragToReorder } from "../components/ui.jsx";
import { fmt, fmtCompact, pct, nextId, INPUT_STYLE, pillStyle } from "../engine.js";
import { AddCategoryFields, AddTransactionFields, EditCategoryFields, FieldLabel, ModalActions, ModalForm } from "../components/forms.jsx"

export function getTargetStatus(target, spent, category) {
  if (!target) {
    // Fallback to category limit
    const ratio = category.limit > 0 ? spent / category.limit : 0;
    return { monthlyNeeded: category.limit, progress: ratio, status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track", label: "Monthly Limit" };
  }

  const now = new Date();

  switch (target.type) {
    case "monthly": {
      const limit = target.monthlyAmount || category.limit;
      const ratio = limit > 0 ? spent / limit : 0;
      return {
        monthlyNeeded: limit,
        progress: ratio,
        status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track",
        label: "Monthly Limit",
        effectiveLimit: limit,
      };
    }
    case "target_by_date": {
      const funded = target.funded || 0;
      const goalAmt = target.targetAmount || 0;
      const deadline = new Date(target.targetDate + "T00:00:00");
      const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
      const remaining = Math.max(goalAmt - funded, 0);
      const monthlyNeeded = remaining / monthsLeft;
      const goalProgress = goalAmt > 0 ? funded / goalAmt : 0;
      const isPastDue = deadline < now;
      const isComplete = funded >= goalAmt;
      return {
        monthlyNeeded: Math.ceil(monthlyNeeded * 100) / 100,
        progress: goalProgress,
        status: isComplete ? "complete" : isPastDue ? "over" : goalProgress >= (1 - 1 / Math.max(monthsLeft, 1)) ? "on_track" : "behind",
        label: "Target by Date",
        effectiveLimit: monthlyNeeded,
        funded,
        goalAmt,
        deadline: target.targetDate,
        monthsLeft,
        remaining,
        isComplete,
      };
    }
    case "weekly": {
      const weeklyLimit = target.weeklyAmount || 0;
      const monthlyEquiv = weeklyLimit * 52 / 12;
      const ratio = monthlyEquiv > 0 ? spent / monthlyEquiv : 0;
      return {
        monthlyNeeded: monthlyEquiv,
        progress: ratio,
        status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track",
        label: "Weekly Limit",
        effectiveLimit: monthlyEquiv,
        weeklyAmount: weeklyLimit,
      };
    }
    default: {
      const limit = category.limit;
      const ratio = limit > 0 ? spent / limit : 0;
      return { monthlyNeeded: limit, progress: ratio, status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track", label: "Monthly Limit", effectiveLimit: limit };
    }
  }
}

export function TargetStatusBadge({ status }) {
  const config = {
    on_track: { bg: "var(--green-bg)", fg: "var(--green)", text: "On Track" },
    warning: { bg: "var(--amber-bg)", fg: "var(--amber)", text: "Warning" },
    over: { bg: "var(--red-bg)", fg: "var(--red)", text: "Over" },
    behind: { bg: "var(--amber-bg)", fg: "var(--amber)", text: "Behind" },
    complete: { bg: "var(--green-bg)", fg: "var(--green)", text: "Complete" },
  }[status] || { bg: "var(--green-bg)", fg: "var(--green)", text: "OK" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999, background: config.bg, color: config.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: config.fg }} />
      {config.text}
    </span>
  );
}

export function EditTargetFields({ category, target, onSubmit, onClose }) {
  const existing = target || { type: "monthly", monthlyAmount: category.limit };
  const [type, setType] = useState(existing.type || "monthly");
  const [monthlyAmount, setMonthlyAmount] = useState(String(existing.monthlyAmount || category.limit || ""));
  const [targetAmount, setTargetAmount] = useState(String(existing.targetAmount || ""));
  const [targetDate, setTargetDate] = useState(existing.targetDate || "2026-12-31");
  const [funded, setFunded] = useState(String(existing.funded || "0"));
  const [weeklyAmount, setWeeklyAmount] = useState(String(existing.weeklyAmount || ""));

  const canSubmit = (() => {
    if (type === "monthly") return parseFloat(monthlyAmount) > 0;
    if (type === "target_by_date") return parseFloat(targetAmount) > 0 && targetDate;
    if (type === "weekly") return parseFloat(weeklyAmount) > 0;
    return false;
  })();

  const handleSave = () => {
    if (!canSubmit) return;
    let result;
    switch (type) {
      case "monthly":
        result = { type: "monthly", monthlyAmount: parseFloat(monthlyAmount) };
        break;
      case "target_by_date":
        result = { type: "target_by_date", targetAmount: parseFloat(targetAmount), targetDate, funded: parseFloat(funded) || 0 };
        break;
      case "weekly":
        result = { type: "weekly", weeklyAmount: parseFloat(weeklyAmount) };
        break;
      default: return;
    }
    onSubmit(category.id, result);
  };

  // Calculate preview for target_by_date
  const previewMonthly = (() => {
    if (type !== "target_by_date") return null;
    const goal = parseFloat(targetAmount) || 0;
    const f = parseFloat(funded) || 0;
    const deadline = new Date(targetDate + "T00:00:00");
    const now = new Date();
    const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
    const remaining = Math.max(goal - f, 0);
    return { monthlyNeeded: remaining / monthsLeft, monthsLeft, remaining };
  })();

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Type selector */}
        <div>
          <FieldLabel>Target Type</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {TARGET_TYPES.map((tt) => (
              <div key={tt.id} onClick={() => setType(tt.id)}
                style={{
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${type === tt.id ? "var(--accent)" : "var(--border)"}`,
                  background: type === tt.id ? "var(--accent)" + "10" : "transparent",
                  transition: "all 0.15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{tt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: type === tt.id ? "var(--text-primary)" : "var(--text-secondary)" }}>{tt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tt.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields based on type */}
        {type === "monthly" && (
          <div>
            <FieldLabel>Monthly Limit ($)</FieldLabel>
            <input type="number" step="1" min="0" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
          </div>
        )}

        {type === "target_by_date" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Target Amount ($)</FieldLabel>
                <input type="number" step="1" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
              </div>
              <div>
                <FieldLabel>Target Date</FieldLabel>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
            <div>
              <FieldLabel>Already Funded ($)</FieldLabel>
              <input type="number" step="1" min="0" value={funded} onChange={(e) => setFunded(e.target.value)} placeholder="0" style={INPUT_STYLE} />
            </div>
            {previewMonthly && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>To reach your goal:</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(previewMonthly.monthlyNeeded)}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>/mo</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {fmt(previewMonthly.remaining)} left · {previewMonthly.monthsLeft} month{previewMonthly.monthsLeft !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {type === "weekly" && (
          <div>
            <FieldLabel>Weekly Limit ($)</FieldLabel>
            <input type="number" step="1" min="0" value={weeklyAmount} onChange={(e) => setWeeklyAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
            {parseFloat(weeklyAmount) > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                ≈ {fmt(parseFloat(weeklyAmount) * 52 / 12)} per month
              </div>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Save Target" onSubmit={handleSave} />
    </>
  );
}

export function FundTargetFields({ category, target, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = (target?.targetAmount || 0) - (target?.funded || 0);
  const canSubmit = parseFloat(amount) > 0;
  const quickAmounts = [25, 50, 100, 250].filter((a) => a <= remaining + 10);

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Progress</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(target?.funded || 0)} of {fmt(target?.targetAmount || 0)}
            </span>
          </div>
          <ProgressBar value={target?.funded || 0} max={target?.targetAmount || 1} color="var(--accent)" height={6} />
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {fmt(remaining)} remaining
          </div>
        </div>
        <div>
          <FieldLabel>Fund Amount ($)</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
        </div>
        {quickAmounts.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {quickAmounts.map((qa) => (
              <button key={qa} onClick={() => setAmount(String(qa))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === qa ? "var(--accent)" : "transparent",
                  color: parseFloat(amount) === qa ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                ${qa}
              </button>
            ))}
            {remaining > 0 && (
              <button onClick={() => setAmount(String(remaining))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === remaining ? "var(--green)" : "transparent",
                  color: parseFloat(amount) === remaining ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                Fill
              </button>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Funds"
        onSubmit={() => { if (canSubmit) onSubmit(category.id, parseFloat(amount)); }} />
    </>
  );
}

// ─────────────────────────────────────────────
// BUDGET PAGE
// ─────────────────────────────────────────────

export function CategoryCard({ category, transactions, onExpand, isExpanded, onEditTarget, onFundTarget, onAddTx, onEditCategory, target, rollover }) {
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const tStatus = getTargetStatus(target, spent, category);
  const isTargetByDate = target?.type === "target_by_date";
  const isWeekly = target?.type === "weekly";
  const baseLimit = tStatus.effectiveLimit || tStatus.monthlyNeeded || category.limit;
  const effectiveLimit = baseLimit + (rollover || 0);
  const diff = isTargetByDate ? (tStatus.goalAmt || 0) - (tStatus.funded || 0) : effectiveLimit - spent;

  return (
    <div
      style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.2s, border-color 0.2s", cursor: "pointer",
      }}
      onClick={() => onExpand(isExpanded ? null : category.id)}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "0 2px 12px var(--shadow)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{category.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{category.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                {TARGET_TYPES.find((t) => t.id === (target?.type || "monthly"))?.icon || "📅"}{" "}
                {tStatus.label}
                {isWeekly && ` · ${fmt(tStatus.weeklyAmount)}/wk`}
                {!isTargetByDate && ` · ${transactions.length} txn${transactions.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEditCategory && onEditCategory(category); }}
              style={{ background: "none", border: "1px solid transparent", padding: "4px 6px", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <TargetStatusBadge status={tStatus.status} />
          </div>
        </div>

        {isTargetByDate ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(tStatus.funded || 0)}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>of {fmt(tStatus.goalAmt)}</span>
            </div>
            <ProgressBar value={tStatus.funded || 0} max={tStatus.goalAmt || 1} color="var(--accent)" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
              <span style={{ color: tStatus.isComplete ? "var(--green)" : "var(--amber)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {tStatus.isComplete ? "Goal reached!" : `${fmt(tStatus.remaining)} to go · ${fmt(tStatus.monthlyNeeded)}/mo`}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {!tStatus.isComplete && `${tStatus.monthsLeft}mo left`}
              </span>
            </div>
            {!tStatus.isComplete && tStatus.deadline && (
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                Due {new Date(tStatus.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(spent)}</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>of {fmt(effectiveLimit)}</span>
                {rollover > 0 && (
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>
                    +{fmt(rollover)} rolled over
                  </div>
                )}
              </div>
            </div>
            <ProgressBar value={spent} max={effectiveLimit} />
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: tStatus.status === "on_track" || tStatus.status === "complete" ? "var(--green)" : tStatus.status === "warning" || tStatus.status === "behind" ? "var(--amber)" : "var(--red)" }}>
              {diff >= 0 ? `${fmt(diff)} remaining` : `${fmt(Math.abs(diff))} over budget`}
            </div>
          </>
        )}
      </div>

      {isExpanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", maxHeight: 360, overflowY: "auto" }}>
          <div style={{ padding: "8px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Transactions</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onAddTx && onAddTx(category); }}
                style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                + Add
              </button>
              {isTargetByDate && !tStatus.isComplete && (
                <button onClick={(e) => { e.stopPropagation(); onFundTarget(category); }}
                  style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  + Fund
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onEditTarget(category); }}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
                Edit Target
              </button>
            </div>
          </div>
          {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{t.description}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(t.amount)}</div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No transactions yet</div>}
        </div>
      )}
    </div>
  );
}

// Compact list row — used in both List view and Custom Order drag mode
export function CategoryListRow({ category, transactions, target, rollover, onAddTx, onEditTarget, onFundTarget, onEditCategory, dragHandle, isDragging, isOver, listId, dragIdx }) {
  const [expanded, setExpanded] = useState(false);
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const tStatus = getTargetStatus(target, spent, category);
  const isTargetByDate = target?.type === "target_by_date";
  const effectiveLimit = tStatus.effectiveLimit || tStatus.monthlyNeeded || category.limit;
  const diff = effectiveLimit - spent;

  return (
    <div
      data-drag-list={listId} data-drag-item={dragIdx}
      style={{ opacity: isDragging ? 0.35 : 1, borderRadius: 12, border: `2px solid ${isOver ? "var(--accent)" : "var(--border)"}`, background: "var(--card)", transition: "border-color 0.15s, opacity 0.15s", marginBottom: 2 }}
    >
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer" }} onClick={() => setExpanded((v) => !v)}>
        {dragHandle}
        {/* Icon */}
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
          {category.icon}
        </div>
        {/* Name + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
            {category.name}
            <button onClick={(e) => { e.stopPropagation(); onEditCategory && onEditCategory(category); }}
              style={{ background: "none", border: "none", padding: "0 2px", cursor: "pointer", color: "var(--text-muted)", lineHeight: 1, flexShrink: 0 }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          {/* Progress bar inline */}
          {effectiveLimit > 0 && (
            <div style={{ marginTop: 4 }}>
              <ProgressBar value={spent} max={effectiveLimit} height={4} />
            </div>
          )}
        </div>
        {/* Amount + status */}
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}>
          <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{fmt(spent)}</div>
          {effectiveLimit > 0 && (
            <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", color: diff >= 0 ? "var(--green)" : "var(--red)", fontWeight: 600, marginTop: 1 }}>
              {diff >= 0 ? `${fmt(diff)} left` : `${fmt(Math.abs(diff))} over`}
            </div>
          )}
        </div>
        <TargetStatusBadge status={tStatus.status} />
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--text-muted)", flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded transactions panel */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", maxHeight: 320, overflowY: "auto" }}>
          <div style={{ padding: "8px 14px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Transactions</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={(e) => { e.stopPropagation(); onAddTx && onAddTx(category); }}
                style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Add</button>
              {isTargetByDate && !tStatus.isComplete && (
                <button onClick={(e) => { e.stopPropagation(); onFundTarget(category); }}
                  style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>+ Fund</button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onEditTarget(category); }}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>Edit Target</button>
            </div>
          </div>
          {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{t.description}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(t.amount)}</div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{ padding: "16px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No transactions yet</div>}
        </div>
      )}
    </div>
  );
}

export function DraggableCategoryList({ categories, setCategories, txByCategory, budgetTargets, onAddTx, onEditTarget, onFundTarget, onEditCategory, currentRollovers }) {
  const { dragIndex, overIndex, startDrag, listId } = useDragToReorder(categories, setCategories);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
        Drag the handles to reorder. Switch to another sort mode to restore automatic ordering.
      </div>
      {categories.map((cat, idx) => (
        <CategoryListRow
          key={cat.id}
          category={cat}
          transactions={txByCategory[cat.id] || []}
          target={budgetTargets[cat.id] || null}
          rollover={currentRollovers[cat.id] || 0}
          onAddTx={onAddTx} onEditTarget={onEditTarget} onFundTarget={onFundTarget} onEditCategory={onEditCategory}
          dragHandle={<DragHandle onPointerDown={(e) => startDrag(e, idx)} />}
          isDragging={dragIndex === idx}
          isOver={overIndex === idx && dragIndex !== null && dragIndex !== idx}
          listId={listId} dragIdx={idx}
        />
      ))}
    </div>
  );
}

export function BudgetPage({ categories, transactions, setCategories, setTransactions, income, budgetTargets, setBudgetTargets, budgetRollovers, setBudgetRollovers, showUndo, settings }) {
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [sortBy, setSortBy] = useState("status");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [viewDate, setViewDate] = useState(() => new Date());

  const startDay = settings?.startDayOfMonth || 1;

  // Compute period as stable string keys to avoid useMemo churn
  const periodStartStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const periodStartDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), startDay);
  const periodEndDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, startDay - 1);
  const periodEndStr = periodEndDate.toISOString().split("T")[0];

  const year = periodStartDate.getFullYear();
  const month = periodStartDate.getMonth();
  const monthName = startDay === 1
    ? viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${periodStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(year, month - 1, startDay);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  // Compute prev period date range
  const prevPeriodStartDate = new Date(year, month - 1, startDay);
  const prevPeriodEndDate = new Date(year, month, startDay - 1);
  const prevPeriodStartStr = `${prevPeriodStartDate.getFullYear()}-${String(prevPeriodStartDate.getMonth() + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const prevPeriodEndStr = prevPeriodEndDate.toISOString().split("T")[0];
  const prevMonthName = prevMonthDate.toLocaleDateString("en-US", { month: "long" });

  const prevMonth = () => { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); setExpandedId(null); };
  const nextMonth = () => { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); setExpandedId(null); };

  // Filter transactions to period
  const monthTransactions = useMemo(() => {
    if (startDay === 1) return transactions.filter((t) => t.date.startsWith(currentMonthKey));
    return transactions.filter((t) => t.date >= periodStartStr && t.date <= periodEndStr);
  }, [transactions, currentMonthKey, startDay, periodStartStr, periodEndStr]);

  const txByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = []));
    monthTransactions.forEach((t) => { if (map[t.categoryId]) map[t.categoryId].push(t); });
    return map;
  }, [categories, monthTransactions]);

  // Current month's rollovers (carried from previous month)
  const currentRollovers = budgetRollovers[currentMonthKey] || {};
  const totalRolledOver = Object.values(currentRollovers).reduce((s, v) => s + v, 0);

  // Calculate what COULD be rolled over from previous month (unspent budget)
  // Previous period's transactions — use date range for custom start days
  const prevMonthTransactions = useMemo(() => {
    if (startDay === 1) return transactions.filter((t) => t.date.startsWith(prevMonthKey));
    return transactions.filter((t) => t.date >= prevPeriodStartStr && t.date <= prevPeriodEndStr);
  }, [transactions, prevMonthKey, startDay, prevPeriodStartStr, prevPeriodEndStr]);

  const prevTxByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = []));
    prevMonthTransactions.forEach((t) => { if (map[t.categoryId]) map[t.categoryId].push(t); });
    return map;
  }, [categories, prevMonthTransactions]);

  const prevMonthUnspent = useMemo(() => {
    const unspent = {};
    let totalAvailable = 0;
    categories.forEach((c) => {
      const target = budgetTargets[c.id];
      if (target?.type === "target_by_date") return; // don't roll over date targets
      const spent = (prevTxByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
      const tStatus = getTargetStatus(target, spent, c);
      const limit = tStatus.effectiveLimit || tStatus.monthlyNeeded || c.limit;
      const remaining = limit - spent;
      if (remaining > 0) {
        unspent[c.id] = Math.round(remaining * 100) / 100;
        totalAvailable += remaining;
      }
    });
    return { byCat: unspent, total: totalAvailable };
  }, [categories, prevTxByCategory, budgetTargets]);

  // Has rollover already been applied this month?
  const rolloverApplied = Object.keys(currentRollovers).length > 0;

  const handleApplyRollovers = () => {
    setBudgetRollovers((prev) => ({ ...prev, [currentMonthKey]: prevMonthUnspent.byCat }));
  };

  const handleClearRollovers = () => {
    setBudgetRollovers((prev) => {
      const next = { ...prev };
      delete next[currentMonthKey];
      return next;
    });
  };

  const sortedCategories = useMemo(() => {
    const arr = [...categories];
    if (sortBy === "name") return arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "spent") return arr.sort((a, b) => (txByCategory[b.id]?.reduce((s, t) => s + t.amount, 0) || 0) - (txByCategory[a.id]?.reduce((s, t) => s + t.amount, 0) || 0));
    return arr.sort((a, b) => {
      const spentA = txByCategory[a.id]?.reduce((s, t) => s + t.amount, 0) || 0;
      const spentB = txByCategory[b.id]?.reduce((s, t) => s + t.amount, 0) || 0;
      const limA = getTargetStatus(budgetTargets[a.id], spentA, a).effectiveLimit || a.limit;
      const limB = getTargetStatus(budgetTargets[b.id], spentB, b).effectiveLimit || b.limit;
      return (spentB / limB) - (spentA / limA);
    });
  }, [categories, sortBy, txByCategory, budgetTargets]);

  // Income-aware calculations
  const totalIncome = income.reduce((s, i) => {
    if (!i.recurring) return s + i.amount;
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

  // Use target-aware totals (including rollovers)
  const totalBudgeted = categories.reduce((s, c) => {
    const spent = (txByCategory[c.id] || []).reduce((sum, t) => sum + t.amount, 0);
    const ts = getTargetStatus(budgetTargets[c.id], spent, c);
    const base = ts.effectiveLimit || ts.monthlyNeeded || c.limit;
    const ro = currentRollovers[c.id] || 0;
    return s + base + ro;
  }, 0);
  const totalSpent = monthTransactions.reduce((s, t) => s + t.amount, 0);
  const unbudgeted = totalIncome - totalBudgeted + totalRolledOver;
  const overCount = categories.filter((c) => {
    const spent = (txByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
    const ts = getTargetStatus(budgetTargets[c.id], spent, c);
    const limit = (ts.effectiveLimit || ts.monthlyNeeded || c.limit) + (currentRollovers[c.id] || 0);
    return spent > limit;
  }).length;
  const targetByDateCount = categories.filter((c) => budgetTargets[c.id]?.type === "target_by_date").length;
  const rolloverCatCount = Object.keys(currentRollovers).filter((k) => currentRollovers[k] > 0).length;

  const handleSaveTarget = (catId, targetData) => {
    setBudgetTargets((prev) => ({ ...prev, [catId]: targetData }));
    // Also sync the category limit for backward compatibility
    if (targetData.type === "monthly") {
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, limit: targetData.monthlyAmount } : c));
    } else if (targetData.type === "weekly") {
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, limit: Math.round(targetData.weeklyAmount * 52 / 12) } : c));
    }
    setModal(null);
  };

  const handleFund = (catId, amount) => {
    setBudgetTargets((prev) => {
      const existing = prev[catId];
      if (!existing || existing.type !== "target_by_date") return prev;
      return { ...prev, [catId]: { ...existing, funded: (existing.funded || 0) + amount } };
    });
    setModal(null);
  };

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Budget Tracker</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            {targetByDateCount > 0 ? `${targetByDateCount} date target${targetByDateCount > 1 ? "s" : ""}` : "Track spending by category"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModal("addCat")} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Category</button>
          <button onClick={() => setModal("addTx")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Transaction</button>
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Income vs Budget bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Income vs Budget</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
              {fmt(totalBudgeted)} budgeted of {fmt(totalIncome)} income
            </span>
          </div>
          <div style={{ position: "relative", height: 12, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.min((totalBudgeted / totalIncome) * 100, 100)}%`, background: totalBudgeted > totalIncome ? "var(--red)" : "var(--accent)", borderRadius: 6, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.min((totalSpent / totalIncome) * 100, 100)}%`, background: "var(--green)", borderRadius: 6, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)", opacity: 0.6 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", opacity: 0.6 }} />Spent {fmt(totalSpent)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />Budgeted {fmt(totalBudgeted)}</span>
            </div>
            <span style={{ fontWeight: 600, color: unbudgeted >= 0 ? "var(--green)" : "var(--red)" }}>
              {unbudgeted >= 0 ? `${fmt(unbudgeted)} unbudgeted` : `${fmt(Math.abs(unbudgeted))} over income`}
            </span>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Income" value={fmt(totalIncome)} sub={`${income.length} sources`} accent="var(--green)" />
        <MetricBox label="Total Budgeted" value={fmt(totalBudgeted)} sub={`${categories.length} categories`} accent="var(--accent)" />
        <MetricBox label="Total Spent" value={fmt(totalSpent)} sub={`${pct(totalSpent, totalBudgeted).toFixed(0)}% of budget`} accent="var(--red)" />
        <MetricBox label="Unbudgeted" value={fmt(Math.abs(unbudgeted))} sub={unbudgeted >= 0 ? "available to assign" : "over income"} accent={unbudgeted >= 0 ? "var(--green)" : "var(--red)"} />
        <MetricBox label="Categories Over" value={overCount} sub={overCount === 0 ? "all on track" : "need attention"} accent={overCount > 0 ? "var(--red)" : "var(--green)"} />
      </div>

      {/* Spending alerts */}
      {(() => {
        const alerts = categories.map((c) => {
          const spent = (txByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
          const ts = getTargetStatus(budgetTargets[c.id], spent, c);
          const limit = (ts.effectiveLimit || ts.monthlyNeeded || c.limit) + (currentRollovers[c.id] || 0);
          if (!limit || limit <= 0) return null;
          const ratio = spent / limit;
          if (ratio >= 1) return { cat: c, spent, limit, ratio, type: "over" };
          if (ratio >= 0.8) return { cat: c, spent, limit, ratio, type: "warning" };
          return null;
        }).filter(Boolean);
        if (alerts.length === 0) return null;
        return (
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map(({ cat, spent, limit, ratio, type }) => (
              <div key={cat.id} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${type === "over" ? "var(--red)44" : "var(--amber)44"}`, background: type === "over" ? "var(--red-bg)" : "var(--amber-bg, var(--surface))", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                    {fmt(spent)} of {fmt(limit)} · {(ratio * 100).toFixed(0)}%
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: type === "over" ? "var(--red)" : "var(--amber)" }}>
                  {type === "over" ? `${fmt(spent - limit)} over` : "Near limit"}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Budget Rollover Card */}
      {(prevMonthUnspent.total > 0 || rolloverApplied) && (
        <Card style={{ marginBottom: 20, borderColor: rolloverApplied ? "var(--accent)" : "var(--border)" }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rolloverApplied ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: rolloverApplied ? "var(--accent)" + "18" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {rolloverApplied ? "✓" : "↻"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {rolloverApplied ? "Rollovers Applied" : "Roll Over Unspent Budget"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {rolloverApplied
                      ? `${fmt(totalRolledOver)} carried forward across ${rolloverCatCount} categor${rolloverCatCount === 1 ? "y" : "ies"}`
                      : `${fmt(prevMonthUnspent.total)} unspent from ${prevMonthName} available to roll forward`
                    }
                  </div>
                </div>
              </div>
              {rolloverApplied ? (
                <button onClick={handleClearRollovers}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Undo
                </button>
              ) : (
                <button onClick={handleApplyRollovers}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Roll Over
                </button>
              )}
            </div>

            {/* Per-category rollover detail (only show when applied) */}
            {rolloverApplied && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.filter((c) => (currentRollovers[c.id] || 0) > 0).map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 12, color: "var(--text-secondary)",
                    }}>
                      <span>{c.icon}</span>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>+{fmt(currentRollovers[c.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of what will roll over (before applying) */}
            {!rolloverApplied && prevMonthUnspent.total > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Unspent by Category
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.filter((c) => (prevMonthUnspent.byCat[c.id] || 0) > 0).map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 12, color: "var(--text-secondary)",
                    }}>
                      <span>{c.icon}</span>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(prevMonthUnspent.byCat[c.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Sort + View controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ key: "status", label: "By Status" }, { key: "spent", label: "By Spent" }, { key: "name", label: "By Name" }, { key: "manual", label: "⠿ Custom Order" }].map((s) => (
            <button key={s.key} onClick={() => { setSortBy(s.key); setExpandedId(null); }} style={pillStyle(sortBy === s.key)}>{s.label}</button>
          ))}
        </div>
        {/* List / Grid view toggle — hidden in Custom Order mode */}
        {sortBy !== "manual" && (
          <div style={{ display: "flex", gap: 4, padding: "3px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)" }}>
            {[
              { mode: "grid", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
              { mode: "list", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
            ].map(({ mode, icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ padding: "5px 9px", borderRadius: 6, border: "none", background: viewMode === mode ? "var(--text-primary)" : "transparent", color: viewMode === mode ? "var(--card)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.15s" }}>
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Custom Order (drag-to-reorder list with full info) */}
      {sortBy === "manual" && (
        <DraggableCategoryList
          categories={categories} setCategories={setCategories}
          txByCategory={txByCategory} budgetTargets={budgetTargets}
          currentRollovers={currentRollovers}
          onAddTx={(c) => setModal({ type: "addTx", categoryId: c.id })}
          onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
          onFundTarget={(c) => setModal({ type: "fund", category: c })}
          onEditCategory={(c) => setModal({ type: "editCat", category: c })}
        />
      )}

      {/* List view */}
      {sortBy !== "manual" && viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sortedCategories.map((cat) => (
            <CategoryListRow
              key={cat.id}
              category={cat}
              transactions={txByCategory[cat.id] || []}
              target={budgetTargets[cat.id] || null}
              rollover={currentRollovers[cat.id] || 0}
              onAddTx={(c) => setModal({ type: "addTx", categoryId: c.id })}
              onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
              onFundTarget={(c) => setModal({ type: "fund", category: c })}
              onEditCategory={(c) => setModal({ type: "editCat", category: c })}
            />
          ))}
        </div>
      )}

      {/* Grid view (default) */}
      {sortBy !== "manual" && viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14, alignItems: "start" }}>
          {sortedCategories.map((cat) => (
            <SwipeToDelete key={cat.id} onDelete={() => { showUndo(`Deleted "${cat.name}" category`); setCategories((prev) => prev.filter((c) => c.id !== cat.id)); }}>
              <CategoryCard category={cat} transactions={txByCategory[cat.id] || []}
                target={budgetTargets[cat.id] || null}
                rollover={currentRollovers[cat.id] || 0}
                isExpanded={expandedId === cat.id} onExpand={setExpandedId}
                onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
                onFundTarget={(c) => setModal({ type: "fund", category: c })}
                onAddTx={(c) => setModal({ type: "addTx", categoryId: c.id })}
                onEditCategory={(c) => setModal({ type: "editCat", category: c })}
              />
            </SwipeToDelete>
          ))}
        </div>
      )}

      {(modal === "addTx" || modal?.type === "addTx") && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title="Add Transaction">
            <AddTransactionFields
              categories={categories}
              prefilledCategoryId={modal?.categoryId || null}
              onSubmit={(tx, isSplit) => { setTransactions((p) => isSplit ? [...p, ...tx] : [...p, tx]); setModal(null); }}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
      {modal === "addCat" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title="Add Category">
            <AddCategoryFields onSubmit={(cat) => { setCategories((p) => [...p, cat]); setModal(null); }} onClose={() => setModal(null)} />
          </ModalForm>
        </Overlay>
      )}
      {modal?.type === "editTarget" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`${modal.category.icon} ${modal.category.name} — Set Target`}>
            <EditTargetFields
              category={modal.category}
              target={budgetTargets[modal.category.id]}
              onSubmit={handleSaveTarget}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
      {modal?.type === "fund" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`${modal.category.icon} ${modal.category.name} — Add Funds`}>
            <FundTargetFields
              category={modal.category}
              target={budgetTargets[modal.category.id]}
              onSubmit={handleFund}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}

      {modal?.type === "editCat" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`Edit Category`}>
            <EditCategoryFields
              category={modal.category}
              onSubmit={(updated) => {
                setCategories((prev) => prev.map((c) => c.id === updated.id ? updated : c));
                showUndo(`Updated "${updated.name}"`);
                setModal(null);
              }}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}

      {/* Target type legend */}
      <div style={{ marginTop: 20, padding: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          {TARGET_TYPES.map((tt) => (
            <div key={tt.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
              <span>{tt.icon}</span>
              <span>{tt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL FORM COMPONENTS
// ─────────────────────────────────────────────

