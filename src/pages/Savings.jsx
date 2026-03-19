import { useState } from "react";
import { Card, CardHeader, ProgressBar, SwipeToDelete, Overlay, DragHandle, useDragToReorder } from "../components/ui.jsx";
import { fmt, fmtCompact, pct, nextId, INPUT_STYLE } from "../engine.js";

export function SavingsPage({ savingsGoals, setSavingsGoals, showUndo, categories, setCategories, setTransactions, budgetTargets, setBudgetTargets }) {
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [reordering, setReordering] = useState(false);

  const totalSaved = savingsGoals.reduce((s, g) => s + g.current, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const completedCount = savingsGoals.filter((g) => g.current >= g.target).length;

  const addContribution = (goalId, amount) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    const today = new Date().toISOString().split("T")[0];
    // Update savings goal
    setSavingsGoals((prev) => prev.map((g) => g.id === goalId ? {
      ...g, current: g.current + amount,
      contributions: [...g.contributions, { date: today, amount }],
    } : g));
    // Log as a transaction in the savings budget category
    const catId = `savings_${goalId}`;
    if (setTransactions) {
      setTransactions((prev) => [...prev, {
        id: nextId(), categoryId: catId,
        description: `${goal?.name || "Savings"} contribution`,
        amount, date: today,
      }]);
    }
    setModal(null);
  };

  const addGoal = (goal) => {
    setSavingsGoals((prev) => [...prev, goal]);
    // Auto-create a matching budget category + target
    const catId = `savings_${goal.id}`;
    if (setCategories) {
      setCategories((prev) => {
        if (prev.find((c) => c.id === catId)) return prev;
        return [...prev, { id: catId, name: goal.name, icon: goal.icon || "💰", limit: goal.monthlyContribution || 0, color: goal.color || "var(--accent)" }];
      });
    }
    if (setBudgetTargets && goal.target > 0) {
      setBudgetTargets((prev) => ({
        ...prev,
        [catId]: {
          type: "target_by_date",
          targetAmount: goal.target,
          targetDate: goal.deadline || "",
          funded: goal.current || 0,
        },
      }));
    }
    setModal(null);
  };

  const updateGoal = (updated) => {
    setSavingsGoals((prev) => prev.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
    // Sync budget category name/icon
    const catId = `savings_${updated.id}`;
    if (setCategories) {
      setCategories((prev) => prev.map((c) => c.id === catId
        ? { ...c, name: updated.name, icon: updated.icon || c.icon, color: updated.color || c.color }
        : c));
    }
    if (setBudgetTargets && updated.target > 0) {
      setBudgetTargets((prev) => ({
        ...prev,
        [catId]: {
          type: "target_by_date",
          targetAmount: updated.target,
          targetDate: updated.deadline || "",
          funded: updated.current || 0,
        },
      }));
    }
    setModal(null);
  };

  const deleteGoal = (id) => {
    const goal = savingsGoals.find((g) => g.id === id);
    if (showUndo && goal) showUndo(`Deleted "${goal.name}" goal`);
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    // Remove matching budget category
    const catId = `savings_${id}`;
    if (setCategories) setCategories((prev) => prev.filter((c) => c.id !== catId));
    if (setBudgetTargets) setBudgetTargets((prev) => { const next = { ...prev }; delete next[catId]; return next; });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Savings Goals</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track progress toward your financial goals</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {savingsGoals.length > 1 && (
            <button onClick={() => { setReordering((v) => !v); setExpandedId(null); }} style={{
              padding: "10px 14px", borderRadius: 10, border: `1px solid ${reordering ? "var(--accent)" : "var(--border)"}`,
              background: reordering ? "var(--accent)18" : "transparent", color: reordering ? "var(--accent)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>⠿ Reorder</button>
          )}
          <button onClick={() => setModal("add")} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ New Goal</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Total Saved" value={fmt(totalSaved)} sub={`${pct(totalSaved, totalTarget).toFixed(0)}% of all goals`} accent="var(--green)" />
        <MetricBox label="Total Target" value={fmtCompact(totalTarget)} sub={`${fmt(totalTarget - totalSaved)} remaining`} />
        <MetricBox label="Monthly Savings" value={fmt(totalMonthly)} sub="combined contributions" accent="var(--accent)" />
        <MetricBox label="Goals Complete" value={`${completedCount}/${savingsGoals.length}`} sub={completedCount === savingsGoals.length && savingsGoals.length > 0 ? "all done!" : `${savingsGoals.length - completedCount} in progress`} accent={completedCount > 0 ? "var(--green)" : "var(--text-muted)"} />
      </div>

      {/* Goal cards */}
      {reordering && (
        <DraggableSimpleList
          items={savingsGoals}
          onReorder={setSavingsGoals}
          renderItem={(g) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{g.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmt(g.current)} / {fmt(g.target)}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{pct(g.current, g.target).toFixed(0)}%</span>
            </div>
          )}
        />
      )}
      <div style={{ display: reordering ? "none" : "flex", flexDirection: "column", gap: 14 }}>
        {savingsGoals.map((goal) => {
          const percent = pct(goal.current, goal.target);
          const isComplete = goal.current >= goal.target;
          const remaining = Math.max(goal.target - goal.current, 0);
          const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
          const isExpanded = expandedId === goal.id;

          // Deadline info
          const deadline = goal.deadline ? new Date(goal.deadline + "T00:00:00") : null;
          const daysToDeadline = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null;
          const onTrack = deadline && goal.monthlyContribution > 0
            ? (remaining / goal.monthlyContribution) <= (daysToDeadline / 30)
            : null;

          return (
            <SwipeToDelete key={goal.id} onDelete={() => deleteGoal(goal.id)}>
              <Card>
              <div
                style={{ padding: "20px", cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : goal.id)}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: (goal.color || "var(--accent)") + "18",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    }}>{goal.icon}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{goal.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                        <span>{fmt(goal.monthlyContribution)}/mo</span>
                        {deadline && (
                          <span style={{ color: daysToDeadline <= 60 ? "var(--amber)" : "var(--text-muted)" }}>
                            Due {deadline.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {isComplete ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 12px", borderRadius: 999,
                        background: "var(--green-bg)", color: "var(--green)",
                        fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Complete
                      </span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: goal.color || "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                          {percent.toFixed(0)}%
                        </div>
                        {onTrack !== null && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: onTrack ? "var(--green)" : "var(--amber)", marginTop: 2 }}>
                            {onTrack ? "On Track" : "Behind"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar value={goal.current} max={goal.target} color={isComplete ? "var(--green)" : goal.color || "var(--accent)"} height={10} />

                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(goal.current)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>of {fmt(goal.target)}</span>
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!isComplete && monthsLeft && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>~{monthsLeft}mo left</span>
                    )}
                    {!isComplete && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(remaining)} to go</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                  {/* Action buttons */}
                  <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    {!isComplete && (
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "contribute", goal }); }}
                        style={{
                          padding: "8px 16px", borderRadius: 8, border: "none",
                          background: goal.color || "var(--accent)", color: "#fff",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>+ Add Contribution</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", goal }); }}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "transparent",
                        color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>Edit Goal</button>
                  </div>

                  {/* Contribution history */}
                  <div style={{ padding: "8px 20px 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      Contribution History
                    </span>
                  </div>

                  {/* Contribution bar chart — monthly rollup */}
                  {goal.contributions.length >= 2 && (() => {
                    // Roll up contributions by month
                    const byMonth = {};
                    goal.contributions.forEach((c) => {
                      const mk = c.date.substring(0, 7);
                      byMonth[mk] = (byMonth[mk] || 0) + c.amount;
                    });
                    const months = Object.keys(byMonth).sort().slice(-8);
                    const amounts = months.map((mk) => byMonth[mk]);
                    const maxAmt = Math.max(...amounts, 1);
                    const cbW = 400, cbH = 80;
                    const cbPad = { top: 6, right: 8, bottom: 22, left: 44 };
                    const cbInW = cbW - cbPad.left - cbPad.right;
                    const cbInH = cbH - cbPad.top - cbPad.bottom;
                    const bw = Math.max((cbInW - 6 * (months.length - 1)) / months.length, 12);
                    const barColor = goal.color || "var(--accent)";
                    return (
                      <div style={{ padding: "4px 20px 0", overflowX: "auto" }}>
                        <svg viewBox={`0 0 ${cbW} ${cbH}`} style={{ width: "100%", maxHeight: 90 }} preserveAspectRatio="xMidYMid meet">
                          {/* Y tick lines */}
                          {[0, 0.5, 1].map((f) => {
                            const v = maxAmt * (1 - f);
                            const y = cbPad.top + cbInH * f;
                            return (
                              <g key={f}>
                                <line x1={cbPad.left} y1={y} x2={cbW - cbPad.right} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                                <text x={cbPad.left - 5} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                                  {v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`}
                                </text>
                              </g>
                            );
                          })}
                          {/* Bars */}
                          {months.map((mk, i) => {
                            const amt = amounts[i];
                            const bh = (amt / maxAmt) * cbInH;
                            const x = cbPad.left + i * (bw + 6);
                            const y = cbPad.top + cbInH - bh;
                            const d = new Date(mk + "-01T00:00:00");
                            const label = d.toLocaleDateString("en-US", { month: "short" });
                            const isLatest = i === months.length - 1;
                            return (
                              <g key={mk}>
                                <rect x={x} y={y} width={bw} height={bh} rx={3}
                                  fill={barColor} opacity={isLatest ? 1 : 0.45} />
                                <text x={x + bw / 2} y={cbH - 5} textAnchor="middle"
                                  fill={isLatest ? "var(--text-primary)" : "var(--text-muted)"}
                                  fontSize="8" fontWeight={isLatest ? "700" : "500"} fontFamily="DM Sans, sans-serif">
                                  {label}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}

                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {[...goal.contributions].map((c, origIdx) => ({ c, origIdx })).reverse().map(({ c, origIdx }) => (
                      <div key={origIdx} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)",
                      }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                            +{fmt(c.amount)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (showUndo) showUndo(`Removed ${fmt(c.amount)} from "${goal.name}"`);
                              setSavingsGoals((prev) => prev.map((g) => g.id === goal.id ? {
                                ...g,
                                current: Math.max(0, g.current - c.amount),
                                contributions: g.contributions.filter((_, idx) => idx !== origIdx),
                              } : g));
                            }}
                            style={{
                              background: "none", border: "1px solid var(--border)", borderRadius: 5,
                              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                              color: "var(--text-muted)", cursor: "pointer", fontSize: 10, lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    {goal.contributions.length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No contributions yet</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
            </SwipeToDelete>
          );
        })}
      </div>

      {savingsGoals.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No savings goals yet</div>
          <button onClick={() => setModal("add")} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Create Your First Goal</button>
        </Card>
      )}

      {/* Add Goal Modal */}
      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <AddGoalForm onAdd={addGoal} onClose={() => setModal(null)} />
        </Overlay>
      )}

      {/* Contribute Modal */}
      {modal?.type === "contribute" && (
        <Overlay onClose={() => setModal(null)}>
          <ContributeForm goal={modal.goal} onContribute={addContribution} onClose={() => setModal(null)} />
        </Overlay>
      )}

      {/* Edit Goal Modal */}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <EditGoalForm goal={modal.goal} onSave={updateGoal} onClose={() => setModal(null)} />
        </Overlay>
      )}
    </div>
  );
}

// Savings modal forms

const GOAL_COLORS = [
  { value: "var(--green)", label: "Green" },
  { value: "var(--accent)", label: "Blue" },
  { value: "var(--amber)", label: "Amber" },
  { value: "#f472b6", label: "Pink" },
  { value: "var(--red)", label: "Red" },
  { value: "#38bdf8", label: "Sky" },
  { value: "#d4a843", label: "Gold" },
];

const GOAL_ICONS = ["🎯", "🛡", "✈", "💻", "🚗", "🏠", "🎓", "💍", "🏖", "🎁", "📱", "🏥"];

export function AddGoalForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", target: "", monthlyContribution: "", deadline: "", icon: "🎯", color: "var(--accent)" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.target) > 0;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>New Savings Goal</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Goal Name</FieldLabel>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Emergency Fund" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Target Amount</FieldLabel><input type="number" step="1" min="0" value={form.target} onChange={(e) => update("target", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Monthly Contribution</FieldLabel><input type="number" step="1" min="0" value={form.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Target Date (optional)</FieldLabel>
          <input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOAL_ICONS.map((icon) => (
              <button key={icon} onClick={() => update("icon", icon)}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: form.icon === icon ? "var(--accent)" + "22" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {GOAL_COLORS.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: c.value,
                  border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`,
                  cursor: "pointer", transition: "border 0.15s",
                }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          if (canSubmit) onAdd({
            id: nextId(), name: form.name.trim(), target: parseFloat(form.target), current: 0,
            monthlyContribution: parseFloat(form.monthlyContribution) || 0,
            deadline: form.deadline || null, icon: form.icon, color: form.color, contributions: [],
          });
        }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Create Goal
        </button>
      </div>
    </>
  );
}

export function ContributeForm({ goal, onContribute, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = Math.max(goal.target - goal.current, 0);
  const valid = parseFloat(amount) > 0;
  const quickAmounts = [50, 100, goal.monthlyContribution, remaining].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Add to {goal.icon} {goal.name}
        </h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {fmt(goal.current)} of {fmt(goal.target)} · {fmt(remaining)} remaining
        </div>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Amount</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 600, padding: "14px 12px" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quickAmounts.map((qa) => (
            <button key={qa} onClick={() => setAmount(String(qa))}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${parseFloat(amount) === qa ? goal.color || "var(--accent)" : "var(--border)"}`,
                background: parseFloat(amount) === qa ? (goal.color || "var(--accent)") + "22" : "transparent",
                color: parseFloat(amount) === qa ? goal.color || "var(--accent)" : "var(--text-muted)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
              {qa === remaining ? `${fmt(qa)} (fill)` : qa === goal.monthlyContribution ? `${fmt(qa)} (monthly)` : fmt(qa)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (valid) onContribute(goal.id, parseFloat(amount)); }} disabled={!valid}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: valid ? (goal.color || "var(--accent)") : "var(--border)", color: valid ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed" }}>
          Add {valid ? fmt(parseFloat(amount)) : "Contribution"}
        </button>
      </div>
    </>
  );
}

export function EditGoalForm({ goal, onSave, onClose }) {
  const [form, setForm] = useState({
    name: goal.name, target: String(goal.target), monthlyContribution: String(goal.monthlyContribution),
    deadline: goal.deadline || "", icon: goal.icon, color: goal.color || "var(--accent)",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.target) > 0;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Edit Goal</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Goal Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Target Amount</FieldLabel><input type="number" step="1" min="0" value={form.target} onChange={(e) => update("target", e.target.value)} style={INPUT_STYLE} /></div>
          <div><FieldLabel>Monthly Contribution</FieldLabel><input type="number" step="1" min="0" value={form.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Target Date (optional)</FieldLabel><input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} style={INPUT_STYLE} /></div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOAL_ICONS.map((icon) => (
              <button key={icon} onClick={() => update("icon", icon)}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: form.icon === icon ? "var(--accent)" + "22" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {GOAL_COLORS.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: c.value,
                  border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`,
                  cursor: "pointer",
                }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          if (canSubmit) onSave({
            ...goal, name: form.name.trim(), target: parseFloat(form.target),
            monthlyContribution: parseFloat(form.monthlyContribution) || 0,
            deadline: form.deadline || null, icon: form.icon, color: form.color,
          });
        }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Save Changes
        </button>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────
// PAYCHECK PLANNER PAGE
// ─────────────────────────────────────────────

