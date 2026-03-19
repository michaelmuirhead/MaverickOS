import { useState } from "react";
import { Card, CardHeader, ProgressBar, SwipeToDelete, Overlay, DragHandle, useDragToReorder } from "../components/ui.jsx";
import { fmt, nextId, INPUT_STYLE, FREQUENCY_LABELS } from "../engine.js";

export function DebtPage({ debts, setDebts, showUndo }) {
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [reordering, setReordering] = useState(false);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalOriginal = debts.reduce((s, d) => s + (d.originalBalance || d.balance), 0);
  const totalPaidOff = totalOriginal - totalDebt;
  const totalMinPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const avgApr = debts.length > 0 ? debts.reduce((s, d) => s + d.apr * d.balance, 0) / totalDebt : 0;

  // Sort by APR descending (avalanche method recommendation)
  const sortedDebts = [...debts].sort((a, b) => b.apr - a.apr);

  const addPayment = (debtId, amount) => {
    setDebts((prev) => prev.map((d) => d.id === debtId ? {
      ...d, balance: Math.max(d.balance - amount, 0),
      payments: [...(d.payments || []), { date: new Date().toISOString().split("T")[0], amount }],
    } : d));
    setModal(null);
  };

  const deleteDebt = (id) => { const debt = debts.find((d) => d.id === id); if (showUndo && debt) showUndo(`Deleted "${debt.name}"`); setDebts((prev) => prev.filter((d) => d.id !== id)); setConfirmingDelete(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Debt Payoff</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track and crush your debt</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {debts.length > 1 && (
            <button onClick={() => { setReordering((v) => !v); setExpandedId(null); }} style={{
              padding: "10px 14px", borderRadius: 10, border: `1px solid ${reordering ? "var(--accent)" : "var(--border)"}`,
              background: reordering ? "var(--accent)18" : "transparent", color: reordering ? "var(--accent)" : "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>⠿ Reorder</button>
          )}
          <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Debt</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Total Owed" value={fmtCompact(totalDebt)} sub={`${debts.length} accounts`} accent="var(--red)" />
        <MetricBox label="Total Paid Off" value={fmtCompact(totalPaidOff)} sub={`${pct(totalPaidOff, totalOriginal).toFixed(0)}% of original`} accent="var(--green)" />
        <MetricBox label="Monthly Minimum" value={fmt(totalMinPayments)} sub="combined minimums" accent="var(--amber)" />
        <MetricBox label="Avg APR" value={`${avgApr.toFixed(1)}%`} sub="weighted by balance" />
      </div>

      {/* Overall progress */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Overall Progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{pct(totalPaidOff, totalOriginal).toFixed(0)}% paid off</span>
          </div>
          <ProgressBar value={totalPaidOff} max={totalOriginal} color="var(--green)" height={12} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalPaidOff)} paid</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalOriginal)} original</span>
          </div>
        </div>
      </Card>

      {/* Debt cards */}
      {reordering && (
        <DraggableSimpleList
          items={debts}
          onReorder={setDebts}
          renderItem={(d) => (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: d.balance <= 0 ? "var(--green-bg)" : "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{d.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{d.apr}% APR · {fmt(d.minPayment)}/mo</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.balance)}</span>
            </div>
          )}
        />
      )}
      <div style={{ display: reordering ? "none" : "flex", flexDirection: "column", gap: 14 }}>
        {sortedDebts.map((debt) => {
          const paidOff = (debt.originalBalance || debt.balance) - debt.balance;
          const progress = pct(paidOff, debt.originalBalance || debt.balance);
          const isExpanded = expandedId === debt.id;
          const monthlyInterest = (debt.apr / 100 / 12) * debt.balance;
          const monthsToPayoff = debt.minPayment > monthlyInterest ? Math.ceil(debt.balance / (debt.minPayment - monthlyInterest)) : null;
          const isPaidOff = debt.balance <= 0;

          return (
            <SwipeToDelete key={debt.id} onDelete={() => deleteDebt(debt.id)}>
              <Card>
                <div style={{ padding: "20px", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : debt.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: isPaidOff ? "var(--green-bg)" : "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{debt.icon}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{debt.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                        <span>{debt.lender || "Unknown lender"}</span>
                        <span>{debt.apr}% APR</span>
                        <span>{fmt(debt.minPayment)}/mo min</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {isPaidOff ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, background: "var(--green-bg)", color: "var(--green)", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Paid Off
                      </span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</div>
                        {monthsToPayoff && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>~{monthsToPayoff}mo at minimum</div>}
                      </div>
                    )}
                  </div>
                </div>

                <ProgressBar value={paidOff} max={debt.originalBalance || debt.balance} color={isPaidOff ? "var(--green)" : "var(--accent)"} height={8} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(paidOff)} paid off</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(monthlyInterest)}/mo interest
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                  <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    {!isPaidOff && (
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "payment", debt }); }}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Make Payment</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", debt }); }}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  </div>

                  {/* Payoff projection curve */}
                  {!isPaidOff && monthsToPayoff && monthsToPayoff <= 360 && (() => {
                    const monthlyRate = debt.apr / 100 / 12;
                    const projPoints = [];
                    let bal = debt.balance;
                    for (let m = 0; m <= monthsToPayoff && bal > 0; m++) {
                      projPoints.push(bal);
                      if (m < monthsToPayoff) {
                        bal = Math.max(bal * (1 + monthlyRate) - debt.minPayment, 0);
                      }
                    }
                    projPoints.push(0);
                    const pcW = 480, pcH = 90;
                    const pcPad = { top: 8, right: 12, bottom: 20, left: 52 };
                    const pcInW = pcW - pcPad.left - pcPad.right;
                    const pcInH = pcH - pcPad.top - pcPad.bottom;
                    const maxBal = projPoints[0];
                    const scX = (i) => pcPad.left + (i / (projPoints.length - 1)) * pcInW;
                    const scY = (v) => pcPad.top + pcInH - (v / maxBal) * pcInH;
                    const pts = projPoints.map((v, i) => `${i === 0 ? "M" : "L"}${scX(i)},${scY(v)}`).join(" ");
                    const area = `${pts} L${scX(projPoints.length - 1)},${scY(0)} L${scX(0)},${scY(0)} Z`;
                    const midIdx = Math.floor(projPoints.length / 2);
                    return (
                      <div style={{ padding: "12px 20px 4px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>
                          Payoff Projection — minimum payments
                        </div>
                        <div style={{ overflowX: "auto" }}>
                          <svg viewBox={`0 0 ${pcW} ${pcH}`} style={{ width: "100%", maxHeight: 100 }} preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id={`dg${debt.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--red)" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="var(--red)" stopOpacity="0.01" />
                              </linearGradient>
                            </defs>
                            {/* Y ticks */}
                            {[0, 0.5, 1].map((f) => {
                              const v = maxBal * (1 - f);
                              const y = pcPad.top + pcInH * f;
                              return (
                                <g key={f}>
                                  <line x1={pcPad.left} y1={y} x2={pcW - pcPad.right} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                                  <text x={pcPad.left - 6} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                                    {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`}
                                  </text>
                                </g>
                              );
                            })}
                            {/* X labels: start, mid, end */}
                            {[[0, "Now"], [midIdx, `${Math.round(monthsToPayoff / 2)}mo`], [projPoints.length - 1, `${monthsToPayoff}mo`]].map(([i, label]) => (
                              <text key={label} x={scX(i)} y={pcH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">{label}</text>
                            ))}
                            <path d={area} fill={`url(#dg${debt.id})`} />
                            <path d={pts} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={scX(0)} cy={scY(projPoints[0])} r="3" fill="var(--red)" />
                            <circle cx={scX(projPoints.length - 1)} cy={scY(0)} r="3" fill="var(--green)" />
                          </svg>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ padding: "8px 20px 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Payment History</span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {[...(debt.payments || [])].map((p, origIdx) => ({ p, origIdx })).reverse().map(({ p, origIdx }) => (
                      <div key={origIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>-{fmt(p.amount)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (showUndo) showUndo(`Removed ${fmt(p.amount)} payment from "${debt.name}"`);
                              setDebts((prev) => prev.map((d) => d.id === debt.id ? {
                                ...d,
                                balance: Math.min(d.balance + p.amount, d.originalBalance || d.balance + p.amount),
                                payments: d.payments.filter((_, idx) => idx !== origIdx),
                              } : d));
                            }}
                            style={{
                              background: "none", border: "1px solid var(--border)", borderRadius: 5,
                              width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                              color: "var(--text-muted)", cursor: "pointer", fontSize: 10,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >✕</button>
                        </div>
                      </div>
                    ))}
                    {(!debt.payments || debt.payments.length === 0) && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No payments recorded</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
            </SwipeToDelete>
          );
        })}
      </div>

      {debts.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No debts — you're debt free!</div>
        </Card>
      )}

      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <DebtForm onSave={(d) => { setDebts((p) => [...p, { ...d, id: nextId(), payments: [] }]); setModal(null); }} onClose={() => setModal(null)} title="Add Debt" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <DebtForm existing={modal.debt} onSave={(updated) => { setDebts((p) => p.map((d) => d.id === updated.id ? updated : d)); setModal(null); }} onClose={() => setModal(null)} title="Edit Debt" />
        </Overlay>
      )}
      {modal?.type === "payment" && (
        <Overlay onClose={() => setModal(null)}>
          <DebtPaymentForm debt={modal.debt} onPay={addPayment} onClose={() => setModal(null)} />
        </Overlay>
      )}
    </div>
  );
}

