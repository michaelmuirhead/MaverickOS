import { useState, useMemo } from "react";
import { Card, CardHeader, MetricBox, ProgressBar } from "../components/ui.jsx";
import { fmt, fmtCompact, pct, generateBillInstances } from "../engine.js";

export function MonthlySummaryPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, settings }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const startDay = settings?.startDayOfMonth || 1;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const periodStartStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
  const periodEndDate = new Date(year, month + 1, startDay - 1);
  const periodEndStr = periodEndDate.toISOString().split("T")[0];
  const monthName = startDay === 1
    ? viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : `${new Date(year, month, startDay).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${periodEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Filter transactions to period
  const monthTx = useMemo(() => {
    if (startDay === 1) return transactions.filter((t) => t.date.startsWith(monthKey));
    return transactions.filter((t) => t.date >= periodStartStr && t.date <= periodEndStr);
  }, [transactions, monthKey, startDay, periodStartStr, periodEndStr]);
  const totalSpent = monthTx.reduce((s, t) => s + t.amount, 0);
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
  const monthBills = generateBillInstances(billTemplates, year, month);
  const billsTotal = monthBills.reduce((s, b) => s + b.amount, 0);
  const billsPaid = monthBills.filter((b) => paidDates.has(b.instanceKey)).length;
  const savingsMonthly = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const debtPayments = debts.reduce((s, d) => s + d.minPayment, 0);

  // Spending by category
  const catSpending = categories.map((c) => ({
    ...c,
    spent: monthTx.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);

  const surplus = totalIncome - totalSpent - savingsMonthly - debtPayments;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Monthly Summary</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>How did the month go?</p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 24 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Income vs Outflow */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Cash Flow</span>
            <span style={{
              fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums",
              color: surplus >= 0 ? "var(--green)" : "var(--red)",
            }}>{surplus >= 0 ? "+" : ""}{fmt(surplus)} {surplus >= 0 ? "surplus" : "deficit"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Money In</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalIncome)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Money Out</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalSpent + savingsMonthly + debtPayments)}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 12 }}>
                <span>Spending {fmt(totalSpent)}</span>
                <span>Savings {fmt(savingsMonthly)}</span>
                <span>Debt {fmt(debtPayments)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricBox label="Bills" value={`${billsPaid}/${monthBills.length}`} sub={`${fmt(billsTotal)} total`} accent={billsPaid === monthBills.length ? "var(--green)" : "var(--amber)"} />
        <MetricBox label="Savings" value={fmt(savingsMonthly)} sub={`${savingsGoals.filter((g) => g.monthlyContribution > 0).length} goals`} accent="var(--accent)" />
        <MetricBox label="Debt Payments" value={fmt(debtPayments)} sub={`${debts.filter((d) => d.balance > 0).length} active debts`} accent="var(--amber)" />
        <MetricBox label="Spending" value={fmt(totalSpent)} sub={`${monthTx.length} transactions`} accent="var(--red)" />
      </div>

      {/* Spending by category */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Spending by Category" />
        <div style={{ padding: "0 20px 16px" }}>
          {catSpending.map((c) => (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(c.spent)}</span>
                  <span style={{ fontSize: 12, color: c.spent > c.limit ? "var(--red)" : "var(--text-muted)", fontWeight: c.spent > c.limit ? 600 : 400, fontVariantNumeric: "tabular-nums" }}>
                    / {fmt(c.limit)}
                  </span>
                </div>
              </div>
              <ProgressBar value={c.spent} max={c.limit} height={5} />
            </div>
          ))}
        </div>
      </Card>

      {/* Allocation breakdown with donut */}
      <Card>
        <CardHeader title="Where Your Money Went" />
        <div style={{ padding: "0 20px 20px" }}>
          {(() => {
            const rows = [
              { label: "Spending", amount: totalSpent, color: "var(--red)" },
              { label: "Bills", amount: billsTotal, color: "var(--amber)" },
              { label: "Savings", amount: savingsMonthly, color: "var(--accent)" },
              { label: "Debt Payments", amount: debtPayments, color: "#38bdf8" },
              { label: surplus >= 0 ? "Surplus" : "Deficit", amount: Math.abs(surplus), color: surplus >= 0 ? "var(--green)" : "#f87171" },
            ].filter((r) => r.amount > 0);
            const total = rows.reduce((s, r) => s + r.amount, 0);
            if (total === 0) return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No data this month</div>;

            // SVG donut
            const r = 52, cx = 64, cy = 64, circ = 2 * Math.PI * r;
            let cumPct = 0;
            const segments = rows.map((row) => {
              const pct = row.amount / total;
              const arc = circ * pct;
              const offset = -(circ * cumPct);
              cumPct += pct;
              return { ...row, arc, offset, pct };
            });

            return (
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                {/* Donut */}
                <div style={{ flexShrink: 0 }}>
                  <svg width={128} height={128} viewBox="0 0 128 128">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={18} />
                    {segments.map((seg, i) => (
                      <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                        stroke={seg.color} strokeWidth={18}
                        strokeDasharray={`${seg.arc} ${circ}`}
                        strokeDashoffset={seg.offset}
                        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                    ))}
                    <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700" fontFamily="DM Sans, sans-serif">{fmt(total).replace("$", "$")}</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">out</text>
                  </svg>
                </div>
                {/* Legend */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  {rows.map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmt(row.amount)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 34, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {((row.amount / total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
      {/* Year-in-Review */}
      {(() => {
        const yearTx = transactions.filter((t) => t.date.startsWith(`${year}-`));
        if (yearTx.length === 0) return null;
        const yearIncome = income.reduce((s, i) => {
          if (!i.recurring) return s + i.amount;
          switch (i.frequency) {
            case "weekly": return s + i.amount * 52;
            case "biweekly": return s + i.amount * 26;
            case "semimonthly": return s + i.amount * 24;
            case "monthly": return s + i.amount * 12;
            case "quarterly": return s + i.amount * 4;
            case "yearly": return s + i.amount;
            default: return s + i.amount * 12;
          }
        }, 0);
        const yearSpent = yearTx.reduce((s, t) => s + t.amount, 0);
        const savingsRate = yearIncome > 0 ? Math.max(0, ((yearIncome - yearSpent) / yearIncome) * 100) : 0;
        // Top category this year
        const catTotals = {};
        yearTx.forEach((t) => { catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount; });
        const topCatId = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topCat = categories.find((c) => c.id === topCatId);
        const topCatAmt = catTotals[topCatId] || 0;
        // Monthly breakdown
        const months = [];
        for (let m = 0; m < 12; m++) {
          const mk = `${year}-${String(m + 1).padStart(2, "0")}`;
          const mTx = yearTx.filter((t) => t.date.startsWith(mk));
          months.push({ label: new Date(year, m, 1).toLocaleDateString("en-US", { month: "short" }), total: mTx.reduce((s, t) => s + t.amount, 0), count: mTx.length });
        }
        const maxMonthly = Math.max(...months.map((m) => m.total), 1);
        const bestMonth = [...months].sort((a, b) => a.total - b.total)[0];
        const worstMonth = [...months].sort((a, b) => b.total - a.total)[0];
        return (
          <Card style={{ marginTop: 20 }}>
            <CardHeader title={`${year} Year in Review`} action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>{yearTx.length} transactions</span>} />
            <div style={{ padding: "0 20px 20px" }}>
              {/* Key stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
                <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Total Spent</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(yearSpent)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(yearSpent / 12)}/mo avg</div>
                </div>
                <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Savings Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: savingsRate >= 20 ? "var(--green)" : savingsRate >= 10 ? "var(--amber)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>{savingsRate.toFixed(0)}%</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{savingsRate >= 20 ? "Great!" : savingsRate >= 10 ? "Good" : "Room to grow"}</div>
                </div>
                {topCat && (
                  <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Top Category</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{topCat.icon} {topCat.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(topCatAmt)} · {((topCatAmt / yearSpent) * 100).toFixed(0)}% of spend</div>
                  </div>
                )}
                <div style={{ padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>Best Month</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--green)" }}>{bestMonth.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{fmt(bestMonth.total)} spent</div>
                </div>
              </div>

              {/* Monthly bar chart */}
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 10 }}>Monthly Spending</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                {months.map((m, i) => {
                  const h = Math.round((m.total / maxMonthly) * 68);
                  const isCurrent = i === month;
                  const isWorst = m.label === worstMonth.label && m.total > 0;
                  return (
                    <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      {m.total > 0 && <div style={{ fontSize: 8, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{m.total >= 1000 ? `${(m.total/1000).toFixed(0)}k` : Math.round(m.total)}</div>}
                      <div style={{ width: "100%", height: Math.max(h, m.total > 0 ? 3 : 1), borderRadius: "3px 3px 0 0", background: isWorst ? "var(--red)" : isCurrent ? "var(--accent)" : "var(--border-hover)", transition: "height 0.4s" }} />
                      <div style={{ fontSize: 8, color: isCurrent ? "var(--accent)" : "var(--text-muted)", fontWeight: isCurrent ? 700 : 400 }}>{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
// ─────────────────────────────────────────────

function NotificationsSettings({ settings, setSettings }) {
  const [notifStatus, setNotifStatus] = useState(() => {
    if (typeof Notification === "undefined") return "unavailable";
    return Notification.permission;
  });
  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifStatus(result);
    if (result === "granted") {
      new Notification("MaverickOS Notifications Enabled", {
        body: "You'll be reminded about upcoming bills and budget alerts.",
        icon: "/icon-192.png",
      });
    }
  };
  const notifPrefs = settings.notifications || {};
  const togglePref = (key) => setSettings((s) => ({ ...s, notifications: { ...(s.notifications || {}), [key]: !(s.notifications || {})[key] } }));
  if (notifStatus === "unavailable") {
    return <div style={{ padding: "12px 20px 16px", fontSize: 13, color: "var(--text-muted)" }}>Notifications are not supported in this browser.</div>;
  }
  return (
    <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {notifStatus !== "granted" ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Enable Push Notifications</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Get reminders for bills, budget alerts, and monthly recaps</div>
          </div>
          <button onClick={requestPermission} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Enable</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>✓ Notifications enabled</div>
      )}
      {[
        { key: "billsDue", label: "Bills Due Soon", desc: "Reminder 3 days before a bill is due" },
        { key: "budgetAlert", label: "Budget Alerts", desc: "When a category reaches 80% of its limit" },
        { key: "monthlyRecap", label: "Monthly Recap", desc: "Summary on the 1st of each month" },
        { key: "savingsGoal", label: "Savings Milestones", desc: "When you hit a savings goal target" },
      ].map(({ key, label, desc }) => (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{desc}</div>
          </div>
          <div onClick={() => togglePref(key)} style={{ width: 40, height: 22, borderRadius: 11, padding: 2, background: notifPrefs[key] ? "var(--accent)" : "var(--track)", transition: "background 0.2s", display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "transform 0.2s", transform: notifPrefs[key] ? "translateX(18px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Notifications fire when the app is open or installed as a PWA on your device.</div>
    </div>
  );
}

