import { useState, useMemo } from "react";
import { Card, CardHeader, MetricBox, ProgressBar } from "../components/ui.jsx";
import { fmt, fmtCompact, generateBillInstances, generateUpcomingBills } from "../engine.js";

export function CashFlowForecastPage({ income, billTemplates, paidDates, transactions, savingsGoals, debts, assets }) {
  const [horizon, setHorizon] = useState(90); // 30, 60, 90 days

  const forecast = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Starting balance = sum of cash assets
    const startingBalance = assets
      .filter((a) => a.category === "cash")
      .reduce((s, a) => s + a.value, 0);

    // Calculate average daily spend from last 30 days of transactions
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);
    const recentTx = transactions.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d >= thirtyDaysAgo && d <= today;
    });
    const totalRecentSpend = recentTx.reduce((s, t) => s + t.amount, 0);
    const daysOfData = Math.max(1, Math.ceil((today - thirtyDaysAgo) / 86400000));
    const avgDailySpend = totalRecentSpend / daysOfData;

    // Calculate per-category daily averages for breakdown
    const catSpendMap = {};
    recentTx.forEach((t) => {
      catSpendMap[t.categoryId] = (catSpendMap[t.categoryId] || 0) + t.amount;
    });

    // Monthly income calculation (same logic used elsewhere in the app)
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
    const dailyIncome = monthlyIncome / 30;

    // Monthly savings obligations
    const monthlySavings = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
    const dailySavings = monthlySavings / 30;

    // Monthly debt payments
    const monthlyDebt = debts.reduce((s, d) => s + d.minPayment, 0);
    const dailyDebt = monthlyDebt / 30;

    // Generate day-by-day forecast
    const days = [];
    let runningBalance = startingBalance;
    let cumulativeIncome = 0;
    let cumulativeBills = 0;
    let cumulativeSpend = 0;
    let cumulativeSavings = 0;
    let cumulativeDebt = 0;

    // Track income events per day using the income recurrence patterns
    function getIncomeForDate(dateStr) {
      let total = 0;
      const d = new Date(dateStr + "T00:00:00");
      const dayOfMonth = d.getDate();

      income.forEach((src) => {
        if (!src.recurring) return;
        switch (src.frequency) {
          case "monthly":
            if (dayOfMonth === new Date(src.date + "T00:00:00").getDate()) total += src.amount;
            break;
          case "semimonthly":
            if (dayOfMonth === 1 || dayOfMonth === 15) total += src.amount;
            break;
          case "biweekly": {
            const anchor = new Date(src.date + "T00:00:00");
            const diff = Math.round((d - anchor) / 86400000);
            if (diff >= 0 && diff % 14 === 0) total += src.amount;
            break;
          }
          case "weekly": {
            const anchor = new Date(src.date + "T00:00:00");
            const diff = Math.round((d - anchor) / 86400000);
            if (diff >= 0 && diff % 7 === 0) total += src.amount;
            break;
          }
          default: break;
        }
      });
      return total;
    }

    for (let i = 0; i <= horizon; i++) {
      const d = new Date(today.getTime() + i * 86400000);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const weekday = d.toLocaleDateString("en-US", { weekday: "short" });

      // Income for this day
      const dayIncome = i === 0 ? 0 : getIncomeForDate(dateStr);
      cumulativeIncome += dayIncome;

      // Bills due this day (generate instances for this month)
      const monthInstances = generateBillInstances(billTemplates, d.getFullYear(), d.getMonth());
      const dayBills = monthInstances.filter((b) => b.instanceDate === dateStr && !paidDates.has(b.instanceKey));
      const dayBillTotal = dayBills.reduce((s, b) => s + b.amount, 0);
      cumulativeBills += dayBillTotal;

      // Estimated daily discretionary spend (skip day 0 = today)
      const daySpend = i === 0 ? 0 : avgDailySpend;
      cumulativeSpend += daySpend;

      // Savings & debt prorated daily (skip day 0)
      const daySavings = i === 0 ? 0 : dailySavings;
      const dayDebtPmt = i === 0 ? 0 : dailyDebt;
      cumulativeSavings += daySavings;
      cumulativeDebt += dayDebtPmt;

      if (i > 0) {
        runningBalance += dayIncome - dayBillTotal - daySpend - daySavings - dayDebtPmt;
      }

      days.push({
        date: dateStr,
        dayLabel,
        weekday,
        dayNum: i,
        balance: runningBalance,
        dayIncome,
        dayBills,
        dayBillTotal,
        daySpend,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isPayday: dayIncome > 0,
        isBillDay: dayBills.length > 0,
      });
    }

    // Key milestones
    const day30 = days.find((d) => d.dayNum === 30);
    const day60 = days.find((d) => d.dayNum === 60);
    const day90 = days.find((d) => d.dayNum === 90);
    const minBalance = days.reduce((min, d) => d.balance < min.balance ? d : min, days[0]);
    const goesNegative = days.some((d) => d.balance < 0);
    const negativeDay = days.find((d) => d.balance < 0);

    // Net monthly flow
    const netMonthlyFlow = monthlyIncome - (avgDailySpend * 30) - monthlySavings - monthlyDebt;

    return {
      days,
      startingBalance,
      avgDailySpend,
      monthlyIncome,
      monthlySavings,
      monthlyDebt,
      netMonthlyFlow,
      day30,
      day60,
      day90,
      minBalance,
      goesNegative,
      negativeDay,
      cumulativeIncome,
      cumulativeBills,
      cumulativeSpend,
      cumulativeSavings,
      cumulativeDebt,
    };
  }, [income, billTemplates, paidDates, transactions, savingsGoals, debts, assets, horizon]);

  // Chart dimensions
  const chartH = 200;
  const chartW = 600;
  const pad = { top: 20, right: 20, bottom: 30, left: 60 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  // Scale values for SVG chart
  const visibleDays = forecast.days.slice(0, horizon + 1);
  const balances = visibleDays.map((d) => d.balance);
  const maxBal = Math.max(...balances, 1);
  const minBal = Math.min(...balances, 0);
  const range = maxBal - minBal || 1;

  const scaleX = (i) => pad.left + (i / horizon) * innerW;
  const scaleY = (v) => pad.top + innerH - ((v - minBal) / range) * innerH;

  // Build SVG path
  const pathPoints = visibleDays.map((d, i) => `${scaleX(i)},${scaleY(d.balance)}`);
  const linePath = `M${pathPoints.join(" L")}`;

  // Gradient fill path
  const areaPath = `${linePath} L${scaleX(visibleDays.length - 1)},${scaleY(minBal)} L${scaleX(0)},${scaleY(minBal)} Z`;

  // Zero line y position
  const zeroY = minBal < 0 ? scaleY(0) : null;

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const val = minBal + (range * i) / tickCount;
    yTicks.push({ val, y: scaleY(val) });
  }

  // X-axis ticks - show every ~15 days
  const xTicks = [];
  const step = Math.max(Math.floor(horizon / 6), 1);
  for (let i = 0; i <= horizon; i += step) {
    if (visibleDays[i]) {
      xTicks.push({ label: visibleDays[i].dayLabel, x: scaleX(i) });
    }
  }

  // Find notable events for the timeline
  const billEvents = visibleDays.filter((d) => d.isBillDay).slice(0, 12);
  const paydayEvents = visibleDays.filter((d) => d.isPayday).slice(0, 8);

  const pillStyle = (active) => ({
    padding: "6px 16px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Cash Flow Forecast</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Projected balance based on income, bills, and spending patterns
        </p>
      </div>

      {/* Horizon selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { days: 30, label: "30 Days" },
          { days: 60, label: "60 Days" },
          { days: 90, label: "90 Days" },
        ].map((h) => (
          <button key={h.days} onClick={() => setHorizon(h.days)} style={pillStyle(horizon === h.days)}>
            {h.label}
          </button>
        ))}
      </div>

      {/* Top-level metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Current Balance" value={fmt(forecast.startingBalance)} sub="cash accounts" accent="var(--text-primary)" />
        <MetricBox
          label={`${horizon}-Day Balance`}
          value={fmt(horizon === 30 ? forecast.day30?.balance : horizon === 60 ? forecast.day60?.balance : forecast.day90?.balance || 0)}
          sub="projected"
          accent={(horizon === 30 ? forecast.day30?.balance : horizon === 60 ? forecast.day60?.balance : forecast.day90?.balance || 0) >= 0 ? "var(--green)" : "var(--red)"}
        />
        <MetricBox label="Monthly Net Flow" value={fmt(forecast.netMonthlyFlow)} sub={forecast.netMonthlyFlow >= 0 ? "surplus" : "deficit"} accent={forecast.netMonthlyFlow >= 0 ? "var(--green)" : "var(--red)"} />
        <MetricBox
          label="Lowest Point"
          value={fmt(forecast.minBalance.balance)}
          sub={forecast.minBalance.dayLabel}
          accent={forecast.minBalance.balance < 0 ? "var(--red)" : forecast.minBalance.balance < 500 ? "var(--amber)" : "var(--green)"}
        />
      </div>

      {/* Warning banner if balance goes negative */}
      {forecast.goesNegative && (
        <Card style={{ marginBottom: 20, borderColor: "var(--red)" }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
              ⚠
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--red)" }}>Balance Goes Negative</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                Your projected balance dips below $0 around {forecast.negativeDay?.dayLabel}. Consider reducing spending or adjusting savings contributions.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SVG Balance Chart */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Projected Balance" />
        <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 220 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={forecast.goesNegative ? "#f87171" : "#34d399"} stopOpacity="0.25" />
                <stop offset="100%" stopColor={forecast.goesNegative ? "#f87171" : "#34d399"} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={pad.left - 8} y={t.y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                  {t.val >= 1000 ? `$${(t.val / 1000).toFixed(0)}k` : `$${Math.round(t.val)}`}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xTicks.map((t, i) => (
              <text key={i} x={t.x} y={chartH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="DM Sans, sans-serif">
                {t.label}
              </text>
            ))}

            {/* Zero line */}
            {zeroY !== null && (
              <line x1={pad.left} y1={zeroY} x2={chartW - pad.right} y2={zeroY} stroke="#f87171" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
            )}

            {/* Area fill */}
            <path d={areaPath} fill="url(#balanceGrad)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke={forecast.goesNegative ? "#f87171" : "#34d399"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

            {/* Payday markers */}
            {paydayEvents.map((d, i) => (
              <g key={`pay-${i}`}>
                <circle cx={scaleX(d.dayNum)} cy={scaleY(d.balance)} r="3.5" fill="#34d399" stroke="var(--card)" strokeWidth="1.5" />
              </g>
            ))}

            {/* Bill day markers */}
            {billEvents.map((d, i) => (
              <g key={`bill-${i}`}>
                <circle cx={scaleX(d.dayNum)} cy={scaleY(d.balance)} r="3" fill="#fbbf24" stroke="var(--card)" strokeWidth="1.5" />
              </g>
            ))}

            {/* Today marker */}
            <circle cx={scaleX(0)} cy={scaleY(visibleDays[0].balance)} r="4" fill="#3b82f6" stroke="var(--card)" strokeWidth="2" />
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, paddingTop: 8 }}>
            {[
              { color: "#3b82f6", label: "Today" },
              { color: "#34d399", label: "Paydays" },
              { color: "#fbbf24", label: "Bills Due" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Assumptions card */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Forecast Assumptions" />
        <div style={{ padding: "0 20px 16px" }}>
          {[
            { label: "Monthly Income", value: fmt(forecast.monthlyIncome), color: "var(--green)", icon: "↑" },
            { label: "Avg Daily Spending", value: fmt(forecast.avgDailySpend), color: "var(--red)", icon: "↓", sub: `${fmt(forecast.avgDailySpend * 30)}/mo based on recent transactions` },
            { label: "Savings Contributions", value: fmt(forecast.monthlySavings) + "/mo", color: "var(--accent)", icon: "→", sub: `${savingsGoals.length} active goals` },
            { label: "Debt Payments", value: fmt(forecast.monthlyDebt) + "/mo", color: "var(--amber)", icon: "→", sub: `${debts.filter((d) => d.balance > 0).length} active debts` },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: row.color + "18", color: row.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {row.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{row.label}</div>
                {row.sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{row.sub}</div>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: row.color, fontVariantNumeric: "tabular-nums" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming Events Timeline */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Upcoming Cash Events" />
        <div style={{ padding: "0 20px 16px" }}>
          {visibleDays
            .filter((d) => d.dayNum > 0 && (d.isPayday || d.isBillDay))
            .slice(0, 15)
            .map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                {/* Date badge */}
                <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)" }}>{d.weekday}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{d.dayLabel.split(" ")[1]}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.dayLabel.split(" ")[0]}</div>
                </div>

                {/* Events */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  {d.isPayday && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>Income</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>+{fmt(d.dayIncome)}</span>
                    </div>
                  )}
                  {d.dayBills.map((b, bi) => (
                    <div key={bi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{b.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--amber)", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>-{fmt(b.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Running balance */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: d.balance >= 0 ? "var(--text-secondary)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(d.balance)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>balance</div>
                </div>
              </div>
            ))}
          {visibleDays.filter((d) => d.dayNum > 0 && (d.isPayday || d.isBillDay)).length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No upcoming income or bills found
            </div>
          )}
        </div>
      </Card>

      {/* Projection milestones */}
      <Card>
        <CardHeader title="Balance Milestones" />
        <div style={{ padding: "0 20px 20px" }}>
          {[
            { label: "Today", balance: forecast.startingBalance, date: "Now" },
            forecast.day30 && { label: "30 Days", balance: forecast.day30.balance, date: forecast.day30.dayLabel },
            forecast.day60 && { label: "60 Days", balance: forecast.day60.balance, date: forecast.day60.dayLabel },
            forecast.day90 && { label: "90 Days", balance: forecast.day90.balance, date: forecast.day90.dayLabel },
          ].filter(Boolean).filter((m) => {
            if (m.label === "Today") return true;
            const daysVal = parseInt(m.label);
            return daysVal <= horizon;
          }).map((milestone, idx, arr) => {
            const delta = idx > 0 ? milestone.balance - arr[idx - 1].balance : 0;
            return (
              <div key={milestone.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: idx < arr.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                {/* Step indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: milestone.balance >= 0 ? "var(--green-bg)" : "var(--red-bg)",
                    border: `2px solid ${milestone.balance >= 0 ? "var(--green)" : "var(--red)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: milestone.balance >= 0 ? "var(--green)" : "var(--red)",
                  }}>
                    {milestone.label === "Today" ? "●" : milestone.label.replace(" Days", "d")}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{milestone.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{milestone.date}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: milestone.balance >= 0 ? "var(--text-primary)" : "var(--red)" }}>
                    {fmt(milestone.balance)}
                  </div>
                  {idx > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: delta >= 0 ? "var(--green)" : "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                      {delta >= 0 ? "+" : ""}{fmt(delta)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Disclaimer */}
      <div style={{ marginTop: 20, padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 500, margin: "0 auto" }}>
          Forecast is estimated based on recurring income, scheduled bills, and your average daily spending over the past 30 days. Actual results will vary.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SPENDING TRENDS PAGE
// ─────────────────────────────────────────────

const TREND_COLORS = ["#3b82f6", "#34d399", "#f0c644", "#f87171", "#d4a843", "#f472b6", "#38bdf8", "#fb923c"];

