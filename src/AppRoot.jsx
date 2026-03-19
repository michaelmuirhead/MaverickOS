import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { supabase, loadState, saveState, clearState, saveStateToSupabase, loadStateFromSupabase, AuthScreen } from "./supabase.jsx";
import { DEFAULT_SETTINGS, COLOR_THEMES } from "./themes.js";
import { INITIAL_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_INCOME, INITIAL_PAYCHECK_STREAMS, INITIAL_CUSTOM_ITEMS, INITIAL_BUDGET_ROLLOVERS, INITIAL_BUDGET_TARGETS, INITIAL_RECURRING_TRANSACTIONS, INITIAL_BILL_TEMPLATES, INITIAL_NETWORTH_HISTORY, INITIAL_PAID_DATES, INITIAL_SAVINGS_GOALS, INITIAL_DEBTS, INITIAL_ASSETS } from "./constants.js";
import { generateBillInstances, generateUpcomingBills, fmt, nextId, seedNextId, setCurrency } from "./engine.js";
import { UndoToast } from "./components/ui.jsx";
import { useIsMobile, MobileNav, MobileMoreMenu, FloatingActionButton, Sidebar, NAV_ITEMS } from "./components/layout.jsx";
import { ThemeStyles, ResponsiveStyles } from "./components/styles.jsx";
import { PwaHead } from "./components/pwa.jsx";
import { OnboardingWizard } from "./components/onboarding.jsx";
import { DashboardPage } from "./pages/Dashboard.jsx";
import { CalendarPage } from "./pages/Calendar.jsx";
import { RecurringBillsPage } from "./pages/RecurringBills.jsx";
import { SavingsPage } from "./pages/Savings.jsx";
import { PaycheckPlannerPage } from "./pages/Paychecks.jsx";
import { IncomePage } from "./pages/Income.jsx";
import { DebtPage } from "./pages/Debt.jsx";
import { NetWorthPage } from "./pages/NetWorth.jsx";
import { DebtStrategyPage } from "./pages/DebtStrategy.jsx";
import { FinancialRoadmapPage } from "./pages/Roadmap.jsx";
import { CalculatorPage } from "./pages/Calculators.jsx";
import { TransactionsPage } from "./pages/Transactions.jsx";
import { CashFlowForecastPage } from "./pages/Forecast.jsx";
import { SpendingTrendsPage } from "./pages/Trends.jsx";
import { MonthlySummaryPage } from "./pages/Summary.jsx";
import { SettingsPage } from "./pages/Settings.jsx";
import { RecurringTransactionsPage } from "./pages/AutoSpend.jsx";
import { BudgetPage } from "./pages/Budget.jsx";

