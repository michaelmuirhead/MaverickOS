import { useState } from "react";
import { Card, CardHeader } from "../components/ui.jsx";
import { fmt, INPUT_STYLE } from "../engine.js";

export function CalcInput({ label, value, onChange, prefix, suffix, step = "1", min = "0" }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>{prefix}</span>}
        <input type="number" step={step} min={min} value={value} onChange={(e) => onChange(e.target.value)}
          style={{ ...INPUT_STYLE, paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 36 : 12 }} />
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function CalcResult({ label, value, accent, sub }) {
  return (
    <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function CompoundInterestCalc() {
  const [principal, setPrincipal] = useState("10000");
  const [monthly, setMonthly] = useState("500");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("20");

  const p = parseFloat(principal) || 0;
  const m = parseFloat(monthly) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = (parseFloat(years) || 0) * 12;

  const futureValue = r > 0
    ? p * Math.pow(1 + r, n) + m * ((Math.pow(1 + r, n) - 1) / r)
    : p + m * n;
  const totalContributed = p + m * n;
  const interestEarned = futureValue - totalContributed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Starting Amount" value={principal} onChange={setPrincipal} prefix="$" />
        <CalcInput label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" />
        <CalcInput label="Annual Return" value={rate} onChange={setRate} suffix="%" step="0.1" />
        <CalcInput label="Years" value={years} onChange={setYears} suffix="yrs" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
        <CalcResult label="Future Value" value={fmtCompact(futureValue)} accent="var(--green)" />
        <CalcResult label="Total Contributed" value={fmtCompact(totalContributed)} />
        <CalcResult label="Interest Earned" value={fmtCompact(interestEarned)} accent="var(--accent)" sub={`${totalContributed > 0 ? ((interestEarned / totalContributed) * 100).toFixed(0) : 0}% return`} />
      </div>
    </div>
  );
}

export function MortgageCalc() {
  const [price, setPrice] = useState("350000");
  const [down, setDown] = useState("70000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "yearly"
  const [showAll, setShowAll] = useState(false);

  const loan = (parseFloat(price) || 0) - (parseFloat(down) || 0);
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = (parseFloat(term) || 0) * 12;
  const payment = r > 0 && n > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const totalPaid = payment * n;
  const totalInterest = totalPaid - loan;

  // Full amortization schedule
  const fullSchedule = useMemo(() => {
    const rows = [];
    let bal = loan;
    for (let i = 1; i <= n && bal > 0.01; i++) {
      const interest = bal * r;
      const princ = Math.min(payment - interest, bal);
      bal = Math.max(bal - princ, 0);
      rows.push({ month: i, payment: princ + interest, principal: princ, interest, balance: bal });
    }
    return rows;
  }, [loan, r, n, payment]);

  // Year-level rollup
  const yearlySchedule = useMemo(() => {
    const years = [];
    for (let y = 1; y <= Math.ceil(fullSchedule.length / 12); y++) {
      const slice = fullSchedule.slice((y - 1) * 12, y * 12);
      if (slice.length === 0) break;
      years.push({
        year: y,
        payment: slice.reduce((s, r) => s + r.payment, 0),
        principal: slice.reduce((s, r) => s + r.principal, 0),
        interest: slice.reduce((s, r) => s + r.interest, 0),
        balance: slice[slice.length - 1].balance,
      });
    }
    return years;
  }, [fullSchedule]);

  const displayRows = viewMode === "yearly" ? yearlySchedule : (showAll ? fullSchedule : fullSchedule.slice(0, 24));
  const headers = viewMode === "yearly"
    ? ["Year", "Total Paid", "Principal", "Interest", "Balance"]
    : ["Month", "Payment", "Principal", "Interest", "Balance"];

  // Balance-over-time SVG chart
  const chartPoints = yearlySchedule.map((y, i) => ({ x: i, bal: y.balance }));
  const mcW = 480, mcH = 80, mcPad = { t: 6, r: 8, b: 20, l: 52 };
  const mcInW = mcW - mcPad.l - mcPad.r, mcInH = mcH - mcPad.t - mcPad.b;
  const mcScaleX = (i) => mcPad.l + (i / Math.max(chartPoints.length - 1, 1)) * mcInW;
  const mcScaleY = (v) => mcPad.t + mcInH - (v / loan) * mcInH;
  const mcPath = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"}${mcScaleX(i)},${mcScaleY(p.bal)}`).join(" ");
  const mcArea = loan > 0 ? `M${mcPad.l},${mcScaleY(loan)} ${mcPath.slice(1)} L${mcScaleX(chartPoints.length - 1)},${mcScaleY(0)} L${mcPad.l},${mcScaleY(0)} Z` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Home Price" value={price} onChange={setPrice} prefix="$" />
        <CalcInput label="Down Payment" value={down} onChange={setDown} prefix="$" />
        <CalcInput label="Interest Rate" value={rate} onChange={setRate} suffix="%" step="0.125" />
        <CalcInput label="Loan Term" value={term} onChange={setTerm} suffix="yrs" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <CalcResult label="Monthly Payment" value={fmt(payment)} accent="var(--accent)" />
        <CalcResult label="Total Interest" value={fmtCompact(totalInterest)} accent="var(--red)" sub={`${((totalInterest / loan) * 100).toFixed(0)}% of loan`} />
        <CalcResult label="Loan Amount" value={fmtCompact(loan)} sub={`${((parseFloat(down) || 0) / (parseFloat(price) || 1) * 100).toFixed(0)}% down`} />
      </div>

      {/* Balance paydown chart */}
      {loan > 0 && chartPoints.length > 1 && (
        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`0 0 ${mcW} ${mcH}`} style={{ width: "100%", maxHeight: 90 }} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((f) => {
              const v = loan * (1 - f);
              const y = mcScaleY(v);
              return (
                <g key={f}>
                  <line x1={mcPad.l} y1={y} x2={mcW - mcPad.r} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                  <text x={mcPad.l - 5} y={y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                    {v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`}
                  </text>
                </g>
              );
            })}
            {[0, Math.floor(chartPoints.length / 2), chartPoints.length - 1].map((i) => (
              <text key={i} x={mcScaleX(i)} y={mcH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">
                Yr {i + 1}
              </text>
            ))}
            <path d={mcArea} fill="url(#mcGrad)" />
            <path d={mcPath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {fullSchedule.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {/* View mode toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
              {[["monthly", "Monthly"], ["yearly", "Yearly"]].map(([key, label]) => (
                <button key={key} onClick={() => { setViewMode(key); setShowAll(false); }}
                  style={{ padding: "5px 14px", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: viewMode === key ? "var(--accent)" : "transparent",
                    color: viewMode === key ? "#fff" : "var(--text-muted)" }}>
                  {label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {viewMode === "yearly" ? `${yearlySchedule.length} years` : `${fullSchedule.length} months total`}
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                {headers.map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: h === headers[0] ? "left" : "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{displayRows.map((row) => (
                <tr key={viewMode === "yearly" ? row.year : row.month} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "7px 10px", color: "var(--text-primary)", fontWeight: 500 }}>
                    {viewMode === "yearly" ? `Year ${row.year}` : row.month}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{fmt(row.payment)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--green)" }}>{fmt(row.principal)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--red)" }}>{fmt(row.interest)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{fmtCompact(row.balance)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {viewMode === "monthly" && !showAll && fullSchedule.length > 24 && (
            <button onClick={() => setShowAll(true)}
              style={{ width: "100%", padding: "10px", marginTop: 4, background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Show all {fullSchedule.length} months
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function RetirementCalc() {
  const [age, setAge] = useState("30");
  const [retireAge, setRetireAge] = useState("65");
  const [current, setCurrent] = useState("45000");
  const [monthly, setMonthly] = useState("800");
  const [match, setMatch] = useState("50");
  const [rate, setRate] = useState("7");

  const yearsToRetire = Math.max((parseFloat(retireAge) || 0) - (parseFloat(age) || 0), 0);
  const n = yearsToRetire * 12;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const p = parseFloat(current) || 0;
  const m = parseFloat(monthly) || 0;
  const matchPct = (parseFloat(match) || 0) / 100;
  const totalMonthly = m + m * matchPct;

  const futureValue = r > 0
    ? p * Math.pow(1 + r, n) + totalMonthly * ((Math.pow(1 + r, n) - 1) / r)
    : p + totalMonthly * n;
  const totalContributed = p + m * n;
  const employerMatch = m * matchPct * n;
  const growth = futureValue - totalContributed - employerMatch;

  // 4% rule
  const annualWithdrawal = futureValue * 0.04;
  const monthlyInRetirement = annualWithdrawal / 12;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <CalcInput label="Current Age" value={age} onChange={setAge} />
        <CalcInput label="Retirement Age" value={retireAge} onChange={setRetireAge} />
        <CalcInput label="Current Balance" value={current} onChange={setCurrent} prefix="$" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <CalcInput label="Monthly Contribution" value={monthly} onChange={setMonthly} prefix="$" />
        <CalcInput label="Employer Match" value={match} onChange={setMatch} suffix="%" />
        <CalcInput label="Annual Return" value={rate} onChange={setRate} suffix="%" step="0.1" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <CalcResult label="Projected at Retirement" value={fmtCompact(futureValue)} accent="var(--green)" sub={`in ${yearsToRetire} years`} />
        <CalcResult label="Monthly in Retirement" value={fmt(monthlyInRetirement)} accent="var(--accent)" sub="4% safe withdrawal" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <CalcResult label="Your Contributions" value={fmtCompact(totalContributed)} />
        <CalcResult label="Employer Match" value={fmtCompact(employerMatch)} accent="var(--amber)" />
        <CalcResult label="Investment Growth" value={fmtCompact(growth)} accent="var(--green)" />
      </div>
    </div>
  );
}

export function LoanPayoffCalc() {
  const [balance, setBalance] = useState("15000");
  const [rate, setRate] = useState("6.5");
  const [payment, setPayment] = useState("350");
  const [extra, setExtra] = useState("100");

  const b = parseFloat(balance) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const p = parseFloat(payment) || 0;
  const e = parseFloat(extra) || 0;

  const calcMonths = (pmt) => {
    if (pmt <= 0 || r <= 0 || b <= 0) return 0;
    if (pmt <= b * r) return Infinity;
    return Math.ceil(Math.log(pmt / (pmt - b * r)) / Math.log(1 + r));
  };

  const monthsNormal = calcMonths(p);
  const monthsWithExtra = calcMonths(p + e);
  const totalNormal = p * monthsNormal;
  const totalWithExtra = (p + e) * monthsWithExtra;
  const interestNormal = totalNormal - b;
  const interestWithExtra = totalWithExtra - b;
  const interestSaved = interestNormal - interestWithExtra;
  const monthsSaved = monthsNormal - monthsWithExtra;

  const futureDate = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Loan Balance" value={balance} onChange={setBalance} prefix="$" />
        <CalcInput label="Interest Rate" value={rate} onChange={setRate} suffix="%" step="0.1" />
        <CalcInput label="Monthly Payment" value={payment} onChange={setPayment} prefix="$" />
        <CalcInput label="Extra Payment" value={extra} onChange={setExtra} prefix="$" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
        <div style={{ padding: "16px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>Without Extra</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{monthsNormal === Infinity ? "Never" : `${monthsNormal} months`}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{monthsNormal < Infinity ? `Paid off ${futureDate(monthsNormal)}` : "Payment too low"}</div>
          <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, marginTop: 4 }}>{fmt(interestNormal)} interest</div>
        </div>
        <div style={{ padding: "16px", borderRadius: 12, border: "2px solid var(--green)", background: "var(--green-bg)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--green)", marginBottom: 8 }}>With Extra</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{monthsWithExtra === Infinity ? "Never" : `${monthsWithExtra} months`}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{monthsWithExtra < Infinity ? `Paid off ${futureDate(monthsWithExtra)}` : "Payment too low"}</div>
          <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 4 }}>{fmt(interestWithExtra)} interest</div>
        </div>
      </div>
      {monthsSaved > 0 && interestSaved > 0 && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          Extra {fmt(e)}/mo saves <span style={{ color: "var(--green)", fontWeight: 700 }}>{fmt(interestSaved)}</span> in interest and <span style={{ color: "var(--green)", fontWeight: 700 }}>{monthsSaved} months</span>
        </div>
      )}
    </div>
  );
}

export function SavingsGoalCalc() {
  const [goal, setGoal] = useState("10000");
  const [current, setCurrent] = useState("1000");
  const [rate, setRate] = useState("4.5");
  const [months, setMonths] = useState("24");

  const g = parseFloat(goal) || 0;
  const c = parseFloat(current) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = parseFloat(months) || 0;
  const needed = g - c;

  // How much to save monthly
  const monthlySave = r > 0 && n > 0
    ? (needed - c * (Math.pow(1 + r, n) - 1)) / ((Math.pow(1 + r, n) - 1) / r)
    : n > 0 ? needed / n : 0;

  // If saving X/mo, how many months?
  const monthsNeeded = r > 0 && monthlySave > 0
    ? Math.ceil(Math.log((g * r + monthlySave) / (c * r + monthlySave)) / Math.log(1 + r))
    : monthlySave > 0 ? Math.ceil(needed / monthlySave) : 0;

  const futureDate = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <CalcInput label="Savings Goal" value={goal} onChange={setGoal} prefix="$" />
        <CalcInput label="Current Savings" value={current} onChange={setCurrent} prefix="$" />
        <CalcInput label="APY / Return" value={rate} onChange={setRate} suffix="%" step="0.1" />
        <CalcInput label="Timeframe" value={months} onChange={setMonths} suffix="mo" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 4 }}>
        <CalcResult label="Monthly Savings Needed" value={monthlySave > 0 ? fmt(Math.max(monthlySave, 0)) : "$0.00"} accent="var(--accent)" />
        <CalcResult label="Amount Needed" value={fmt(Math.max(needed, 0))} sub={`${pct(c, g).toFixed(0)}% there`} />
        <CalcResult label="Target Date" value={futureDate(n)} accent="var(--green)" />
      </div>
    </div>
  );
}

export function CalculatorPage() {
  const [activeCalc, setActiveCalc] = useState("compound");

  const calcs = {
    compound: CompoundInterestCalc,
    mortgage: MortgageCalc,
    retirement: RetirementCalc,
    loan: LoanPayoffCalc,
    savings: SavingsGoalCalc,
  };
  const ActiveCalcComponent = calcs[activeCalc];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Financial Calculators</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Run the numbers on any financial scenario</p>
      </div>

      {/* Calculator selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
        {CALCULATORS.map((calc) => {
          const active = activeCalc === calc.id;
          return (
            <div key={calc.id} onClick={() => setActiveCalc(calc.id)}
              style={{
                padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent)" + "0a" : "var(--card)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{calc.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: active ? "var(--accent)" : "var(--text-primary)", marginBottom: 2 }}>{calc.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{calc.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Active calculator */}
      <Card>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{CALCULATORS.find((c) => c.id === activeCalc)?.icon}</span>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              {CALCULATORS.find((c) => c.id === activeCalc)?.name}
            </h2>
          </div>
          <ActiveCalcComponent />
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// TRANSACTIONS PAGE
// ─────────────────────────────────────────────