export function DebtForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    name: existing.name, balance: String(existing.balance), originalBalance: String(existing.originalBalance || existing.balance),
    minPayment: String(existing.minPayment), apr: String(existing.apr), lender: existing.lender || "", icon: existing.icon || "💳",
  } : { name: "", balance: "", originalBalance: "", minPayment: "", apr: "", lender: "", icon: "💳" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.balance) >= 0 && parseFloat(form.minPayment) >= 0;
  const icons = ["🎓", "💳", "🚗", "🏠", "🏥", "📱", "🛍", "💰"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Debt Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Student Loans" style={INPUT_STYLE} /></div>
        <div><FieldLabel>Lender</FieldLabel><input value={form.lender} onChange={(e) => update("lender", e.target.value)} placeholder="e.g. Navient" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Current Balance</FieldLabel><input type="number" step="0.01" min="0" value={form.balance} onChange={(e) => update("balance", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Original Balance</FieldLabel><input type="number" step="0.01" min="0" value={form.originalBalance} onChange={(e) => update("originalBalance", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Min Payment/mo</FieldLabel><input type="number" step="0.01" min="0" value={form.minPayment} onChange={(e) => update("minPayment", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>APR %</FieldLabel><input type="number" step="0.1" min="0" value={form.apr} onChange={(e) => update("apr", e.target.value)} placeholder="0.0" style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), name: form.name.trim(), balance: parseFloat(form.balance), originalBalance: parseFloat(form.originalBalance) || parseFloat(form.balance), minPayment: parseFloat(form.minPayment), apr: parseFloat(form.apr) || 0, lender: form.lender.trim(), icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Debt"}
        </button>
      </div>
    </>
  );
}

export function DebtPaymentForm({ debt, onPay, onClose }) {
  const [amount, setAmount] = useState("");
  const valid = parseFloat(amount) > 0;
  const quickAmounts = [debt.minPayment, debt.minPayment * 2, Math.round(debt.balance / 2), debt.balance].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Payment — {debt.icon} {debt.name}</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Balance: {fmt(debt.balance)} · Min: {fmt(debt.minPayment)}/mo</div>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Payment Amount</FieldLabel><input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 600, padding: "14px 12px" }} /></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quickAmounts.map((qa) => (
            <button key={qa} onClick={() => setAmount(String(qa))}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${parseFloat(amount) === qa ? "var(--green)" : "var(--border)"}`, background: parseFloat(amount) === qa ? "var(--green-bg)" : "transparent", color: parseFloat(amount) === qa ? "var(--green)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {qa === debt.minPayment ? `${fmt(qa)} (min)` : qa === debt.balance ? `${fmt(qa)} (payoff)` : fmt(qa)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (valid) onPay(debt.id, parseFloat(amount)); }} disabled={!valid}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: valid ? "var(--green)" : "var(--border)", color: valid ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed" }}>
          Make Payment{valid ? ` · ${fmt(parseFloat(amount))}` : ""}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// NET WORTH PAGE
// ─────────────────────────────────────────────

const ASSET_CATEGORIES = {
  cash: { label: "Cash & Bank", color: "var(--green)", icon: "🏦" },
  retirement: { label: "Retirement", color: "var(--accent)", icon: "📊" },
  investment: { label: "Investments", color: "#38bdf8", icon: "💹" },
  property: { label: "Property", color: "var(--amber)", icon: "🏠" },
  crypto: { label: "Crypto", color: "#d4a843", icon: "₿" },
  other: { label: "Other", color: "var(--text-muted)", icon: "📦" },
};

