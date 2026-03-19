import { useState, useMemo } from "react";
import { Card, CardHeader, SwipeToDelete, FrequencyBadge, Overlay, DragHandle, MetricBox } from "../components/ui.jsx";
import { fmt, nextId, fmtCompact, INPUT_STYLE, FREQUENCY_LABELS, generateUpcomingBills } from "../engine.js";
import { AddBillForm } from "./Calendar.jsx"

export function RecurringBillsPage({ billTemplates, setBillTemplates, paidDates, onNavigate, showUndo, transactions }) {
  const [editingBill, setEditingBill] = useState(null);
  const [showAddBill, setShowAddBill] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const recurringBills = billTemplates.filter((b) => b.recurring);
  const oneTimeBills = billTemplates.filter((b) => !b.recurring);

  // Calculate monthly cost equivalent for each frequency
  const monthlyEquiv = (bill) => {
    switch (bill.frequency) {
      case "weekly": return bill.amount * 52 / 12;
      case "biweekly": return bill.amount * 26 / 12;
      case "semimonthly": return bill.amount * 2;
      case "monthly": return bill.amount;
      case "quarterly": return bill.amount / 3;
      case "yearly": return bill.amount / 12;
      default: return bill.amount;
    }
  };

  const totalMonthly = recurringBills.reduce((s, b) => s + monthlyEquiv(b), 0);
  const totalYearly = totalMonthly * 12;

  // Group by frequency
  const grouped = {};
  recurringBills.forEach((b) => {
    if (!grouped[b.frequency]) grouped[b.frequency] = [];
    grouped[b.frequency].push(b);
  });

  const freqOrder = ["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "yearly"];

  const deleteBill = (id) => {
    const bill = billTemplates.find((b) => b.id === id);
    if (showUndo && bill) showUndo(`Deleted "${bill.name}" bill`);
    setBillTemplates((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBill = (updated) => {
    setBillTemplates((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    setEditingBill(null);
  };

  // Next due date for a recurring bill from today
  const getNextDue = (bill) => {
    const now = new Date();
    const instances = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      instances.push(...generateBillInstances([bill], d.getFullYear(), d.getMonth()));
    }
    const upcoming = instances
      .filter((inst) => new Date(inst.instanceDate + "T00:00:00") >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .filter((inst) => !paidDates.has(inst.instanceKey));
    return upcoming[0]?.instanceDate || null;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Recurring Bills</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Manage all your scheduled payments</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onNavigate("calendar")} style={{
            padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            View Calendar
          </button>
          <button onClick={() => setShowAddBill(true)} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>+ Add Bill</button>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricBox label="Monthly Cost" value={fmt(totalMonthly)} sub={`${recurringBills.length} recurring bills`} accent="var(--accent)" />
        <MetricBox label="Yearly Cost" value={fmtCompact(totalYearly)} sub="projected annual" accent="var(--amber)" />
        <MetricBox label="Recurring Bills" value={recurringBills.length} sub={`${freqOrder.filter((f) => grouped[f]).length} frequencies`} />
        <MetricBox label="One-Time Bills" value={oneTimeBills.length} sub={oneTimeBills.length === 0 ? "none scheduled" : `${fmt(oneTimeBills.reduce((s, b) => s + b.amount, 0))} total`} />
      </div>

      {/* Bill price change detection */}
      {(() => {
        if (!transactions || transactions.length === 0) return null;
        const changes = recurringBills.map((bill) => {
          // Find transactions matching this bill description in last 2 months
          const now = new Date();
          const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
          const billName = bill.name.toLowerCase();
          const thisMonthTx = transactions.filter((t) => t.date.startsWith(thisMonthKey) && t.description.toLowerCase().includes(billName));
          const lastMonthTx = transactions.filter((t) => t.date.startsWith(lastMonthKey) && t.description.toLowerCase().includes(billName));
          if (thisMonthTx.length === 0 || lastMonthTx.length === 0) return null;
          const thisAmt = thisMonthTx[0].amount;
          const lastAmt = lastMonthTx[0].amount;
          if (Math.abs(thisAmt - lastAmt) < 0.01) return null;
          return { bill, thisAmt, lastAmt, diff: thisAmt - lastAmt };
        }).filter(Boolean);
        if (changes.length === 0) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--amber)", marginBottom: 8 }}>⚠️ Price Changes Detected</div>
            {changes.map(({ bill, thisAmt, lastAmt, diff }) => (
              <div key={bill.id} style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--amber)44", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{bill.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{fmt(lastAmt)} → {fmt(thisAmt)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: diff > 0 ? "var(--red)" : "var(--green)" }}>
                    {diff > 0 ? "+" : ""}{fmt(diff)}/mo
                  </span>
                  <button onClick={() => setBillTemplates((prev) => prev.map((b) => b.id === bill.id ? { ...b, amount: thisAmt } : b))}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    Update Bill
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Grouped recurring bills */}
      {freqOrder.filter((f) => grouped[f]).map((freq) => {
        const bills = grouped[freq];
        const groupMonthly = bills.reduce((s, b) => s + monthlyEquiv(b), 0);
        return (
          <div key={freq} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FrequencyBadge frequency={freq} />
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                  {bills.length} bill{bills.length !== 1 ? "s" : ""}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                ~{fmt(groupMonthly)}/mo
              </span>
            </div>
            <Card>
              {bills.map((bill, idx) => {
                const nextDue = getNextDue(bill);
                const nextDueDate = nextDue ? new Date(nextDue + "T00:00:00") : null;
                const daysUntil = nextDueDate ? Math.ceil((nextDueDate - new Date()) / 86400000) : null;
                const urgent = daysUntil !== null && daysUntil <= 7 && daysUntil >= 0;

                return (
                  <SwipeToDelete key={bill.id} onDelete={() => deleteBill(bill.id)}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px",
                      borderBottom: idx < bills.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
                          {bill.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                          <span style={{ color: "var(--text-muted)" }}>
                            {fmt(bill.amount)} per {bill.frequency === "biweekly" ? "2 weeks" : bill.frequency === "monthly" ? "month" : bill.frequency === "quarterly" ? "quarter" : bill.frequency === "yearly" ? "year" : "week"}
                          </span>
                          {nextDueDate && (
                            <span style={{ color: urgent ? "var(--amber)" : "var(--text-muted)", fontWeight: urgent ? 600 : 400 }}>
                              Next: {nextDueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {urgent && ` · ${daysUntil}d`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          ~{fmt(monthlyEquiv(bill))}/mo
                        </span>
                        <button onClick={() => setEditingBill(bill)} style={{
                          background: "none", border: "1px solid var(--border)", borderRadius: 6,
                          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--text-muted)", cursor: "pointer",
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </SwipeToDelete>
                );
              })}
            </Card>
          </div>
        );
      })}

      {/* One-time bills section */}
      {oneTimeBills.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
              color: "var(--text-muted)", background: "var(--text-muted)" + "18",
              padding: "2px 7px", borderRadius: 4,
            }}>One-Time</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
              {oneTimeBills.length} bill{oneTimeBills.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Card>
            {oneTimeBills.map((bill, idx) => (
              <SwipeToDelete key={bill.id} onDelete={() => deleteBill(bill.id)}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: idx < oneTimeBills.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{bill.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Due {new Date(bill.anchorDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(bill.amount)}</span>
                </div>
              </SwipeToDelete>
            ))}
          </Card>
        </div>
      )}

      {recurringBills.length === 0 && oneTimeBills.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No bills set up yet</div>
          <button onClick={() => setShowAddBill(true)} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Add Your First Bill</button>
        </Card>
      )}

      {/* Add Bill Modal */}
      {showAddBill && (
        <Overlay onClose={() => setShowAddBill(false)}>
          <AddBillForm
            onAdd={(bill) => { setBillTemplates((p) => [...p, bill]); setShowAddBill(false); }}
            onClose={() => setShowAddBill(false)}
          />
        </Overlay>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <Overlay onClose={() => setEditingBill(null)}>
          <EditBillForm bill={editingBill} onSave={updateBill} onClose={() => setEditingBill(null)} />
        </Overlay>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// SAVINGS GOALS PAGE
// ─────────────────────────────────────────────

export function DraggableSimpleList({ items, onReorder, renderItem }) {
  const { dragIndex, overIndex, startDrag, listId } = useDragToReorder(items, onReorder);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        Drag the handles to reorder. Press <strong style={{ color: "var(--text-secondary)" }}>Reorder</strong> again to exit.
      </div>
      {items.map((item, idx) => {
        const isDragging = dragIndex === idx;
        const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
        return (
          <div key={item.id} data-drag-list={listId} data-drag-item={idx} style={{
            opacity: isDragging ? 0.35 : 1,
            borderRadius: 12, border: `2px solid ${isOver ? "var(--accent)" : "var(--border)"}`,
            background: "var(--card)", transition: "border-color 0.15s, opacity 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px" }}>
              <DragHandle onPointerDown={(e) => startDrag(e, idx)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderItem(item)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EditBillForm({ bill, onSave, onClose }) {
  const [form, setForm] = useState({
    name: bill.name, amount: String(bill.amount), anchorDate: bill.anchorDate,
    recurring: bill.recurring, frequency: bill.frequency || "monthly",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0 && form.anchorDate;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Edit Bill</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Bill Name</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Amount</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} style={INPUT_STYLE} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{form.recurring ? "Start Date" : "Due Date"}</label>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>
        <div onClick={() => update("recurring", !form.recurring)}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px",
            borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer",
          }}>
          <div style={{
            width: 40, height: 22, borderRadius: 11, padding: 2,
            background: form.recurring ? "var(--accent)" : "var(--track)",
            transition: "background 0.2s", display: "flex", alignItems: "center",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, background: "#fff",
              transition: "transform 0.2s",
              transform: form.recurring ? "translateX(18px)" : "translateX(0)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recurring Bill</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Automatically repeats on schedule</div>
          </div>
        </div>
        {form.recurring && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, display: "block" }}>Frequency</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => {
                const active = form.frequency === key;
                return (
                  <button key={key} onClick={() => update("frequency", key)}
                    style={{
                      padding: "7px 14px", borderRadius: 8,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent)" + "22" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                    }}
                  >{label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button
          onClick={() => {
            if (canSubmit) onSave({
              ...bill, name: form.name.trim(), amount: parseFloat(form.amount),
              anchorDate: form.anchorDate, recurring: form.recurring,
              frequency: form.recurring ? form.frequency : null,
            });
          }}
          disabled={!canSubmit}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: canSubmit ? "var(--accent)" : "var(--border)",
            color: canSubmit ? "#fff" : "var(--text-muted)",
            fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >Save Changes</button>
      </div>
    </>
  );
}
