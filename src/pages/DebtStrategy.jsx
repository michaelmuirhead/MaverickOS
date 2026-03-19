import { useState, useMemo } from "react";
import { Card, CardHeader, MetricBox, ProgressBar } from "../components/ui.jsx";
import { fmt, fmtCompact, INPUT_STYLE } from "../engine.js";

export function DebtStrategyPage({ debts, income }) {
  const [extraPayment, setExtraPayment] = useState("200");
  const [method, setMethod] = useState("snowball");

  const activeDebts = debts.filter((d) => d.balance > 0);
  const totalDebt = activeDebts.reduce((s, d) => s + d.balance, 0);
  const totalMinimums = activeDebts.reduce((s, d) => s + d.minPayment, 0);
  const extra = parseFloat(extraPayment) || 0;

  const snowball = useMemo(() => simulatePayoff(activeDebts, extra, "snowball"), [activeDebts, extra]);
  const avalanche = useMemo(() => simulatePayoff(activeDebts, extra, "avalanche"), [activeDebts, extra]);

  const current = method === "snowball" ? snowball : avalanche;
  const other = method === "snowball" ? avalanche : snowball;
  const interestSaved = Math.abs(snowball.totalInterest - avalanche.totalInterest);
  const debtMap = {};
  debts.forEach((d) => { debtMap[d.id] = d; });

  // Build payoff order with months
  const payoffOrder = [];
  const paidSet = new Set();
  current.timeline.forEach((m) => {
    m.paidOff.forEach((id) => {
      if (!paidSet.has(id)) {
        paidSet.add(id);
        payoffOrder.push({ debt: debtMap[id], month: m.month });
      }
    });
  });

  const futureDate = (monthsAhead) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsAhead);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const monthlyIncome = income.reduce((s, i) => {
    if (!i.recurring) return s;
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

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Debt Snowball Strategy</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Dave Ramsey's Baby Step 2 — Pay off debt smallest to largest</p>
      </div>

      {activeDebts.length === 0 ? (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>You're Debt Free!</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Baby Step 2 complete — time to build that emergency fund</div>
        </Card>
      ) : (
        <>
          {/* Method toggle + extra payment */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Strategy</div>
              <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                {[["snowball", "Snowball", "Smallest balance first"], ["avalanche", "Avalanche", "Highest APR first"]].map(([key, label, sub]) => (
                  <button key={key} onClick={() => setMethod(key)}
                    style={{
                      flex: 1, padding: "12px 16px", border: "none", cursor: "pointer",
                      background: method === key ? "var(--accent)" : "transparent",
                      color: method === key ? "#fff" : "var(--text-muted)",
                      textAlign: "center", transition: "all 0.15s",
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: "0 0 180px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Extra Monthly Payment</div>
              <input type="number" min="0" step="50" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)}
                style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 700, textAlign: "center", padding: "10px 12px" }} />
            </div>
          </div>

          {/* Summary metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <MetricBox label="Total Debt" value={fmt(totalDebt)} sub={`${activeDebts.length} accounts`} accent="var(--red)" />
            <MetricBox label="Monthly Payment" value={fmt(totalMinimums + extra)} sub={`${fmt(totalMinimums)} min + ${fmt(extra)} extra`} accent="var(--accent)" />
            <MetricBox label="Debt-Free Date" value={futureDate(current.months)} sub={`${current.months} months`} accent="var(--green)" />
            <MetricBox label="Total Interest" value={fmt(current.totalInterest)} sub={interestSaved > 1 ? `${method === "avalanche" ? "saves" : "costs"} ${fmt(interestSaved)} vs ${method === "snowball" ? "avalanche" : "snowball"}` : "same either way"} accent="var(--amber)" />
          </div>

          {/* Payoff order — the snowball visual */}
          <Card style={{ marginBottom: 20 }}>
            <CardHeader title={`${method === "snowball" ? "Snowball" : "Avalanche"} Payoff Order`} />
            <div style={{ padding: "0 20px 20px" }}>
              {payoffOrder.map((item, idx) => {
                const d = item.debt;
                const isLast = idx === payoffOrder.length - 1;
                const snowballSize = 20 + (idx * 12);

                return (
                  <div key={d.id} style={{ display: "flex", gap: 16, position: "relative" }}>
                    {/* Timeline line */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                      <div style={{
                        width: Math.min(snowballSize, 40), height: Math.min(snowballSize, 40),
                        borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: Math.min(snowballSize * 0.45, 16), color: "#fff", fontWeight: 700, zIndex: 2,
                        border: "3px solid var(--card)",
                      }}>
                        {idx + 1}
                      </div>
                      {!isLast && <div style={{ width: 2, flex: 1, background: "var(--border)", marginTop: -2 }} />}
                    </div>

                    {/* Debt info */}
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{d.icon}</span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{d.name}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                            {d.lender} · {d.apr}% APR · {fmt(d.minPayment)}/mo min
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(d.balance)}</div>
                          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 1 }}>
                            Paid off in {item.month}mo — {futureDate(item.month)}
                          </div>
                        </div>
                      </div>
                      <ProgressBar value={item.month} max={current.months} color="var(--accent)" height={4} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Month-by-month breakdown */}
          <Card>
            <CardHeader title="Monthly Breakdown" action={
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Showing first 12 months</span>
            } />
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Month</th>
                    {current.order.map((id) => (
                      <th key={id} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {debtMap[id]?.icon} {debtMap[id]?.name}
                      </th>
                    ))}
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {current.timeline.slice(0, 12).map((m) => {
                    const totalPayment = Object.values(m.payments).reduce((s, v) => s + v, 0);
                    const totalBalance = Object.values(m.balances).reduce((s, v) => s + v, 0);
                    return (
                      <tr key={m.month} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                          {futureDate(m.month)}
                        </td>
                        {current.order.map((id) => {
                          const bal = m.balances[id];
                          const pay = m.payments[id] || 0;
                          const justPaid = m.paidOff.includes(id);
                          return (
                            <td key={id} style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                              {bal <= 0 && pay === 0 ? (
                                <span style={{ color: "var(--green)", fontWeight: 600 }}>✓</span>
                              ) : (
                                <div>
                                  <div style={{ color: pay > 0 ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 500 }}>
                                    {pay > 0 && <span style={{ color: "var(--green)", fontSize: 11, marginRight: 4 }}>-{fmt(pay)}</span>}
                                  </div>
                                  <div style={{ color: justPaid ? "var(--green)" : "var(--text-muted)", fontWeight: justPaid ? 700 : 400, fontSize: 12 }}>
                                    {justPaid ? "PAID OFF" : fmt(bal)}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: totalBalance <= 0 ? "var(--green)" : "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                          {totalBalance <= 0 ? "DEBT FREE" : fmt(totalBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {current.months > 12 && (
              <div style={{ padding: "12px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, borderTop: "1px solid var(--border-subtle)" }}>
                + {current.months - 12} more months until debt free in {futureDate(current.months)}
              </div>
            )}
          </Card>

          {/* Strategy comparison */}
          <div style={{ marginTop: 20 }}>
            <Card>
              <CardHeader title="Strategy Comparison" />
              <div style={{ padding: "0 20px 20px" }}>
                {[
                  { key: "snowball", label: "Snowball", sub: "Smallest balance first — quick wins build momentum", data: snowball, color: "var(--accent)" },
                  { key: "avalanche", label: "Avalanche", sub: "Highest interest first — mathematically optimal", data: avalanche, color: "var(--green)" },
                ].map((s) => (
                  <div key={s.key}
                    onClick={() => setMethod(s.key)}
                    style={{
                      padding: "16px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
                      border: `2px solid ${method === s.key ? s.color : "var(--border)"}`,
                      background: method === s.key ? s.color + "0a" : "transparent",
                      transition: "all 0.2s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {method === s.key && (
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{s.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.sub}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{s.data.months} months</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(s.data.totalInterest)} interest</div>
                      </div>
                    </div>
                  </div>
                ))}
                {interestSaved > 1 && (
                  <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                    Avalanche saves <span style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(interestSaved)}</span> in interest vs Snowball.
                    {snowball.months <= avalanche.months && " Snowball pays off the same or faster with motivation from quick wins."}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Snowball vs Avalanche balance chart */}
          {snowball.months > 0 && avalanche.months > 0 && (() => {
            const maxMo = Math.max(snowball.months, avalanche.months);
            // Sample at most 48 points for performance
            const step = Math.max(1, Math.floor(maxMo / 48));
            const sbPoints = [];
            const avPoints = [];
            for (let m = 0; m <= maxMo; m += step) {
              const sbRow = snowball.timeline[Math.min(m, snowball.timeline.length - 1)];
              const avRow = avalanche.timeline[Math.min(m, avalanche.timeline.length - 1)];
              const sbBal = sbRow ? Object.values(sbRow.balances).reduce((s, v) => s + v, 0) : 0;
              const avBal = avRow ? Object.values(avRow.balances).reduce((s, v) => s + v, 0) : 0;
              sbPoints.push({ m, bal: m > snowball.months ? 0 : sbBal });
              avPoints.push({ m, bal: m > avalanche.months ? 0 : avBal });
            }
            if (sbPoints[sbPoints.length - 1]?.m < maxMo) {
              sbPoints.push({ m: maxMo, bal: 0 });
              avPoints.push({ m: maxMo, bal: 0 });
            }

            const scW = 560, scH = 160;
            const scPad = { top: 12, right: 16, bottom: 28, left: 60 };
            const scInW = scW - scPad.left - scPad.right;
            const scInH = scH - scPad.top - scPad.bottom;
            const maxBal = totalDebt;
            const scX = (m) => scPad.left + (m / maxMo) * scInW;
            const scY = (v) => scPad.top + scInH - (v / maxBal) * scInH;
            const buildLine = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${scX(p.m)},${scY(p.bal)}`).join(" ");
            const sbPath = buildLine(sbPoints);
            const avPath = buildLine(avPoints);
            const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxBal * f, y: scY(maxBal * f) }));
            const xTicks = [0, Math.floor(maxMo / 4), Math.floor(maxMo / 2), Math.floor(maxMo * 3 / 4), maxMo];

            return (
              <Card style={{ marginTop: 20 }}>
                <CardHeader title="Total Balance Over Time" />
                <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
                  <svg viewBox={`0 0 ${scW} ${scH}`} style={{ width: "100%", maxHeight: 180 }} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="sbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
                      </linearGradient>
                      <linearGradient id="avGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--green)" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="var(--green)" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>
                    {/* Grid */}
                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line x1={scPad.left} y1={t.y} x2={scW - scPad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                        <text x={scPad.left - 6} y={t.y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8.5" fontFamily="DM Sans, sans-serif">
                          {t.v >= 1000 ? `$${(t.v / 1000).toFixed(0)}k` : `$${Math.round(t.v)}`}
                        </text>
                      </g>
                    ))}
                    {/* X axis ticks */}
                    {xTicks.map((m) => (
                      <text key={m} x={scX(m)} y={scH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="DM Sans, sans-serif">
                        {m === 0 ? "Now" : `${m}mo`}
                      </text>
                    ))}
                    {/* Debt-free markers */}
                    <line x1={scX(snowball.months)} y1={scPad.top} x2={scX(snowball.months)} y2={scPad.top + scInH} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    <line x1={scX(avalanche.months)} y1={scPad.top} x2={scX(avalanche.months)} y2={scPad.top + scInH} stroke="var(--green)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
                    {/* Snowball area + line */}
                    <path d={`${sbPath} L${scX(maxMo)},${scY(0)} L${scX(0)},${scY(0)} Z`} fill="url(#sbGrad)" />
                    <path d={sbPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Avalanche area + line */}
                    <path d={`${avPath} L${scX(maxMo)},${scY(0)} L${scX(0)},${scY(0)} Z`} fill="url(#avGrad)" />
                    <path d={avPath} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
                    {/* Start dot */}
                    <circle cx={scX(0)} cy={scY(totalDebt)} r="4" fill="var(--text-primary)" />
                  </svg>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                      <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="var(--accent)" strokeWidth="2.5" /></svg>
                      Snowball — debt free {futureDate(snowball.months)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                      <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="var(--green)" strokeWidth="2" strokeDasharray="6,3" /></svg>
                      Avalanche — debt free {futureDate(avalanche.months)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Gazelle intensity quote */}
          <div style={{ marginTop: 20, padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🦌</div>
            <div style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
              "Gazelle intensity — live like no one else, so later you can live and give like no one else."
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Monthly payment of {fmt(totalMinimums + extra)} puts you debt-free by {futureDate(current.months)}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FINANCIAL ROADMAP (Dave Ramsey Baby Steps 1-7)
// ─────────────────────────────────────────────

const BABY_STEPS = [
  {
    step: 1,
    title: "Starter Emergency Fund",
    desc: "Save $1,000 as fast as you can. Sell stuff, pick up extra work, cut expenses. This is your buffer so a flat tire doesn't derail everything.",
    icon: "🛡",
    targetAmount: 1000,
  },
  {
    step: 2,
    title: "Pay Off All Debt",
    desc: "List every debt smallest to largest (the debt snowball). Attack the smallest first while paying minimums on the rest. Each payoff frees up money for the next.",
    icon: "⚡",
  },
  {
    step: 3,
    title: "Full Emergency Fund",
    desc: "Build 3-6 months of expenses in a savings account. This is your fully funded safety net — job loss, medical bills, major car repairs. Don't invest this.",
    icon: "🏦",
    monthsOfExpenses: [3, 6],
  },
  {
    step: 4,
    title: "Invest 15% for Retirement",
    desc: "Put 15% of your gross household income into retirement — 401(k), Roth IRA, or both. Start with enough to get the employer match, then max Roth, then go back to 401(k).",
    icon: "📈",
    targetPct: 15,
  },
  {
    step: 5,
    title: "Save for Kids' College",
    desc: "Open an Education Savings Account (ESA) or 529 plan. You're investing for their future, not taking on student loan debt for them.",
    icon: "🎓",
  },
  {
    step: 6,
    title: "Pay Off Your Home",
    desc: "Throw every extra dollar at your mortgage. A paid-off home is the foundation of building real wealth. You can do it faster than you think.",
    icon: "🏠",
  },
  {
    step: 7,
    title: "Build Wealth & Give",
    desc: "This is the fun part. Max out retirement, build wealth through mutual funds and real estate, and give generously. Live like no one else.",
    icon: "💎",
  },
];

