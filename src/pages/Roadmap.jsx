import { useState, useMemo } from "react";
import { Card, CardHeader, ProgressBar } from "../components/ui.jsx";
import { fmt } from "../engine.js";

export function FinancialRoadmapPage({ savingsGoals, debts, income, transactions, assets, categories, onNavigate }) {
  // Compute data needed for each baby step

  // Monthly expenses estimate
  const monthlyExpenses = useMemo(() => {
    const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
    // Rough estimate: total from sample data is approx 1 month
    return totalSpent || 3500;
  }, [transactions]);

  // Monthly income
  const monthlyIncome = useMemo(() => {
    return income.reduce((s, i) => {
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
  }, [income]);

  // Cash on hand (checking + savings)
  const cashBalance = assets.filter((a) => a.category === "cash").reduce((s, a) => s + a.value, 0);

  // Emergency fund goal (use existing savings goal if named "Emergency Fund")
  const emergencyGoal = savingsGoals.find((g) => g.name.toLowerCase().includes("emergency"));
  const emergencyFunded = emergencyGoal ? emergencyGoal.current : 0;

  // Active debts (non-mortgage)
  const activeDebts = debts.filter((d) => d.balance > 0);
  const totalDebt = activeDebts.reduce((s, d) => s + d.balance, 0);
  const totalOriginalDebt = activeDebts.reduce((s, d) => s + d.originalBalance, 0);
  const debtPaidOff = activeDebts.length === 0;

  // Retirement assets
  const retirementAssets = assets.filter((a) => a.category === "retirement").reduce((s, a) => s + a.value, 0);

  // Gross income estimate (assume net is ~75% of gross for retirement % calc)
  const grossMonthlyEstimate = monthlyIncome / 0.75;

  // Step status computation
  const stepStatuses = useMemo(() => {
    const statuses = [];

    // Step 1: $1,000 starter emergency fund
    const step1Progress = Math.min(cashBalance, 1000);
    const step1Complete = cashBalance >= 1000;
    statuses.push({
      ...BABY_STEPS[0],
      progress: step1Progress / 1000,
      complete: step1Complete,
      current: !step1Complete,
      detail: step1Complete
        ? `You have ${fmt(cashBalance)} in cash — starter fund covered`
        : `${fmt(step1Progress)} of $1,000 saved · ${fmt(1000 - step1Progress)} to go`,
    });

    // Step 2: Pay off all debt (snowball)
    const step2Complete = debtPaidOff;
    const step2Current = step1Complete && !step2Complete;
    const debtProgress = totalOriginalDebt > 0 ? (totalOriginalDebt - totalDebt) / totalOriginalDebt : 1;
    statuses.push({
      ...BABY_STEPS[1],
      progress: debtProgress,
      complete: step2Complete,
      current: step2Current,
      detail: step2Complete
        ? "All non-mortgage debt is paid off!"
        : `${fmt(totalDebt)} remaining across ${activeDebts.length} debt${activeDebts.length !== 1 ? "s" : ""} · ${(debtProgress * 100).toFixed(0)}% paid`,
      debts: activeDebts,
    });

    // Step 3: Full emergency fund (3-6 months of expenses)
    const targetMin = monthlyExpenses * 3;
    const targetMax = monthlyExpenses * 6;
    const efBalance = emergencyFunded || 0;
    const step3Complete = efBalance >= targetMin;
    const step3Current = step1Complete && step2Complete && !step3Complete;
    statuses.push({
      ...BABY_STEPS[2],
      progress: Math.min(efBalance / targetMin, 1),
      complete: step3Complete,
      current: step3Current,
      detail: step3Complete
        ? `Emergency fund at ${fmt(efBalance)} — ${(efBalance / monthlyExpenses).toFixed(1)} months covered`
        : `${fmt(efBalance)} of ${fmt(targetMin)}–${fmt(targetMax)} target (${(efBalance / monthlyExpenses).toFixed(1)} months)`,
      targetMin,
      targetMax,
    });

    // Step 4: Invest 15% for retirement
    const retirementPct = grossMonthlyEstimate > 0 ? (retirementAssets / (grossMonthlyEstimate * 12)) * 100 : 0;
    // This step is more about ongoing behavior than a completion threshold
    const step4Active = step1Complete && step2Complete && step3Complete;
    statuses.push({
      ...BABY_STEPS[3],
      progress: Math.min(retirementPct / 15, 1),
      complete: false, // ongoing
      current: step4Active,
      detail: step4Active
        ? `${fmt(retirementAssets)} in retirement accounts · target 15% of gross income (${fmt(grossMonthlyEstimate * 0.15)}/mo)`
        : `Not yet — complete Baby Steps 1-3 first`,
    });

    // Step 5: Save for kids' college
    const step5Active = step4Active;
    statuses.push({
      ...BABY_STEPS[4],
      progress: 0,
      complete: false,
      current: step5Active,
      detail: step5Active
        ? "Open a 529 plan or ESA and start contributing"
        : "Not yet — complete Baby Steps 1-4 first",
    });

    // Step 6: Pay off home
    const step6Active = step4Active;
    statuses.push({
      ...BABY_STEPS[5],
      progress: 0,
      complete: false,
      current: step6Active,
      detail: step6Active
        ? "Make extra mortgage payments to pay off your home early"
        : "Not yet — complete Baby Steps 1-4 first",
    });

    // Step 7: Build wealth & give
    const step7Active = step4Active;
    statuses.push({
      ...BABY_STEPS[6],
      progress: 0,
      complete: false,
      current: step7Active,
      detail: step7Active
        ? "Max out investments, build wealth, and give generously"
        : "Not yet — complete Baby Steps 1-6 first",
    });

    return statuses;
  }, [cashBalance, debtPaidOff, totalDebt, totalOriginalDebt, activeDebts, emergencyFunded, monthlyExpenses, retirementAssets, grossMonthlyEstimate]);

  // Current step (first incomplete)
  const currentStepNum = stepStatuses.find((s) => s.current)?.step || 1;
  const completedCount = stepStatuses.filter((s) => s.complete).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Financial Roadmap</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Dave Ramsey's 7 Baby Steps — your path to financial peace
        </p>
      </div>

      {/* Progress overview */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Your Progress</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
                Baby Step {currentStepNum}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green)" }}>{completedCount}<span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 500 }}>/7</span></div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>steps complete</div>
            </div>
          </div>
          {/* Step progress bar */}
          <div style={{ display: "flex", gap: 4 }}>
            {stepStatuses.map((s) => (
              <div key={s.step} style={{
                flex: 1, height: 8, borderRadius: 4,
                background: s.complete ? "var(--green)" : s.current ? "var(--accent)" : "var(--track)",
                transition: "background 0.3s",
                opacity: s.complete ? 1 : s.current ? 0.8 : 0.4,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--text-muted)" }}>
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Cash on Hand" value={fmt(cashBalance)} sub="checking + savings" accent="var(--green)" />
        <MetricBox label="Total Debt" value={fmt(totalDebt)} sub={debtPaidOff ? "debt free!" : `${activeDebts.length} active`} accent={debtPaidOff ? "var(--green)" : "var(--red)"} />
        <MetricBox label="Emergency Fund" value={fmt(emergencyFunded)} sub={`${(emergencyFunded / Math.max(monthlyExpenses, 1)).toFixed(1)} months`} accent="var(--accent)" />
        <MetricBox label="Retirement" value={fmtCompact(retirementAssets)} sub="invested" accent="var(--text-secondary)" />
      </div>

      {/* Baby Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {stepStatuses.map((step) => {
          const isCurrent = step.current;
          const isComplete = step.complete;
          const isFuture = !isCurrent && !isComplete;
          const borderColor = isComplete ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--border)";

          return (
            <Card key={step.step} style={{ borderColor, transition: "border-color 0.3s" }}>
              <div style={{ padding: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Step number circle */}
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: isComplete ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--surface)",
                    border: `2px solid ${isComplete ? "var(--green)" : isCurrent ? "var(--accent)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s",
                  }}>
                    {isComplete ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <span style={{ fontSize: 18, fontWeight: 700, color: isCurrent ? "#fff" : "var(--text-muted)" }}>
                        {step.step}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{step.icon}</span>
                      <span style={{ fontSize: 17, fontWeight: 700, color: isFuture ? "var(--text-muted)" : "var(--text-primary)" }}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <span style={{
                          padding: "2px 8px", borderRadius: 999, background: "var(--accent)" + "20",
                          color: "var(--accent)", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: isCurrent ? 14 : 0 }}>
                      {step.desc}
                    </div>

                    {/* Progress bar for current/complete steps with measurable progress */}
                    {(isCurrent || isComplete) && step.progress > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <ProgressBar value={step.progress * 100} max={100} color={isComplete ? "var(--green)" : "var(--accent)"} height={6} />
                        <div style={{ marginTop: 6, fontSize: 12, color: isComplete ? "var(--green)" : "var(--text-secondary)", fontWeight: 500 }}>
                          {step.detail}
                        </div>
                      </div>
                    )}

                    {/* Detail for steps without progress bars */}
                    {(isCurrent || isComplete) && step.progress === 0 && step.detail && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                        {step.detail}
                      </div>
                    )}

                    {/* Debt list for Step 2 if current */}
                    {isCurrent && step.step === 2 && step.debts && step.debts.length > 0 && (
                      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>Debt Snowball Order</div>
                        {[...step.debts].sort((a, b) => a.balance - b.balance).map((d, i) => (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < step.debts.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                            <span style={{ width: 20, height: 20, borderRadius: "50%", background: i === 0 ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: i === 0 ? "#fff" : "var(--text-muted)", flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                              {d.icon} {d.name}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                              {fmt(d.balance)}
                            </span>
                          </div>
                        ))}
                        <button
                          onClick={() => onNavigate("strategy")}
                          style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          View Debt Strategy →
                        </button>
                      </div>
                    )}

                    {/* Emergency fund detail for Step 3 */}
                    {isCurrent && step.step === 3 && (
                      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>3-6 Month Target</span>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                            {fmt(step.targetMin)} – {fmt(step.targetMax)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                          Based on {fmt(monthlyExpenses)}/mo in expenses
                        </div>
                        <button
                          onClick={() => onNavigate("savings")}
                          style={{ marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          View Savings Goals →
                        </button>
                      </div>
                    )}

                    {/* Future step dimmed detail */}
                    {isFuture && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                        {step.detail}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Motivational footer */}
      <div style={{ marginTop: 28, padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🦌</div>
        <div style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
          "If you will live like no one else, later you can live and give like no one else."
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          You're on Baby Step {currentStepNum} of 7 — keep going!
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALCULATOR PAGE
// ─────────────────────────────────────────────

const CALCULATORS = [
  { id: "compound", name: "Compound Interest", icon: "📈", desc: "See how your money grows over time" },
  { id: "mortgage", name: "Mortgage", icon: "🏠", desc: "Monthly payment and amortization" },
  { id: "retirement", name: "401(k) / Retirement", icon: "🏖", desc: "Project your retirement savings" },
  { id: "loan", name: "Loan Payoff", icon: "💳", desc: "How fast can you pay it off?" },
  { id: "savings", name: "Savings Goal", icon: "🎯", desc: "How much to save monthly?" },
];