export default function MaverickOS() {
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [undoToast, setUndoToast] = useState(null);
  const isMobile = useIsMobile();

  // Auth state
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [syncStatus, setSyncStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
  const saveTimerRef = useRef(null);

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [income, setIncome] = useState(INITIAL_INCOME);
  const [billTemplates, setBillTemplates] = useState(INITIAL_BILL_TEMPLATES);
  const [paidDates, setPaidDates] = useState(INITIAL_PAID_DATES);
  const [savingsGoals, setSavingsGoals] = useState(INITIAL_SAVINGS_GOALS);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [paycheckStreams, setPaycheckStreams] = useState(INITIAL_PAYCHECK_STREAMS);
  const [customItems, setCustomItems] = useState(INITIAL_CUSTOM_ITEMS);
  const [monthlyRollovers, setMonthlyRollovers] = useState({});
  const [budgetRollovers, setBudgetRollovers] = useState(INITIAL_BUDGET_ROLLOVERS);
  const [budgetTargets, setBudgetTargets] = useState(INITIAL_BUDGET_TARGETS);
  const [recurringTransactions, setRecurringTransactions] = useState(INITIAL_RECURRING_TRANSACTIONS);
  const [networthHistory, setNetworthHistory] = useState(INITIAL_NETWORTH_HISTORY);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Undo system — snapshot current state before destructive actions
  const takeSnapshot = useCallback(() => ({
    categories, transactions, income, billTemplates, paidDates, savingsGoals,
    debts, assets, paycheckStreams, customItems, monthlyRollovers,
    budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings,
  }), [categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings]);

  const restoreSnapshot = useCallback((snap) => {
    if (snap.categories) setCategories(snap.categories);
    if (snap.transactions) setTransactions(snap.transactions);
    if (snap.income) setIncome(snap.income);
    if (snap.billTemplates) setBillTemplates(snap.billTemplates);
    if (snap.paidDates) setPaidDates(snap.paidDates);
    if (snap.savingsGoals) setSavingsGoals(snap.savingsGoals);
    if (snap.debts) setDebts(snap.debts);
    if (snap.assets) setAssets(snap.assets);
    if (snap.paycheckStreams) setPaycheckStreams(snap.paycheckStreams);
    if (snap.customItems) setCustomItems(snap.customItems);
    if (snap.monthlyRollovers) setMonthlyRollovers(snap.monthlyRollovers);
    if (snap.budgetRollovers) setBudgetRollovers(snap.budgetRollovers);
    if (snap.budgetTargets) setBudgetTargets(snap.budgetTargets);
    if (snap.recurringTransactions) setRecurringTransactions(snap.recurringTransactions);
    if (snap.networthHistory) setNetworthHistory(snap.networthHistory);
    if (snap.settings) setSettings(snap.settings);
  }, []);

  const showUndo = useCallback((message) => {
    const snapshot = takeSnapshot();
    setUndoToast({ message, snapshot });
  }, [takeSnapshot]);

  const handleUndo = useCallback(() => {
    if (undoToast?.snapshot) restoreSnapshot(undoToast.snapshot);
    setUndoToast(null);
  }, [undoToast, restoreSnapshot]);

  // Auth: check session on mount, listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load: Supabase first, localStorage fallback
  useEffect(() => {
    if (!authChecked) return;
    if (!user) { setLoaded(true); return; }
    (async () => {
      let saved = await loadStateFromSupabase(user.id);
      if (!saved) saved = loadState();
      if (!saved) { setShowOnboarding(true); setLoaded(true); return; }
      if (saved.categories) setCategories(saved.categories);
      if (saved.transactions) setTransactions(saved.transactions);
      if (saved.income) setIncome(saved.income);
      if (saved.billTemplates) setBillTemplates(saved.billTemplates);
      if (saved.paidDates) setPaidDates(saved.paidDates);
      if (saved.savingsGoals) setSavingsGoals(saved.savingsGoals);
      if (saved.debts) setDebts(saved.debts);
      if (saved.assets) setAssets(saved.assets);
      if (saved.paycheckStreams) setPaycheckStreams(saved.paycheckStreams);
      if (saved.customItems) setCustomItems(saved.customItems);
      if (saved.monthlyRollovers) setMonthlyRollovers(saved.monthlyRollovers);
      if (saved.budgetRollovers) setBudgetRollovers(saved.budgetRollovers);
      if (saved.budgetTargets) setBudgetTargets(saved.budgetTargets);
      if (saved.recurringTransactions) setRecurringTransactions(saved.recurringTransactions);
      if (saved.networthHistory) setNetworthHistory(saved.networthHistory);
      if (saved.settings) setSettings(saved.settings);
      seedNextId(saved);
      setLoaded(true);
    })();
  }, [authChecked, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync savings goals → budget categories after load (YNAB-style)
  useEffect(() => {
    if (!loaded) return;
    savingsGoals.forEach((goal) => {
      const catId = `savings_${goal.id}`;
      setCategories((prev) => {
        if (prev.find((c) => c.id === catId)) return prev;
        return [...prev, { id: catId, name: goal.name, icon: goal.icon || "💰", limit: goal.monthlyContribution || 0, color: goal.color || "var(--accent)" }];
      });
      if (goal.target > 0) {
        setBudgetTargets((prev) => {
          if (prev[catId]) return prev;
          return { ...prev, [catId]: { type: "target_by_date", targetAmount: goal.target, targetDate: goal.deadline || "", funded: goal.current || 0 } };
        });
      }
    });
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fire browser notifications for bills due, budget alerts, monthly recap
  useEffect(() => {
    if (!loaded) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notifPrefs = settings.notifications || {};
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const lastNotifKey = "maverickos_last_notif";
    const lastNotif = localStorage.getItem(lastNotifKey);
    if (lastNotif === todayStr) return; // Already fired today
    localStorage.setItem(lastNotifKey, todayStr);

    // Bills due in next 3 days
    if (notifPrefs.billsDue) {
      const upcoming = generateUpcomingBills(billTemplates, paidDates, 1);
      const soon = upcoming.filter((b) => {
        const due = new Date(b.instanceDate + "T00:00:00");
        const diff = Math.ceil((due - today) / 86400000);
        return diff >= 0 && diff <= 3;
      });
      if (soon.length > 0) {
        const total = soon.reduce((s, b) => s + b.amount, 0);
        new Notification(`${soon.length} bill${soon.length > 1 ? "s" : ""} due soon`, {
          body: `${soon.map((b) => b.name).join(", ")} — ${fmt(total)} total`,
          icon: "/icon-192.png",
        });
      }
    }

    // Monthly recap on 1st of month
    if (notifPrefs.monthlyRecap && today.getDate() === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lmKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
      const lmTx = transactions.filter((t) => t.date.startsWith(lmKey));
      const lmSpent = lmTx.reduce((s, t) => s + t.amount, 0);
      if (lmSpent > 0) {
        new Notification(`${lastMonth.toLocaleDateString("en-US", { month: "long" })} Recap`, {
          body: `You spent ${fmt(lmSpent)} last month across ${lmTx.length} transactions.`,
          icon: "/icon-192.png",
        });
      }
    }
  }, [loaded, settings.notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save: localStorage immediately + Supabase debounced 2s
  useEffect(() => {
    if (!loaded) return;
    const state = { categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings };
    saveState(state);
    if (!user) return;
    clearTimeout(saveTimerRef.current);
    setSyncStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      await saveStateToSupabase(user.id, state);
      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }, 2000);
  }, [loaded, categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Export all data as JSON download
  const handleExport = useCallback(() => {
    const data = { categories, transactions, income, billTemplates, paidDates: [...paidDates], savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `maverickos-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, networthHistory, settings]);

  // Export transactions as CSV
  const handleExportCsv = useCallback(() => {
    const catMap = {};
    categories.forEach((c) => { catMap[c.id] = c.name; });
    const header = ["Date", "Description", "Category", "Amount"];
    const rows = [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [
        t.date,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(catMap[t.categoryId] || t.categoryId || "").replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
      ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `maverickos-transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [transactions, categories]);

  // Import data from JSON string
  const handleImport = useCallback((jsonStr) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.categories) setCategories(data.categories);
      if (data.transactions) setTransactions(data.transactions);
      if (data.income) setIncome(data.income);
      if (data.billTemplates) setBillTemplates(data.billTemplates);
      if (data.paidDates) setPaidDates(new Set(data.paidDates));
      if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
      if (data.debts) setDebts(data.debts);
      if (data.assets) setAssets(data.assets);
      if (data.paycheckStreams) setPaycheckStreams(data.paycheckStreams);
      if (data.customItems) setCustomItems(data.customItems);
      if (data.monthlyRollovers) setMonthlyRollovers(data.monthlyRollovers);
      if (data.budgetRollovers) setBudgetRollovers(data.budgetRollovers);
      if (data.budgetTargets) setBudgetTargets(data.budgetTargets);
      if (data.recurringTransactions) setRecurringTransactions(data.recurringTransactions);
      if (data.networthHistory) setNetworthHistory(data.networthHistory);
      if (data.settings) setSettings(data.settings);
    } catch {}
  }, []);

  // Reset to defaults
  const handleReset = useCallback(async () => {
    setCategories(INITIAL_CATEGORIES); setTransactions(INITIAL_TRANSACTIONS);
    setIncome(INITIAL_INCOME); setBillTemplates(INITIAL_BILL_TEMPLATES);
    setPaidDates(INITIAL_PAID_DATES); setSavingsGoals(INITIAL_SAVINGS_GOALS);
    setDebts(INITIAL_DEBTS); setAssets(INITIAL_ASSETS);
    setPaycheckStreams(INITIAL_PAYCHECK_STREAMS); setCustomItems(INITIAL_CUSTOM_ITEMS);
    setMonthlyRollovers({}); setBudgetRollovers({}); setBudgetTargets(INITIAL_BUDGET_TARGETS); setRecurringTransactions(INITIAL_RECURRING_TRANSACTIONS); setNetworthHistory(INITIAL_NETWORTH_HISTORY); setSettings(DEFAULT_SETTINGS);
    clearState();
    // Also delete cloud data so the reset is complete on all devices
    if (user) {
      await supabase.from("user_data").delete().eq("user_id", user.id);
    }
  }, [user]);

  // Import transactions from CSV string (Date, Description, Category, Amount)
  const handleImportCsv = useCallback((csvStr) => {
    try {
      const lines = csvStr.trim().split(/\r?\n/);
      if (lines.length < 2) return;
      // Auto-detect header row
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes("date") || firstLine.includes("description") || firstLine.includes("amount");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      // Build category name→id map (case-insensitive)
      const catNameMap = {};
      categories.forEach((c) => { catNameMap[c.name.toLowerCase()] = c.id; });
      const parseCSVRow = (line) => {
        const result = [];
        let cur = "", inQuote = false;
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote; }
          else if (ch === "," && !inQuote) { result.push(cur.trim()); cur = ""; }
          else { cur += ch; }
        }
        result.push(cur.trim());
        return result;
      };
      const imported = [];
      dataLines.forEach((line) => {
        if (!line.trim()) return;
        const cols = parseCSVRow(line);
        if (cols.length < 3) return;
        // Flexible column detection: try Date, Description, Category, Amount order
        // Also handle: Date, Description, Amount (no category)
        let dateStr, description, categoryName, amountStr;
        if (cols.length >= 4) {
          [dateStr, description, categoryName, amountStr] = cols;
        } else {
          [dateStr, description, amountStr] = cols;
          categoryName = "";
        }
        // Normalize date to YYYY-MM-DD
        let date = dateStr.replace(/"/g, "").trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
          const [m, d, y] = date.split("/");
          date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) {
          const [m, d, y] = date.split("-");
          date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.\-]/g, "")));
        if (isNaN(amount) || amount <= 0) return;
        const desc = description.replace(/^"|"$/g, "").trim();
        if (!desc) return;
        const catKey = categoryName.replace(/^"|"$/g, "").trim().toLowerCase();
        const categoryId = catNameMap[catKey] || categories[0]?.id || "";
        imported.push({ id: nextId(), date, description: desc, amount, categoryId });
      });
      if (imported.length > 0) {
        setTransactions((prev) => {
          // Deduplicate by date+description+amount
          const existing = new Set(prev.map((t) => `${t.date}|${t.description}|${t.amount}`));
          const fresh = imported.filter((t) => !existing.has(`${t.date}|${t.description}|${t.amount}`));
          return [...prev, ...fresh];
        });
      }
      alert(`Imported ${imported.length} transaction${imported.length !== 1 ? "s" : ""}.`);
    } catch (e) {
      alert("Could not parse CSV. Expected columns: Date, Description, Category, Amount.");
    }
  }, [categories]);

  // Handle onboarding completion — apply wizard data, clear sample data
  const handleOnboardingComplete = useCallback((data) => {
    // Apply whatever the wizard sends — it handles both full setup and skip paths
    if (data.categories) setCategories(data.categories);
    if (data.transactions) setTransactions(data.transactions);
    if (data.income) setIncome(data.income);
    if (data.billTemplates) setBillTemplates(data.billTemplates);
    if (data.paidDates) setPaidDates(data.paidDates instanceof Set ? data.paidDates : new Set());
    if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
    if (data.debts) setDebts(data.debts);
    if (data.assets) setAssets(data.assets);
    if (data.budgetTargets) setBudgetTargets(data.budgetTargets);

    // For skip path — only settings is provided, keep sample data
    if (data.settings) {
      setSettings((s) => ({ ...s, ...data.settings }));
    }

    // Clear transient state for fresh start
    if (data.transactions !== undefined) {
      setPaycheckStreams([]);
      setCustomItems({});
      setMonthlyRollovers({});
      setBudgetRollovers({});
      if (!data.budgetTargets) setBudgetTargets({});
      setRecurringTransactions([]);
    }

    setShowOnboarding(false);

    // Force immediate Supabase save after onboarding — don't wait for debounce
    if (user) {
      const fullState = {
        categories: data.categories || INITIAL_CATEGORIES,
        transactions: data.transactions || INITIAL_TRANSACTIONS,
        income: data.income || INITIAL_INCOME,
        billTemplates: data.billTemplates || INITIAL_BILL_TEMPLATES,
        paidDates: [],
        savingsGoals: data.savingsGoals || [],
        debts: data.debts || [],
        assets: data.assets || [],
        paycheckStreams: [],
        customItems: {},
        monthlyRollovers: {},
        budgetRollovers: {},
        budgetTargets: data.budgetTargets || {},
        recurringTransactions: [],
        networthHistory: INITIAL_NETWORTH_HISTORY,
        settings: data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : DEFAULT_SETTINGS,
      };
      saveStateToSupabase(user.id, fullState);
    }
  }, [user]);

  // Get active color theme and mode
  const activeTheme = COLOR_THEMES[settings.colorTheme] || COLOR_THEMES.blue_gold;
  const isDark = settings.theme !== "light";
  const themeVars = isDark ? activeTheme.dark : activeTheme.light;
  // Keep module-level currency formatter in sync with settings
  setCurrency(settings.currency || "USD");

  // While checking auth session — use saved theme if available to prevent flicker
  if (!authChecked) {
    const savedThemeRaw = (() => { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r)?.settings : null; } catch { return null; } })();
    const splashTheme = COLOR_THEMES[savedThemeRaw?.colorTheme] || COLOR_THEMES.blue_gold;
    const splashVars = savedThemeRaw?.theme === "light" ? splashTheme.light : splashTheme.dark;
    return (
      <div style={{ ...splashVars, minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>💰</div>
          <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in — show auth screen with Blue & Gold dark theme
  if (!user) {
    const authVars = COLOR_THEMES.blue_gold.dark;
    return (
      <div style={{ ...authVars, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <AuthScreen onAuth={(u) => { setUser(u); setLoaded(false); }} />
      </div>
    );
  }

  // Show onboarding wizard for first-time users
  // Data still loading from Supabase — show spinner
  if (!loaded) {
    return (
      <div style={{ ...themeVars, minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#1e40af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>💰</div>
          <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>Loading your data…</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // Sync status indicator — small floating pill
  const SyncIndicator = () => {
    if (syncStatus === "idle") return null;
    return (
      <div style={{
        position: "fixed", bottom: isMobile ? 90 : 16, right: 16, zIndex: 200,
        background: syncStatus === "saved" ? "var(--green-bg)" : "var(--surface)",
        border: `1px solid ${syncStatus === "saved" ? "var(--green)" : "var(--border)"}`,
        borderRadius: 20, padding: "5px 12px",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, fontWeight: 600,
        color: syncStatus === "saved" ? "var(--green)" : "var(--text-muted)",
        boxShadow: "0 2px 8px var(--shadow)",
        transition: "all 0.3s",
      }}>
        {syncStatus === "saving" ? (
          <><div style={{ width: 8, height: 8, border: "1.5px solid var(--text-muted)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Syncing…</>
        ) : (
          <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Saved</>
        )}
      </div>
    );
  };

  return (
    <div data-color-theme={settings.colorTheme || "blue_gold"} data-mode={isDark ? "dark" : "light"} style={{
      ...themeVars,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      display: "flex", minHeight: "100vh", boxSizing: "border-box",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <PwaHead />
      <ThemeStyles />
      <ResponsiveStyles />
      <SyncIndicator />

      {!isMobile && (
        <Sidebar activePage={page} onNavigate={setPage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} hiddenPages={settings.hiddenPages || []} />
      )}

      <main className="maverick-main" style={{
        flex: 1,
        padding: isMobile ? "16px 12px 80px" : "32px 36px",
        minWidth: 0, overflowY: "auto", maxHeight: "100vh",
      }}>
        <div className="maverick-content" style={{ maxWidth: 1000, margin: "0 auto" }}>
          {page === "dashboard" && (
            <DashboardPage categories={categories} transactions={transactions} income={income}
              billTemplates={billTemplates} paidDates={paidDates}
              savingsGoals={savingsGoals} debts={debts} assets={assets} settings={settings}
              recurringTransactions={recurringTransactions} setTransactions={setTransactions} />
          )}
          {page === "budget" && (
            <BudgetPage categories={categories} transactions={transactions} setCategories={setCategories} setTransactions={setTransactions} income={income} budgetTargets={budgetTargets} setBudgetTargets={setBudgetTargets} budgetRollovers={budgetRollovers} setBudgetRollovers={setBudgetRollovers} showUndo={showUndo} settings={settings} />
          )}
          {page === "calendar" && (
            <CalendarPage billTemplates={billTemplates} setBillTemplates={setBillTemplates}
              paidDates={paidDates} setPaidDates={setPaidDates} />
          )}
          {page === "recurring" && (
            <RecurringBillsPage billTemplates={billTemplates} setBillTemplates={setBillTemplates}
              paidDates={paidDates} onNavigate={setPage} showUndo={showUndo} transactions={transactions} />
          )}
          {page === "autospend" && (
            <RecurringTransactionsPage recurringTransactions={recurringTransactions} setRecurringTransactions={setRecurringTransactions}
              categories={categories} transactions={transactions} setTransactions={setTransactions} showUndo={showUndo} />
          )}
          {page === "savings" && (
            <SavingsPage savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} showUndo={showUndo}
              categories={categories} setCategories={setCategories}
              setTransactions={setTransactions} budgetTargets={budgetTargets} setBudgetTargets={setBudgetTargets} />
          )}
          {page === "paycheck" && (
            <PaycheckPlannerPage paycheckStreams={paycheckStreams} setPaycheckStreams={setPaycheckStreams}
              billTemplates={billTemplates} savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} paidDates={paidDates} setPaidDates={setPaidDates}
              customItems={customItems} setCustomItems={setCustomItems}
              monthlyRollovers={monthlyRollovers} setMonthlyRollovers={setMonthlyRollovers}
              income={income} settings={settings} setSettings={setSettings} showUndo={showUndo} />
          )}
          {page === "income" && (
            <IncomePage income={income} setIncome={setIncome} showUndo={showUndo} />
          )}
          {page === "debt" && (
            <DebtPage debts={debts} setDebts={setDebts} showUndo={showUndo} />
          )}
          {page === "networth" && (
            <NetWorthPage assets={assets} setAssets={setAssets} debts={debts} setDebts={setDebts} showUndo={showUndo}
              networthHistory={networthHistory} setNetworthHistory={setNetworthHistory} />
          )}
          {page === "strategy" && (
            <DebtStrategyPage debts={debts} income={income} />
          )}
          {page === "roadmap" && (
            <FinancialRoadmapPage savingsGoals={savingsGoals} debts={debts} income={income}
              transactions={transactions} assets={assets} categories={categories} onNavigate={setPage} />
          )}
          {page === "calculator" && (
            <CalculatorPage />
          )}
          {page === "transactions" && (
            <TransactionsPage transactions={transactions} setTransactions={setTransactions} categories={categories} showUndo={showUndo} />
          )}
          {page === "summary" && (
            <MonthlySummaryPage categories={categories} transactions={transactions} income={income}
              billTemplates={billTemplates} paidDates={paidDates} savingsGoals={savingsGoals} debts={debts} settings={settings} />
          )}
          {page === "forecast" && (
            <CashFlowForecastPage income={income} billTemplates={billTemplates} paidDates={paidDates}
              transactions={transactions} savingsGoals={savingsGoals} debts={debts} assets={assets} />
          )}
          {page === "trends" && (
            <SpendingTrendsPage categories={categories} transactions={transactions} />
          )}
          {page === "settings" && (
            <SettingsPage settings={settings} setSettings={setSettings}
              onExport={handleExport} onExportCsv={handleExportCsv} onImport={handleImport} onImportCsv={handleImportCsv} onReset={handleReset}
              onRestartWizard={() => { clearState(); if (user) supabase.from("user_data").delete().eq("user_id", user.id); setShowOnboarding(true); }}
              user={user}
              onSignOut={async () => { await supabase.auth.signOut(); clearState(); setUser(null); }} />
          )}
        </div>
      </main>

      {/* Undo Toast */}
      {undoToast && (
        <UndoToast
          message={undoToast.message}
          onUndo={handleUndo}
          onDismiss={() => setUndoToast(null)}
        />
      )}

      {/* Floating Action Button — quick add transaction from any page */}
      <FloatingActionButton categories={categories} onAddTransaction={(tx) => setTransactions((p) => [...p, tx])} />

      {isMobile && (
        <MobileNav activePage={page} onNavigate={setPage} onMore={() => setMobileMore(true)} />
      )}
      {isMobile && mobileMore && (
        <MobileMoreMenu activePage={page} onNavigate={setPage} onClose={() => setMobileMore(false)} hiddenPages={settings.hiddenPages || []} />
      )}
    </div>
  );
}
