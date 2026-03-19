import { useState } from "react";
import { Card, Overlay, ProgressBar, SwipeToDelete } from "./ui.jsx";
import { FieldLabel } from "./forms.jsx";
import { COLOR_THEMES, DEFAULT_SETTINGS } from "../themes.js";
import { INITIAL_CATEGORIES, INITIAL_BILL_TEMPLATES, INITIAL_NETWORTH_HISTORY } from "../constants.js";
import { nextId, INPUT_STYLE, FREQUENCY_LABELS } from "../engine.js";

export function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().split("T")[0];
  const [data, setData] = useState({
    householdName: "",
    incomeStreams: [{ id: 1, source: "", amount: "", frequency: "semimonthly", anchorDate: today }],
    bills: [{ id: 1, name: "", amount: "", frequency: "monthly", dueDay: "1" }],
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c, enabled: true })),
    debts: [{ id: 1, name: "", balance: "", minPayment: "", apr: "", dueDay: "1", frequency: "monthly", dueMonth: "1" }],
    savingsTarget: "",
    checkingBalance: "",
    savingsBalance: "",
    colorTheme: "blue_gold",
    theme: "dark",
  });

  const update = (key, val) => setData((d) => ({ ...d, [key]: val }));
  const currentStep = ONBOARDING_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const addListItem = (key, template) => {
    setData((d) => ({ ...d, [key]: [...d[key], { ...template, id: d[key].length + 1 }] }));
  };

  const updateListItem = (key, id, field, value) => {
    setData((d) => ({ ...d, [key]: d[key].map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  };

  const removeListItem = (key, id) => {
    setData((d) => ({ ...d, [key]: d[key].filter((item) => item.id !== id) }));
  };

  const handleFinish = () => {
    const now = new Date();

    // Income sources
    const incomes = data.incomeStreams
      .filter((s) => s.source.trim() && parseFloat(s.amount) > 0)
      .map((s, i) => ({
        id: i + 1,
        source: s.source.trim(),
        amount: parseFloat(s.amount),
        date: s.anchorDate || today,
        recurring: true,
        frequency: s.frequency,
        category: "employment",
        icon: "💼",
      }));

    // Bill templates — use dueDay to build a proper anchorDate for this month
    const bills = data.bills
      .filter((b) => b.name.trim() && parseFloat(b.amount) > 0)
      .map((b, i) => {
        // semimonthly always anchors to the 1st — engine generates both 1st and 15th
        const day = b.frequency === "semimonthly" ? 1 : Math.min(parseInt(b.dueDay) || 1, 28);
        const anchorDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          id: i + 1,
          name: b.name.trim(),
          amount: parseFloat(b.amount),
          anchorDate,
          recurring: true,
          frequency: b.frequency,
        };
      });

    // Budget targets — create one per bill so they appear in Budget page
    const budgetTargets = {};
    bills.forEach((b) => {
      const catId = `bill_${b.id}`;
      const monthlyAmt = b.frequency === "weekly" ? b.amount * 52 / 12
        : b.frequency === "biweekly" ? b.amount * 26 / 12
        : b.frequency === "semimonthly" ? b.amount * 2
        : b.frequency === "quarterly" ? b.amount / 3
        : b.frequency === "yearly" ? b.amount / 12
        : b.amount;
      budgetTargets[catId] = { type: "monthly", monthlyAmount: Math.round(monthlyAmt * 100) / 100 };
    });

    // Categories — one per bill plus the standard set
    const billCategories = bills.map((b, i) => ({
      id: `bill_${b.id}`,
      name: b.name,
      icon: "📋",
      limit: budgetTargets[`bill_${b.id}`]?.monthlyAmount || b.amount,
      color: "#38bdf8",
    }));
    // Spending categories — user's chosen set + bill categories
    const chosenCategories = data.categories
      .filter((c) => c.enabled)
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon, limit: parseFloat(c.limit) || 0 }));
    const categories = [...chosenCategories, ...billCategories];

    // Debts
    const debts = data.debts
      .filter((d) => d.name.trim() && parseFloat(d.balance) > 0)
      .map((d, i) => {
        const day = Math.min(parseInt(d.dueDay) || 1, 28);
        const mon = Math.min(parseInt(d.dueMonth) || 1, 12);
        const freq = d.frequency || "monthly";
        // Build anchorDate: for yearly use the specified month, otherwise current month
        const anchorMonth = freq === "yearly" ? mon : now.getMonth() + 1;
        const anchorDate = `${now.getFullYear()}-${String(anchorMonth).padStart(2, "0")}-${String(freq === "semimonthly" ? 1 : day).padStart(2, "0")}`;
        return {
          id: i + 1,
          name: d.name.trim(),
          balance: parseFloat(d.balance),
          originalBalance: parseFloat(d.balance),
          minPayment: parseFloat(d.minPayment) || 0,
          apr: parseFloat(d.apr) || 0,
          icon: "💳",
          lender: "",
          startDate: anchorDate,
          frequency: freq,
          payments: [],
        };
      });

    // Create bill templates for debt minimum payments so they show in Paycheck Planner
    const debtBillTemplates = debts
      .filter((d) => d.minPayment > 0)
      .map((d, i) => ({
        id: bills.length + i + 1,
        name: `${d.name} (min pmt)`,
        amount: d.minPayment,
        anchorDate: d.startDate,
        recurring: true,
        frequency: d.frequency,
        isDebtPayment: true,
      }));

    // Assets
    const assets = [];
    if (parseFloat(data.checkingBalance) > 0) assets.push({ id: 1, name: "Checking Account", value: parseFloat(data.checkingBalance), category: "cash", icon: "🏦" });
    if (parseFloat(data.savingsBalance) > 0) assets.push({ id: 2, name: "Savings Account", value: parseFloat(data.savingsBalance), category: "cash", icon: "💰" });

    // Savings goals
    const savingsGoals = [];
    if (parseFloat(data.savingsTarget) > 0) {
      savingsGoals.push({ id: 1, name: "Emergency Fund", target: parseFloat(data.savingsTarget), current: parseFloat(data.savingsBalance) || 0, icon: "🛡", monthlyContribution: 0, deadline: "", color: "var(--green)", contributions: [] });
    }

    const newSettings = {
      ...DEFAULT_SETTINGS,
      householdName: data.householdName.trim() || "My Household",
      colorTheme: data.colorTheme,
      theme: data.theme,
      onboardingComplete: true,
    };

    onComplete({
      income: incomes.length > 0 ? incomes : INITIAL_INCOME,
      billTemplates: bills.length > 0 ? [...bills, ...debtBillTemplates] : [...INITIAL_BILL_TEMPLATES, ...debtBillTemplates],
      debts: debts.length > 0 ? debts : INITIAL_DEBTS,
      assets: assets.length > 0 ? assets : INITIAL_ASSETS,
      savingsGoals: savingsGoals.length > 0 ? savingsGoals : INITIAL_SAVINGS_GOALS,
      categories,
      budgetTargets: Object.keys(budgetTargets).length > 0 ? { ...INITIAL_BUDGET_TARGETS, ...budgetTargets } : INITIAL_BUDGET_TARGETS,
      transactions: [],
      paidDates: new Set(),
      settings: newSettings,
    });
  };

  // Get active theme for preview
  const previewTheme = COLOR_THEMES[data.colorTheme] || COLOR_THEMES.blue_gold;
  const previewVars = data.theme === "light" ? previewTheme.light : previewTheme.dark;

  return (
    <div className="maverick-onboarding" style={{
      ...previewVars,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      padding: "env(safe-area-inset-top, 20px) 20px env(safe-area-inset-bottom, 20px) 20px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", paddingTop: 24, paddingBottom: 40 }}>
        {/* Progress dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.id} style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 4,
              background: i <= step ? "var(--accent)" : "var(--track)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Step icon + title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{currentStep.icon}</div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{currentStep.title}</h2>
        </div>

        {/* Step content */}
        <Card>
          <div style={{ padding: "24px" }}>

            {/* STEP 0: Welcome */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, textAlign: "center" }}>
                  Let's set up your personal finance dashboard. This takes about 2 minutes — you can always change everything later in Settings.
                </div>
                <div>
                  <FieldLabel>What should we call your household?</FieldLabel>
                  <input value={data.householdName} onChange={(e) => update("householdName", e.target.value)} placeholder="e.g. The Smiths, My Budget, Home" style={INPUT_STYLE} />
                </div>
              </div>
            )}

            {/* STEP 1: Income */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Add your regular income sources. You can add more later.</div>
                {data.incomeStreams.map((s) => (
                  <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 120px" }}>
                      {s.id === 1 && <FieldLabel>Source</FieldLabel>}
                      <input value={s.source} onChange={(e) => updateListItem("incomeStreams", s.id, "source", e.target.value)} placeholder="e.g. My Salary" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 80px" }}>
                      {s.id === 1 && <FieldLabel>Amount ($)</FieldLabel>}
                      <input type="number" step="0.01" min="0" value={s.amount} onChange={(e) => updateListItem("incomeStreams", s.id, "amount", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 110px" }}>
                      {s.id === 1 && <FieldLabel>Frequency</FieldLabel>}
                      <select value={s.frequency} onChange={(e) => updateListItem("incomeStreams", s.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="semimonthly">1st & 15th</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div style={{ flex: "1 1 110px" }}>
                      {s.id === 1 && <FieldLabel>Next Pay Date</FieldLabel>}
                      <input type="date" value={s.anchorDate} onChange={(e) => updateListItem("incomeStreams", s.id, "anchorDate", e.target.value)} style={INPUT_STYLE} />
                    </div>
                    {data.incomeStreams.length > 1 && (
                      <button onClick={() => removeListItem("incomeStreams", s.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem("incomeStreams", { source: "", amount: "", frequency: "biweekly", anchorDate: today })}
                  style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Another Income
                </button>
              </div>
            )}

            {/* STEP 2: Bills */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Add your regular bills. These will appear on the Calendar, Paycheck Planner, and Budget pages.</div>
                {data.bills.map((b) => (
                  <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ flex: "2 1 120px" }}>
                      {b.id === 1 && <FieldLabel>Bill Name</FieldLabel>}
                      <input value={b.name} onChange={(e) => updateListItem("bills", b.id, "name", e.target.value)} placeholder="e.g. Rent, Electric" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 80px" }}>
                      {b.id === 1 && <FieldLabel>Amount ($)</FieldLabel>}
                      <input type="number" step="0.01" min="0" value={b.amount} onChange={(e) => updateListItem("bills", b.id, "amount", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: "1 1 100px" }}>
                      {b.id === 1 && <FieldLabel>Frequency</FieldLabel>}
                      <select value={b.frequency} onChange={(e) => updateListItem("bills", b.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="semimonthly">1st & 15th</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {b.frequency !== "semimonthly" && (
                    <div style={{ flex: "0 1 80px" }}>
                      {b.id === 1 && <FieldLabel>Due Day</FieldLabel>}
                      <select value={b.dueDay} onChange={(e) => updateListItem("bills", b.id, "dueDay", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    )}
                    {data.bills.length > 1 && (
                      <button onClick={() => removeListItem("bills", b.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem("bills", { name: "", amount: "", frequency: "monthly", dueDay: "1" })}
                  style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Another Bill
                </button>
              </div>
            )}

            {/* STEP 3: Budget Categories */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                  Choose which spending categories to track. Toggle any off you don't need, edit names and monthly limits, or add your own.
                </div>
                {data.categories.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, border: `1px solid ${c.enabled ? "var(--border)" : "var(--border-subtle)"}`, background: c.enabled ? "var(--card)" : "var(--surface)", opacity: c.enabled ? 1 : 0.5, transition: "all 0.15s" }}>
                    {/* Toggle */}
                    <div onClick={() => {
                      const newCats = data.categories.map((x) => x.id === c.id ? { ...x, enabled: !x.enabled } : x);
                      update("categories", newCats);
                    }} style={{ width: 36, height: 20, borderRadius: 10, padding: 2, background: c.enabled ? "var(--accent)" : "var(--track)", display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "transform 0.2s", transform: c.enabled ? "translateX(16px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                    {/* Icon */}
                    <input value={c.icon} onChange={(e) => { const newCats = data.categories.map((x) => x.id === c.id ? { ...x, icon: e.target.value } : x); update("categories", newCats); }} maxLength={2} style={{ ...INPUT_STYLE, width: 42, textAlign: "center", fontSize: 16, padding: "6px 4px", flexShrink: 0 }} />
                    {/* Name */}
                    <input value={c.name} onChange={(e) => { const newCats = data.categories.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x); update("categories", newCats); }} style={{ ...INPUT_STYLE, flex: 1 }} placeholder="Category name" />
                    {/* Limit */}
                    <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                      <input type="number" min="0" step="10" value={c.limit} onChange={(e) => { const newCats = data.categories.map((x) => x.id === c.id ? { ...x, limit: e.target.value } : x); update("categories", newCats); }} style={{ ...INPUT_STYLE, width: 80 }} placeholder="0" />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/mo</span>
                    </div>
                    {/* Remove custom */}
                    {!INITIAL_CATEGORIES.find((ic) => ic.id === c.id) && (
                      <button onClick={() => update("categories", data.categories.filter((x) => x.id !== c.id))} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "0 2px", lineHeight: 1 }}>×</button>
                    )}
                  </div>
                ))}
                {/* Add custom category */}
                <button onClick={() => {
                  const newId = `custom_${Date.now()}`;
                  update("categories", [...data.categories, { id: newId, name: "", icon: "●", limit: "", enabled: true }]);
                }} style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Custom Category
                </button>
              </div>
            )}

            {/* STEP 4: Debts & Savings */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Where do you stand financially right now?</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <FieldLabel>Checking Balance</FieldLabel>
                    <input type="number" step="0.01" min="0" value={data.checkingBalance} onChange={(e) => update("checkingBalance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                  </div>
                  <div>
                    <FieldLabel>Savings Balance</FieldLabel>
                    <input type="number" step="0.01" min="0" value={data.savingsBalance} onChange={(e) => update("savingsBalance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                  </div>
                </div>

                <div>
                  <FieldLabel>Emergency Fund Target (optional)</FieldLabel>
                  <input type="number" step="100" min="0" value={data.savingsTarget} onChange={(e) => update("savingsTarget", e.target.value)} placeholder="e.g. 15000" style={INPUT_STYLE} />
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>Any debts? (optional)</div>
                  {data.debts.map((d) => (
                    <div key={d.id} style={{ padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Row 1: Name, Balance, Min Payment, APR */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "2 1 110px" }}>
                          {d.id === 1 && <FieldLabel>Name</FieldLabel>}
                          <input value={d.name} onChange={(e) => updateListItem("debts", d.id, "name", e.target.value)} placeholder="e.g. Credit Card" style={INPUT_STYLE} />
                        </div>
                        <div style={{ flex: "1 1 80px" }}>
                          {d.id === 1 && <FieldLabel>Balance ($)</FieldLabel>}
                          <input type="number" step="0.01" min="0" value={d.balance} onChange={(e) => updateListItem("debts", d.id, "balance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                        </div>
                        <div style={{ flex: "1 1 75px" }}>
                          {d.id === 1 && <FieldLabel>Min Pmt</FieldLabel>}
                          <input type="number" step="0.01" min="0" value={d.minPayment} onChange={(e) => updateListItem("debts", d.id, "minPayment", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                        </div>
                        <div style={{ flex: "0.6 1 60px" }}>
                          {d.id === 1 && <FieldLabel>APR %</FieldLabel>}
                          <input type="number" step="0.1" min="0" value={d.apr} onChange={(e) => updateListItem("debts", d.id, "apr", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                        </div>
                        {data.debts.length > 1 && (
                          <button onClick={() => removeListItem("debts", d.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 4px", fontSize: 18, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      {/* Row 2: Frequency + Due Date */}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: "1 1 110px" }}>
                          <FieldLabel>Payment Frequency</FieldLabel>
                          <select value={d.frequency} onChange={(e) => updateListItem("debts", d.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Biweekly</option>
                            <option value="semimonthly">1st & 15th</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Annually</option>
                          </select>
                        </div>
                        {d.frequency !== "semimonthly" && d.frequency !== "weekly" && d.frequency !== "biweekly" && (
                          <div style={{ flex: "0 1 80px" }}>
                            <FieldLabel>Due Day</FieldLabel>
                            <select value={d.dueDay} onChange={(e) => updateListItem("debts", d.id, "dueDay", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>{day}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {d.frequency === "yearly" && (
                          <div style={{ flex: "1 1 100px" }}>
                            <FieldLabel>Due Month</FieldLabel>
                            <select value={d.dueMonth || "1"} onChange={(e) => updateListItem("debts", d.id, "dueMonth", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                                <option key={i+1} value={i+1}>{m}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addListItem("debts", { name: "", balance: "", minPayment: "", apr: "", dueDay: "1", frequency: "monthly", dueMonth: "1" })}
                    style={{ padding: "6px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                    + Add Debt
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Theme */}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>Pick a look that feels right. You can change this anytime in Settings.</div>

                {/* Dark / Light */}
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ key: "dark", label: "Dark", icon: "🌙" }, { key: "light", label: "Light", icon: "☀" }].map((mode) => {
                    const active = data.theme === mode.key;
                    return (
                      <div key={mode.key} onClick={() => update("theme", mode.key)}
                        style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)" + "10" : "var(--surface)", textAlign: "center", transition: "all 0.15s" }}>
                        <div style={{ fontSize: 20, marginBottom: 2 }}>{mode.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>{mode.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Color themes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {Object.entries(COLOR_THEMES).map(([key, theme]) => {
                    const active = data.colorTheme === key;
                    return (
                      <div key={key} onClick={() => update("colorTheme", key)}
                        style={{ padding: "10px", borderRadius: 8, cursor: "pointer", border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)" + "10" : "var(--surface)", textAlign: "center", transition: "all 0.15s" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 6 }}>
                          {theme.preview.map((c, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 3, background: c }} />)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-muted)" }}>{theme.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
            {!isFirst && (
              <button onClick={() => setStep((s) => s - 1)}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
            )}
            {isFirst && (
              <button onClick={() => {
                // Skip onboarding — use sample data
                onComplete({ settings: { ...DEFAULT_SETTINGS, onboardingComplete: true } });
              }}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Skip — Use Sample Data
              </button>
            )}
            <button onClick={() => {
              if (isLast) handleFinish();
              else setStep((s) => s + 1);
            }}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {isLast ? "Let's Go!" : "Next"}
            </button>
          </div>
        </Card>

        {/* Step counter */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--text-muted)" }}>
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────

