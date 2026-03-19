import { useState, useMemo } from "react";
import { Card, CardHeader, MetricBox, ProgressBar, SwipeToDelete, FrequencyBadge } from "../components/ui.jsx";
import { fmt, fmtCompact, pct, generateUpcomingBills, generateBillInstances } from "../engine.js";
import { DASHBOARD_WIDGETS } from "../constants.js";

export function DashboardPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, settings, recurringTransactions, setTransactions }) {
  const startDay = settings?.startDayOfMonth || 1;
  const now = new Date();

  // Current budget period: from startDay of this month to startDay-1 of next month
  const periodStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, startDay - 1);
  const periodEndStr = periodEndDate.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  // This-period transactions
  const periodTx = useMemo(() => {
    if (startDay === 1) {
      const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return transactions.filter((t) => t.date.startsWith(mk));
    }
    return transactions.filter((t) => t.date >= periodStartStr && t.date <= periodEndStr);
  }, [transactions, startDay, periodStartStr, periodEndStr]);

  const totalIncome = income.reduce((s, i) => {
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
  const totalExpenses = periodTx.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const netWorth = totalAssets - totalDebt;

  const upcomingBills = useMemo(() => generateUpcomingBills(billTemplates, paidDates, 2), [billTemplates, paidDates]);
  const upcomingTotal = upcomingBills.reduce((s, b) => s + b.amount, 0);

  const topSpendCategories = categories
    .map((c) => ({ ...c, spent: periodTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);
  const todayTx = transactions.filter((t) => t.date === todayStr);
  const todaySpent = todayTx.reduce((s, t) => s + t.amount, 0);
  const todayBills = useMemo(() => {
    const now = new Date();
    return generateBillInstances(billTemplates, now.getFullYear(), now.getMonth())
      .filter((b) => b.instanceDate === todayStr);
  }, [billTemplates, todayStr]);
  const todayBillsDue = todayBills.filter((b) => !paidDates.has(b.instanceKey));
  const nextBill = upcomingBills[0];

  // Recurring transaction auto-log nudge
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const unloggedRecurring = useMemo(() => {
    if (!recurringTransactions) return [];
    return recurringTransactions.filter((rt) => {
      if (!rt.active) return false;
      return !transactions.some((t) =>
        t.categoryId === rt.categoryId &&
        t.description === rt.description &&
        Math.abs(t.amount - rt.amount) < 0.01 &&
        t.date.startsWith(monthKey)
      );
    });
  }, [recurringTransactions, transactions, monthKey]);

  const handleLogAllRecurring = () => {
    if (!setTransactions || unloggedRecurring.length === 0) return;
    setTransactions((prev) => [...prev, ...unloggedRecurring.map((rt) => ({
      id: nextId(), categoryId: rt.categoryId,
      description: rt.description, amount: rt.amount, date: todayStr,
    }))]);
  };

  const widgets = settings?.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;
  const isVisible = (id) => widgets.includes(id);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>{settings?.householdName || "Dashboard"}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Auto-log recurring transactions nudge */}
      {unloggedRecurring.length > 0 && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, background: "var(--accent)12", border: "1px solid var(--accent)40", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔄</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                {unloggedRecurring.length} recurring transaction{unloggedRecurring.length !== 1 ? "s" : ""} not yet logged this month
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                {unloggedRecurring.slice(0, 3).map((rt) => rt.description).join(", ")}{unloggedRecurring.length > 3 ? ` +${unloggedRecurring.length - 3} more` : ""}
              </div>
            </div>
          </div>
          <button onClick={handleLogAllRecurring} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            Log All
          </button>
        </div>
      )}

      {/* Today's Snapshot */}
      {isVisible("today") && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Today</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 3 }}>Spent Today</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: todaySpent > 0 ? "var(--red)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(todaySpent)}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{todayTx.length} transaction{todayTx.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 3 }}>Bills Due Today</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: todayBillsDue.length > 0 ? "var(--amber)" : "var(--green)", fontVariantNumeric: "tabular-nums" }}>{todayBillsDue.length}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{todayBillsDue.length > 0 ? fmt(todayBillsDue.reduce((s, b) => s + b.amount, 0)) + " due" : "All clear"}</div>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 3 }}>Next Bill</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{nextBill ? nextBill.name : "None"}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{nextBill ? `${fmt(nextBill.amount)} · ${new Date(nextBill.instanceDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Net Worth banner */}
      {isVisible("networth") && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Net Worth</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: netWorth >= 0 ? "var(--green)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(netWorth)}</div>
              <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 1 }}>Assets</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(totalAssets)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 1 }}>Liabilities</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(totalDebt)}</div>
                </div>
              </div>
            </div>
            {/* Donut chart */}
            {(() => {
              const total = totalAssets + totalDebt;
              const assetPct = total > 0 ? totalAssets / total : 0;
              const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r;
              const assetArc = circ * assetPct;
              const liabArc = circ * (1 - assetPct);
              return (
                <svg width={88} height={88} viewBox="0 0 88 88">
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red-bg)" strokeWidth={12} />
                  {liabArc > 0 && (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red)" strokeWidth={12}
                      strokeDasharray={`${liabArc} ${circ}`} strokeDashoffset={-(circ * assetPct)}
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                  )}
                  {assetArc > 0 && (
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--green)" strokeWidth={12}
                      strokeDasharray={`${assetArc} ${circ}`}
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                  )}
                  <text x={cx} y={cy - 3} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="DM Sans, sans-serif">
                    {total > 0 ? `${(assetPct * 100).toFixed(0)}%` : "—"}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fill="var(--text-muted)" fontSize="7.5" fontFamily="DM Sans, sans-serif">assets</text>
                </svg>
              );
            })()}
          </div>
        </Card>
      )}

      {isVisible("metrics") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <MetricBox label="Monthly Income" value={fmt(totalIncome)} sub="projected this period" accent="var(--green)" />
          <MetricBox label="Spent This Period" value={fmt(totalExpenses)} sub={`${periodTx.length} transaction${periodTx.length !== 1 ? "s" : ""} · ${pct(totalExpenses, totalIncome).toFixed(0)}% of income`} accent="var(--red)" />
          <MetricBox label="Remaining" value={fmt(Math.abs(balance))} sub={balance >= 0 ? "available to spend" : "over income"} accent={balance >= 0 ? "var(--green)" : "var(--red)"} />
          <MetricBox label="Total Debt" value={fmtCompact(totalDebt)} sub={`${fmt(totalMinPayments)}/mo minimum`} accent="var(--amber)" />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {isVisible("income") && (
          <Card>
            <CardHeader title="Income" />
            <div style={{ padding: "0 20px 16px" }}>
              {income.map((inc) => (
                <div key={inc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{inc.source}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                      {new Date(inc.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {inc.recurring && <span style={{ marginLeft: 6, color: "var(--accent)", fontWeight: 600 }}>Recurring</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>+{fmt(inc.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isVisible("spending") && (
          <Card>
            <CardHeader title="Top Spending" />
            <div style={{ padding: "0 20px 16px" }}>
              {topSpendCategories.length === 0 && (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No spending recorded this period</div>
              )}
              {topSpendCategories.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{c.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(c.spent)}{c.limit > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> / {fmt(c.limit)}</span>}
                    </span>
                  </div>
                  {c.limit > 0 && <ProgressBar value={c.spent} max={c.limit} height={5} />}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {isVisible("bills") && (
          <Card>
            <CardHeader title="Upcoming Bills" action={<span style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontVariantNumeric: "tabular-nums" }}>{fmt(upcomingTotal)}</span>} />
            <div style={{ padding: "0 20px 16px" }}>
              {upcomingBills.slice(0, 8).map((bill) => {
                const due = new Date(bill.instanceDate + "T00:00:00");
                const daysUntil = Math.ceil((due - new Date()) / 86400000);
                const urgent = daysUntil <= 7 && daysUntil >= 0;
                return (
                  <div key={bill.instanceKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{bill.name}</span>
                        {bill.recurring && <FrequencyBadge frequency={bill.frequency} />}
                      </div>
                      <div style={{ fontSize: 12, color: urgent ? "var(--amber)" : "var(--text-muted)", fontWeight: urgent ? 600 : 400, marginTop: 1 }}>
                        Due {due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{urgent && ` · ${daysUntil}d`}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(bill.amount)}</span>
                  </div>
                );
              })}
              {upcomingBills.length === 0 && <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>All caught up!</div>}
            </div>
          </Card>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isVisible("savings") && (
            <Card>
              <CardHeader title="Savings Goals" />
              <div style={{ padding: "0 20px 16px" }}>
                {savingsGoals.map((goal) => (
                  <div key={goal.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15 }}>{goal.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{goal.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: goal.color || "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{pct(goal.current, goal.target).toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={goal.current} max={goal.target} color={goal.current >= goal.target ? "var(--green)" : goal.color || "var(--accent)"} height={5} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(goal.current)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(goal.target)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {isVisible("debt") && (
            <Card>
              <CardHeader title="Debt Summary" />
              <div style={{ padding: "0 20px 16px" }}>
                {debts.map((debt) => (
                  <div key={debt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{debt.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{debt.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, paddingLeft: 26 }}>{debt.apr}% APR · {fmt(debt.minPayment)}/mo</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 4px", marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total Owed</span>
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalDebt)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR PAGE
// ─────────────────────────────────────────────

