import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────
// PERSISTENCE LAYER
// ─────────────────────────────────────────────

const STORAGE_KEY = "maverickos_data";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Restore Set from array
    if (data.paidDates) data.paidDates = new Set(data.paidDates);
    return data;
  } catch { return null; }
}

function saveState(state) {
  try {
    const toSave = { ...state, paidDates: [...state.paidDates] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// Settings defaults
const DEFAULT_SETTINGS = {
  currency: "USD",
  householdName: "My Household",
  theme: "dark",
  colorTheme: "blue_gold",
  startDayOfMonth: 1,
  // Pages visibility — toggle off pages you don't use
  hiddenPages: [],
  // Dashboard widget configuration — order and visibility
  dashboardWidgets: ["today", "networth", "metrics", "income", "spending", "bills", "savings", "debt"],
};

// Color theme palettes — each defines dark and light CSS variable sets
const COLOR_THEMES = {
  blue_gold: {
    label: "Blue & Gold", preview: ["#3b82f6", "#f0c644"],
    dark: {
      "--bg": "#0a0e17", "--card": "#111827", "--surface": "#0d1220", "--sidebar": "#0b0f1a",
      "--border": "#1e2a3f", "--border-hover": "#2d3f5a", "--border-subtle": "#162032",
      "--track": "#162032", "--nav-active": "#152238", "--nav-hover": "#111d30",
      "--text-primary": "#e8ecf4", "--text-secondary": "#8fa3c0", "--text-muted": "#5a7194",
      "--icon-bg": "#152238",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#f0c644", "--amber-bg": "#f0c64418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#3b82f6",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#f0f4f8", "--card": "#ffffff", "--surface": "#f7f9fc", "--sidebar": "#edf1f7",
      "--border": "#d0dae8", "--border-hover": "#b0c0d4", "--border-subtle": "#e2e8f0",
      "--track": "#e2e8f0", "--nav-active": "#dbe4f0", "--nav-hover": "#e8edf4",
      "--text-primary": "#1a2332", "--text-secondary": "#4a5e78", "--text-muted": "#7a8ea8",
      "--icon-bg": "#e8edf5",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#2563eb",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  midnight: {
    label: "Midnight Purple", preview: ["#8b5cf6", "#a78bfa"],
    dark: {
      "--bg": "#0c0a14", "--card": "#16132a", "--surface": "#110e22", "--sidebar": "#0e0b1c",
      "--border": "#2a2545", "--border-hover": "#3d3660", "--border-subtle": "#211d3a",
      "--track": "#211d3a", "--nav-active": "#231f3e", "--nav-hover": "#1a1630",
      "--text-primary": "#ece8f4", "--text-secondary": "#a99fc0", "--text-muted": "#6e6294",
      "--icon-bg": "#231f3e",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#8b5cf6",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#f5f3fa", "--card": "#ffffff", "--surface": "#f9f8fc", "--sidebar": "#f0eef8",
      "--border": "#d8d0ea", "--border-hover": "#bfb4da", "--border-subtle": "#e8e4f2",
      "--track": "#e8e4f2", "--nav-active": "#e4e0f2", "--nav-hover": "#ece8f6",
      "--text-primary": "#1e1630", "--text-secondary": "#524878", "--text-muted": "#8070a0",
      "--icon-bg": "#ece6f5",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#7c3aed",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  emerald: {
    label: "Emerald", preview: ["#10b981", "#34d399"],
    dark: {
      "--bg": "#0a1210", "--card": "#111f1b", "--surface": "#0d1815", "--sidebar": "#0b1412",
      "--border": "#1e3a32", "--border-hover": "#2d5a4a", "--border-subtle": "#16302a",
      "--track": "#16302a", "--nav-active": "#153028", "--nav-hover": "#112820",
      "--text-primary": "#e8f4f0", "--text-secondary": "#8fc0b0", "--text-muted": "#5a9480",
      "--icon-bg": "#153028",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#10b981",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#f0f8f5", "--card": "#ffffff", "--surface": "#f5fbf8", "--sidebar": "#eaf5f0",
      "--border": "#c0e0d4", "--border-hover": "#a0d0be", "--border-subtle": "#daeee4",
      "--track": "#daeee4", "--nav-active": "#d0eadc", "--nav-hover": "#e4f4ec",
      "--text-primary": "#0f2920", "--text-secondary": "#2d6850", "--text-muted": "#5a9a80",
      "--icon-bg": "#e0f2ea",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#059669",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  rose: {
    label: "Rose", preview: ["#f43f5e", "#fb7185"],
    dark: {
      "--bg": "#110a0d", "--card": "#1f1116", "--surface": "#180d12", "--sidebar": "#140b10",
      "--border": "#3a1e28", "--border-hover": "#5a2d3e", "--border-subtle": "#301624",
      "--track": "#301624", "--nav-active": "#381a28", "--nav-hover": "#2c1420",
      "--text-primary": "#f4e8ec", "--text-secondary": "#c08fa0", "--text-muted": "#945a70",
      "--icon-bg": "#381a28",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#f43f5e",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#fdf2f4", "--card": "#ffffff", "--surface": "#fef7f8", "--sidebar": "#fceef0",
      "--border": "#f0c8d0", "--border-hover": "#e0a8b4", "--border-subtle": "#f5dce2",
      "--track": "#f5dce2", "--nav-active": "#f5d4dc", "--nav-hover": "#fae4ea",
      "--text-primary": "#2e1018", "--text-secondary": "#7a3048", "--text-muted": "#a86078",
      "--icon-bg": "#fce4ea",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#e11d48",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  slate: {
    label: "Classic", preview: ["#6366f1", "#818cf8"],
    dark: {
      "--bg": "#0c0c0e", "--card": "#161619", "--surface": "#111114", "--sidebar": "#101013",
      "--border": "#26262e", "--border-hover": "#3a3a46", "--border-subtle": "#1e1e24",
      "--track": "#1e1e24", "--nav-active": "#1e1e28", "--nav-hover": "#18181c",
      "--text-primary": "#e8e8ec", "--text-secondary": "#a0a0b0", "--text-muted": "#6a6a7a",
      "--icon-bg": "#1e1e28",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#6366f1",
      "--shadow": "rgba(0,0,0,0.15)", "--shadow-heavy": "rgba(0,0,0,0.4)",
    },
    light: {
      "--bg": "#f4f4f6", "--card": "#ffffff", "--surface": "#f9f9fb", "--sidebar": "#efefef",
      "--border": "#d4d4dc", "--border-hover": "#b8b8c4", "--border-subtle": "#e4e4ea",
      "--track": "#e4e4ea", "--nav-active": "#e0e0e8", "--nav-hover": "#eaeaf0",
      "--text-primary": "#1a1a22", "--text-secondary": "#52525e", "--text-muted": "#80808e",
      "--icon-bg": "#eaeaf0",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#4f46e5",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
  amber: {
    label: "Amber", preview: ["#f59e0b", "#fbbf24"],
    dark: {
      "--bg": "#0e0c08", "--card": "#1c1a10", "--surface": "#15130c", "--sidebar": "#12100a",
      "--border": "#3a3420", "--border-hover": "#5a4e30", "--border-subtle": "#302a1a",
      "--track": "#302a1a", "--nav-active": "#352e1c", "--nav-hover": "#2a2416",
      "--text-primary": "#f4f0e8", "--text-secondary": "#c0b48f", "--text-muted": "#94845a",
      "--icon-bg": "#352e1c",
      "--green": "#34d399", "--green-bg": "#34d39918",
      "--amber": "#fbbf24", "--amber-bg": "#fbbf2418",
      "--red": "#f87171", "--red-bg": "#f8717118",
      "--accent": "#f59e0b",
      "--shadow": "rgba(0,0,0,0.2)", "--shadow-heavy": "rgba(0,0,0,0.5)",
    },
    light: {
      "--bg": "#faf8f2", "--card": "#ffffff", "--surface": "#fdfcf7", "--sidebar": "#f5f2ea",
      "--border": "#e8dfc8", "--border-hover": "#d4c8a8", "--border-subtle": "#f0eadc",
      "--track": "#f0eadc", "--nav-active": "#eee6d4", "--nav-hover": "#f5f0e4",
      "--text-primary": "#2a2410", "--text-secondary": "#6a5e38", "--text-muted": "#9a8e60",
      "--icon-bg": "#f2ecdc",
      "--green": "#059669", "--green-bg": "#05966918",
      "--amber": "#d97706", "--amber-bg": "#d9770618",
      "--red": "#dc2626", "--red-bg": "#dc262618",
      "--accent": "#d97706",
      "--shadow": "rgba(0,0,0,0.06)", "--shadow-heavy": "rgba(0,0,0,0.12)",
    },
  },
};

// All possible dashboard widgets
const DASHBOARD_WIDGETS = [
  { id: "today", label: "Today's Snapshot" },
  { id: "networth", label: "Net Worth" },
  { id: "metrics", label: "Income / Expenses / Balance" },
  { id: "income", label: "Income Sources" },
  { id: "spending", label: "Top Spending" },
  { id: "bills", label: "Upcoming Bills" },
  { id: "savings", label: "Savings Goals" },
  { id: "debt", label: "Debt Summary" },
];

// ─────────────────────────────────────────────
// DATA LAYER — Replace with API/DB calls later
// ─────────────────────────────────────────────

const INITIAL_CATEGORIES = [
  { id: "housing", name: "Housing", icon: "⌂", limit: 1800 },
  { id: "groceries", name: "Groceries", icon: "◉", limit: 600 },
  { id: "transport", name: "Transport", icon: "▷", limit: 300 },
  { id: "dining", name: "Dining Out", icon: "◈", limit: 250 },
  { id: "utilities", name: "Utilities", icon: "⚡", limit: 200 },
  { id: "entertainment", name: "Entertainment", icon: "♫", limit: 150 },
  { id: "health", name: "Health", icon: "✚", limit: 200 },
  { id: "personal", name: "Personal", icon: "◆", limit: 150 },
];

const INITIAL_TRANSACTIONS = [
  { id: 1, categoryId: "housing", description: "Rent", amount: 1650, date: "2026-03-01" },
  { id: 2, categoryId: "housing", description: "Renter's Insurance", amount: 45, date: "2026-03-01" },
  { id: 3, categoryId: "groceries", description: "Whole Foods", amount: 127.43, date: "2026-03-02" },
  { id: 4, categoryId: "groceries", description: "Costco Run", amount: 214.67, date: "2026-03-05" },
  { id: 5, categoryId: "groceries", description: "Central Market", amount: 89.20, date: "2026-03-09" },
  { id: 6, categoryId: "groceries", description: "Target Groceries", amount: 63.15, date: "2026-03-12" },
  { id: 7, categoryId: "groceries", description: "Trader Joe's", amount: 98.50, date: "2026-03-15" },
  { id: 8, categoryId: "transport", description: "Gas", amount: 52.40, date: "2026-03-03" },
  { id: 9, categoryId: "transport", description: "Car Wash", amount: 25.00, date: "2026-03-07" },
  { id: 10, categoryId: "transport", description: "Parking - Downtown", amount: 18.00, date: "2026-03-10" },
  { id: 11, categoryId: "dining", description: "Pecan Lodge", amount: 67.80, date: "2026-03-04" },
  { id: 12, categoryId: "dining", description: "Torchy's Tacos", amount: 32.50, date: "2026-03-08" },
  { id: 13, categoryId: "dining", description: "Thai Basil", amount: 44.20, date: "2026-03-11" },
  { id: 14, categoryId: "dining", description: "Coffee — Houndstooth", amount: 12.50, date: "2026-03-13" },
  { id: 15, categoryId: "dining", description: "Uchi Dallas", amount: 142.00, date: "2026-03-14" },
  { id: 16, categoryId: "utilities", description: "Electric — Oncor", amount: 134.50, date: "2026-03-05" },
  { id: 17, categoryId: "utilities", description: "Water", amount: 48.30, date: "2026-03-05" },
  { id: 18, categoryId: "utilities", description: "Internet — AT&T", amount: 65.00, date: "2026-03-06" },
  { id: 19, categoryId: "entertainment", description: "Spotify", amount: 15.99, date: "2026-03-01" },
  { id: 20, categoryId: "entertainment", description: "AMC Northpark", amount: 34.00, date: "2026-03-09" },
  { id: 21, categoryId: "entertainment", description: "Book — Half Price", amount: 14.50, date: "2026-03-12" },
  { id: 22, categoryId: "health", description: "Gym Membership", amount: 49.99, date: "2026-03-01" },
  { id: 23, categoryId: "health", description: "CVS Pharmacy", amount: 28.75, date: "2026-03-07" },
  { id: 24, categoryId: "personal", description: "Haircut", amount: 35.00, date: "2026-03-06" },
  { id: 25, categoryId: "personal", description: "Amazon — Misc", amount: 67.89, date: "2026-03-10" },
  { id: 26, categoryId: "personal", description: "Dry Cleaning", amount: 22.00, date: "2026-03-14" },
];

const INITIAL_INCOME = [
  { id: 1, source: "My Salary", amount: 5200, date: "2026-03-01", recurring: true, frequency: "semimonthly", category: "employment", icon: "💼" },
  { id: 2, source: "Wife's Salary", amount: 4200, date: "2026-03-09", recurring: true, frequency: "biweekly", category: "employment", icon: "💼" },
  { id: 3, source: "Freelance Project", amount: 850, date: "2026-03-10", recurring: false, category: "freelance", icon: "🎨" },
  { id: 4, source: "Dividend — Fidelity", amount: 125, date: "2026-03-15", recurring: true, frequency: "quarterly", category: "investment", icon: "📈" },
];

// Paycheck streams — supports multiple earners and schedules
const INITIAL_PAYCHECK_STREAMS = [
  { id: 1, name: "My Pay", amount: 2600, frequency: "semimonthly", anchorDate: "2026-01-01", color: "var(--accent)" },
  { id: 2, name: "Wife's Pay", amount: 2100, frequency: "biweekly", anchorDate: "2026-01-09", color: "#d4a843" },
];

// Custom line items added manually to specific paychecks — keyed by "streamId-YYYY-MM-DD"
const INITIAL_CUSTOM_ITEMS = {};

// Budget category rollovers — keyed by "YYYY-MM" with category overrides
const INITIAL_BUDGET_ROLLOVERS = {};

// Budget targets — YNAB-style goal assignments per category
// Types: "monthly" (flat monthly limit — default), "target_by_date" (save X by Y), "weekly" (X per week)
const INITIAL_BUDGET_TARGETS = {
  housing: { type: "monthly", monthlyAmount: 1800 },
  groceries: { type: "monthly", monthlyAmount: 600 },
  transport: { type: "target_by_date", targetAmount: 2400, targetDate: "2026-12-31", funded: 950 },
  dining: { type: "monthly", monthlyAmount: 250 },
  utilities: { type: "monthly", monthlyAmount: 200 },
  entertainment: { type: "target_by_date", targetAmount: 500, targetDate: "2026-06-01", funded: 200 },
  health: { type: "monthly", monthlyAmount: 200 },
  personal: { type: "weekly", weeklyAmount: 35 },
};

// Recurring transaction templates — auto-log spending (not bills)
// Similar to bill templates but with categoryId for budget tracking
const INITIAL_RECURRING_TRANSACTIONS = [
  { id: 1, description: "Spotify", amount: 15.99, categoryId: "entertainment", frequency: "monthly", anchorDate: "2026-01-01", active: true },
  { id: 2, description: "Gym Membership", amount: 49.99, categoryId: "health", frequency: "monthly", anchorDate: "2026-01-01", active: true },
  { id: 3, description: "Haircut", amount: 35, categoryId: "personal", frequency: "monthly", anchorDate: "2026-01-06", active: true },
  { id: 4, description: "Cloud Storage", amount: 2.99, categoryId: "personal", frequency: "monthly", anchorDate: "2026-01-10", active: true },
  { id: 5, description: "Weekly Groceries", amount: 120, categoryId: "groceries", frequency: "weekly", anchorDate: "2026-01-04", active: false },
];

// Bill templates — recurring bills use anchorDate + frequency
// Non-recurring bills use anchorDate as their one-time due date
const INITIAL_BILL_TEMPLATES = [
  { id: 1, name: "Rent", amount: 1650, anchorDate: "2026-01-01", recurring: true, frequency: "monthly" },
  { id: 2, name: "Electric — Oncor", amount: 134.50, anchorDate: "2026-01-05", recurring: true, frequency: "monthly" },
  { id: 3, name: "Water", amount: 48.30, anchorDate: "2026-01-05", recurring: true, frequency: "monthly" },
  { id: 4, name: "Internet — AT&T", amount: 65, anchorDate: "2026-01-06", recurring: true, frequency: "monthly" },
  { id: 5, name: "Gym Membership", amount: 49.99, anchorDate: "2026-01-15", recurring: true, frequency: "monthly" },
  { id: 6, name: "Spotify", amount: 15.99, anchorDate: "2026-01-15", recurring: true, frequency: "monthly" },
  { id: 7, name: "Car Insurance", amount: 185, anchorDate: "2026-01-22", recurring: true, frequency: "monthly" },
  { id: 8, name: "Phone Bill", amount: 75, anchorDate: "2026-01-11", recurring: true, frequency: "biweekly" },
  { id: 9, name: "Renter's Insurance", amount: 45, anchorDate: "2026-01-01", recurring: true, frequency: "quarterly" },
  { id: 10, name: "HOA Assessment", amount: 350, anchorDate: "2026-01-15", recurring: true, frequency: "yearly" },
];

// Tracks which bill instances have been paid — keys are "billId-YYYY-MM-DD"
const INITIAL_PAID_DATES = new Set([
  // March bills already paid
  "1-2026-03-01", "2-2026-03-05", "3-2026-03-05", "4-2026-03-06",
  "5-2026-03-15", "6-2026-03-15",
  "8-2026-03-08", // biweekly phone bill first occurrence
]);

const INITIAL_SAVINGS_GOALS = [
  { id: 1, name: "Emergency Fund", target: 15000, current: 8400, icon: "🛡", monthlyContribution: 400, deadline: "2026-12-31", color: "var(--green)", contributions: [
    { date: "2026-01-15", amount: 400 }, { date: "2026-02-15", amount: 400 }, { date: "2026-03-01", amount: 400 }, { date: "2026-03-15", amount: 200 },
  ]},
  { id: 2, name: "Vacation", target: 3000, current: 1250, icon: "✈", monthlyContribution: 200, deadline: "2026-08-01", color: "var(--accent)", contributions: [
    { date: "2026-01-10", amount: 200 }, { date: "2026-02-10", amount: 250 }, { date: "2026-03-10", amount: 200 },
  ]},
  { id: 3, name: "New Laptop", target: 2000, current: 1680, icon: "💻", monthlyContribution: 150, deadline: "2026-06-01", color: "var(--amber)", contributions: [
    { date: "2026-01-05", amount: 150 }, { date: "2026-02-05", amount: 150 }, { date: "2026-03-05", amount: 180 },
  ]},
  { id: 4, name: "Car Down Payment", target: 8000, current: 2100, icon: "🚗", monthlyContribution: 300, deadline: "2027-06-01", color: "#f472b6", contributions: [
    { date: "2026-01-20", amount: 300 }, { date: "2026-02-20", amount: 300 }, { date: "2026-03-15", amount: 300 },
  ]},
];

const INITIAL_DEBTS = [
  { id: 1, name: "Student Loans", balance: 18500, originalBalance: 32000, minPayment: 320, apr: 5.5, icon: "🎓", lender: "Navient", startDate: "2020-06-01", payments: [
    { date: "2026-01-01", amount: 320 }, { date: "2026-02-01", amount: 320 }, { date: "2026-03-01", amount: 400 },
  ]},
  { id: 2, name: "Credit Card", balance: 2340, originalBalance: 4800, minPayment: 65, apr: 22.9, icon: "💳", lender: "Chase Sapphire", startDate: "2024-11-01", payments: [
    { date: "2026-01-15", amount: 200 }, { date: "2026-02-15", amount: 200 }, { date: "2026-03-15", amount: 250 },
  ]},
  { id: 3, name: "Car Loan", balance: 9200, originalBalance: 18000, minPayment: 285, apr: 4.2, icon: "🚗", lender: "Capital One Auto", startDate: "2023-03-01", payments: [
    { date: "2026-01-10", amount: 285 }, { date: "2026-02-10", amount: 285 }, { date: "2026-03-10", amount: 285 },
  ]},
];

const INITIAL_ASSETS = [
  { id: 1, name: "Checking Account", value: 4200, category: "cash", icon: "🏦" },
  { id: 2, name: "Savings Account", value: 8400, category: "cash", icon: "💰" },
  { id: 3, name: "401(k)", value: 42500, category: "retirement", icon: "📊" },
  { id: 4, name: "Roth IRA", value: 18200, category: "retirement", icon: "📈" },
  { id: 5, name: "Brokerage — Fidelity", value: 6800, category: "investment", icon: "💹" },
  { id: 6, name: "2017 Toyota Corolla", value: 8500, category: "property", icon: "🚗" },
  { id: 7, name: "Home Furnishings", value: 3500, category: "property", icon: "🛋" },
];

// ─────────────────────────────────────────────
// RECURRENCE ENGINE
// ─────────────────────────────────────────────

const FREQUENCY_LABELS = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "Semi-Monthly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/**
 * Generate concrete bill instances for a given month from templates.
 * Each instance gets: { ...template fields, instanceDate: "YYYY-MM-DD", instanceKey: "id-YYYY-MM-DD" }
 */
function generateBillInstances(templates, year, month) {
  const instances = [];
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // last day of month

  templates.forEach((bill) => {
    if (!bill.recurring) {
      // One-time bill — only shows in its exact month
      const d = new Date(bill.anchorDate + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateStr = bill.anchorDate;
        instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
      }
      return;
    }

    const anchor = new Date(bill.anchorDate + "T00:00:00");

    // Don't generate instances before the anchor date
    if (monthEnd < anchor) return;

    switch (bill.frequency) {
      case "monthly": {
        // Same day each month
        const day = Math.min(anchor.getDate(), monthEnd.getDate());
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (new Date(dateStr + "T00:00:00") >= anchor) {
          instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
        }
        break;
      }
      case "biweekly": {
        // Every 14 days from anchor
        let cur = new Date(anchor);
        while (cur <= monthEnd) {
          if (cur >= monthStart && cur <= monthEnd) {
            const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
          }
          cur = new Date(cur.getTime() + 14 * 86400000);
        }
        break;
      }
      case "weekly": {
        // Every 7 days from anchor
        let cur = new Date(anchor);
        // Jump forward close to monthStart to avoid long loops
        if (cur < monthStart) {
          const diff = Math.floor((monthStart - cur) / (7 * 86400000));
          cur = new Date(cur.getTime() + diff * 7 * 86400000);
        }
        while (cur <= monthEnd) {
          if (cur >= monthStart && cur <= monthEnd) {
            const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
          }
          cur = new Date(cur.getTime() + 7 * 86400000);
        }
        break;
      }
      case "quarterly": {
        // Every 3 months from anchor month, same day
        const anchorMonth = anchor.getMonth();
        const anchorYear = anchor.getFullYear();
        const monthDiff = (year - anchorYear) * 12 + (month - anchorMonth);
        if (monthDiff >= 0 && monthDiff % 3 === 0) {
          const day = Math.min(anchor.getDate(), monthEnd.getDate());
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
        }
        break;
      }
      case "yearly": {
        // Same month and day each year
        if (month === anchor.getMonth() && year >= anchor.getFullYear()) {
          const day = Math.min(anchor.getDate(), monthEnd.getDate());
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
        }
        break;
      }
    }
  });

  return instances.sort((a, b) => a.instanceDate.localeCompare(b.instanceDate));
}

/**
 * Generate upcoming bill instances across the next N months (for Dashboard).
 */
function generateUpcomingBills(templates, paidDates, monthsAhead = 2) {
  const now = new Date();
  const instances = [];
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    instances.push(...generateBillInstances(templates, d.getFullYear(), d.getMonth()));
  }
  return instances
    .filter((b) => !paidDates.has(b.instanceKey))
    .filter((b) => new Date(b.instanceDate + "T00:00:00") >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => a.instanceDate.localeCompare(b.instanceDate));
}

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

const fmt = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtCompact = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);
const pct = (v, max) => max > 0 ? Math.min((v / max) * 100, 100) : 0;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function getStatusColor(spent, limit) {
  const ratio = spent / limit;
  if (ratio >= 1) return { bg: "var(--red-bg)", fg: "var(--red)", label: "Over Budget" };
  if (ratio >= 0.85) return { bg: "var(--amber-bg)", fg: "var(--amber)", label: "Warning" };
  return { bg: "var(--green-bg)", fg: "var(--green)", label: "On Track" };
}

let _nextId = 100;
const nextId = () => _nextId++;
function seedNextId(state) {
  let max = 100;
  const scan = (arr) => { if (Array.isArray(arr)) arr.forEach((item) => { if (item?.id && typeof item.id === "number" && item.id >= max) max = item.id + 1; }); };
  scan(state.categories); scan(state.transactions); scan(state.income);
  scan(state.billTemplates); scan(state.savingsGoals); scan(state.debts);
  scan(state.assets); scan(state.paycheckStreams); scan(state.recurringTransactions);
  _nextId = max;
}

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────

function ProgressBar({ value, max, color, height = 8, animate = true }) {
  const ratio = max > 0 ? value / max : 0;
  const width = clamp(ratio * 100, 0, 100);
  const barColor = color || (ratio >= 1 ? "var(--red)" : ratio >= 0.85 ? "var(--amber)" : "var(--green)");
  return (
    <div style={{ position: "relative", height, borderRadius: height / 2, background: "var(--track)", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: `${width}%`, background: barColor, borderRadius: height / 2,
        transition: animate ? "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
      }} />
    </div>
  );
}

function StatusPill({ spent, limit }) {
  const { bg, fg, label } = getStatusColor(spent, limit);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999, background: bg, color: fg,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: fg }} />
      {label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{title}</span>
      {action}
    </div>
  );
}

function MetricBox({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--card)", borderRadius: 16, border: "1px solid var(--border)",
        width: "100%", maxWidth: 440, boxShadow: "0 24px 48px var(--shadow-heavy)",
      }}>
        {children}
      </div>
    </div>
  );
}

function SwipeToDelete({ onDelete, children, disabled = false }) {
  const containerRef = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const didSwipe = useRef(false);
  const [offset, setOffset] = useState(0);
  const [showDelete, setShowDelete] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const THRESHOLD = 80;
  const SWIPE_MIN = 8; // minimum px to count as a swipe (not a tap)

  const handleStart = useCallback((clientX) => {
    if (disabled) return;
    startX.current = clientX;
    currentX.current = clientX;
    didSwipe.current = false;
    setIsSwiping(true);
  }, [disabled]);

  const handleMove = useCallback((clientX) => {
    if (!isSwiping || disabled) return;
    currentX.current = clientX;
    const dx = currentX.current - startX.current;
    if (Math.abs(dx) > SWIPE_MIN) didSwipe.current = true;
    if (dx < 0) {
      setOffset(Math.max(dx, -140));
    }
  }, [isSwiping, disabled]);

  const handleEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const dx = currentX.current - startX.current;
    if (dx < -THRESHOLD) {
      setOffset(-140);
      setShowDelete(true);
    } else {
      setOffset(0);
      setShowDelete(false);
    }
  }, [isSwiping]);

  const handleTouchStart = useCallback((e) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    handleStart(e.clientX);
    const onMouseMove = (ev) => handleMove(ev.clientX);
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      handleEnd();
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [disabled, handleStart, handleMove, handleEnd]);

  // Suppress click events on children if user swiped
  const handleClickCapture = useCallback((e) => {
    if (didSwipe.current) {
      e.stopPropagation();
      e.preventDefault();
      didSwipe.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setOffset(0);
    setShowDelete(false);
    setIsSwiping(false);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", overflow: "hidden" }}>
      {/* Delete button behind */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 140,
        background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, zIndex: 1,
      }}>
        <button onClick={() => { onDelete(); reset(); }}
          style={{
            background: "none", border: "none", color: "#fff", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            fontSize: 12, fontWeight: 700, padding: "8px 16px",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
          Delete
        </button>
      </div>
      {/* Slideable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onClickCapture={handleClickCapture}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          position: "relative", zIndex: 2, background: "var(--card)",
          userSelect: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const INPUT_STYLE = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
};

function UndoToast({ message, onUndo, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onDismiss]);

  const handleUndo = () => {
    clearTimeout(timerRef.current);
    onUndo();
  };

  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
      zIndex: 9000, opacity: visible ? 1 : 0, transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 8px 32px var(--shadow-heavy)", minWidth: 260, maxWidth: 400,
    }}>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{message}</div>
      <button onClick={handleUndo} style={{
        padding: "6px 14px", borderRadius: 8, border: "none",
        background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
      }}>Undo</button>
    </div>
  );
}

function FrequencyBadge({ frequency }) {
  if (!frequency) return null;
  const colors = {
    weekly: "var(--accent)",
    biweekly: "#d4a843",
    monthly: "var(--green)",
    quarterly: "var(--amber)",
    yearly: "var(--red)",
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
      color: colors[frequency] || "var(--text-muted)",
      background: (colors[frequency] || "var(--text-muted)") + "18",
      padding: "2px 7px", borderRadius: 4,
    }}>
      {FREQUENCY_LABELS[frequency]}
    </span>
  );
}

// ─────────────────────────────────────────────
// RESPONSIVE / MOBILE
// ─────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

const MOBILE_NAV_ITEMS = [
  { id: "dashboard", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ), label: "Home" },
  { id: "budget", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ), label: "Budget" },
  { id: "paycheck", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ), label: "Paychecks" },
  { id: "calendar", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ), label: "Calendar" },
  { id: "_more", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
  ), label: "More" },
];

function MobileNav({ activePage, onNavigate, onMore }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "var(--sidebar)", borderTop: "1px solid var(--border)",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      padding: "6px 0 env(safe-area-inset-bottom, 8px)",
      backdropFilter: "blur(12px)",
    }}>
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = item.id === "_more" ? false : activePage === item.id;
        return (
          <button key={item.id}
            onClick={() => item.id === "_more" ? onMore() : onNavigate(item.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              background: "none", border: "none", cursor: "pointer",
              color: active ? "var(--accent)" : "var(--text-muted)",
              padding: "4px 12px", minWidth: 56,
            }}>
            <span style={{ display: "flex" }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileMoreMenu({ activePage, onNavigate, onClose, hiddenPages = [] }) {
  const allPages = NAV_ITEMS.filter((item) => !MOBILE_NAV_ITEMS.find((m) => m.id === item.id))
    .filter((item) => item.id === "settings" || !hiddenPages.includes(item.id));
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--card)", borderRadius: "20px 20px 0 0",
        width: "100%", maxHeight: "70vh", overflowY: "auto",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
        border: "1px solid var(--border)", borderBottom: "none",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-hover)" }} />
        </div>
        <div style={{ padding: "0 8px 8px" }}>
          {allPages.map((item) => {
            const active = activePage === item.id;
            return (
              <button key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 14, width: "100%",
                  padding: "14px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: active ? "var(--nav-active)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: 15, fontWeight: active ? 600 : 500, marginBottom: 2,
                }}>
                <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResponsiveStyles() {
  return (
    <style>{`
      @media (max-width: 768px) {
        .maverick-main { padding: 16px 12px 80px 12px !important; max-height: 100vh !important; }
        .maverick-content { max-width: 100% !important; }
        /* Force single-column grids */
        .maverick-content div[style*="gridTemplateColumns: repeat(auto-fit"] { grid-template-columns: 1fr !important; }
        .maverick-content div[style*="gridTemplateColumns: repeat(auto-fill"] { grid-template-columns: 1fr !important; }
        .maverick-content div[style*="gridTemplateColumns: repeat(3"] { grid-template-columns: 1fr 1fr !important; }
        .maverick-content div[style*="1fr 1fr 1fr"] { grid-template-columns: 1fr 1fr !important; }
        .maverick-content div[style*="gridTemplateColumns: 1fr 1fr\""] { grid-template-columns: 1fr !important; }
        /* Smaller headings */
        .maverick-content h1 { font-size: 22px !important; }
        /* Tighter cards */
        .maverick-content div[style*="padding: \"20px\""] { padding: 14px !important; }
        /* Table scroll */
        table { font-size: 12px !important; }
        /* Fix overlays on mobile */
        div[style*="position: fixed"][style*="padding: 20"] { padding: 10px !important; }
        div[style*="maxWidth: 420"] { max-width: 95vw !important; }
        div[style*="maxWidth: 440"] { max-width: 95vw !important; }
      }
      @media (max-width: 390px) {
        .maverick-content div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        .maverick-content h1 { font-size: 20px !important; }
      }
    `}</style>
  );
}

// ─────────────────────────────────────────────
// FLOATING ACTION BUTTON (Quick Add)
// ─────────────────────────────────────────────

function FloatingActionButton({ categories, onAddTransaction }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.categoryId && form.description.trim() && parseFloat(form.amount) > 0;

  const reset = () => { setForm({ categoryId: categories[0]?.id || "", description: "", amount: "", date: new Date().toISOString().split("T")[0] }); };

  return (
    <>
      {/* FAB Button */}
      <button onClick={() => { reset(); setOpen(true); }}
        style={{
          position: "fixed", bottom: 90, right: 20, zIndex: 90,
          width: 56, height: 56, borderRadius: 28, border: "none",
          background: "var(--accent)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* Quick Add Sheet */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "var(--card)", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: 500, border: "1px solid var(--border)", borderBottom: "none",
            paddingBottom: "env(safe-area-inset-bottom, 16px)",
          }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-hover)" }} />
            </div>
            <div style={{ padding: "8px 20px 4px" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Quick Add Transaction</h3>
            </div>
            <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description" style={INPUT_STYLE} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="Amount" style={INPUT_STYLE} />
                <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
            <div style={{ padding: "8px 20px 16px", display: "flex", gap: 10 }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                if (canSubmit) {
                  onAddTransaction({ id: nextId(), categoryId: form.categoryId, description: form.description.trim(), amount: parseFloat(form.amount), date: form.date });
                  setOpen(false);
                }
              }} disabled={!canSubmit}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR NAVIGATION
// ─────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { id: "budget", label: "Budget", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )},
  { id: "calendar", label: "Calendar", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { id: "recurring", label: "Recurring", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10"/><path d="M20.49 15a9 9 0 01-14.85 3.36L1 14"/>
    </svg>
  )},
  { id: "autospend", label: "Auto-Spend", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
    </svg>
  )},
  { id: "savings", label: "Savings", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2"/><path d="M2 9.1C1.2 9 .5 8.2.5 7.3.5 6.1 1.6 5 2.8 5c.2 0 .3 0 .5.1"/>
    </svg>
  )},
  { id: "paycheck", label: "Paychecks", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )},
  { id: "income", label: "Income", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  )},
  { id: "debt", label: "Debt", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  )},
  { id: "networth", label: "Net Worth", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { id: "strategy", label: "Strategy", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )},
  { id: "roadmap", label: "Roadmap", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>
    </svg>
  )},
  { id: "calculator", label: "Calculators", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
  )},
  { id: "transactions", label: "Transactions", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )},
  { id: "summary", label: "Summary", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  )},
  { id: "forecast", label: "Forecast", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  )},
  { id: "trends", label: "Trends", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  )},
  { id: "recap", label: "Recap", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )},
  { id: "settings", label: "Settings", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )},
];

function Sidebar({ activePage, onNavigate, collapsed, onToggle, hiddenPages = [] }) {
  const visibleItems = NAV_ITEMS.filter((item) => item.id === "dashboard" || item.id === "settings" || !hiddenPages.includes(item.id));
  return (
    <div style={{
      width: collapsed ? 64 : 200, minWidth: collapsed ? 64 : 200,
      height: "100vh", position: "sticky", top: 0,
      background: "var(--sidebar)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width 0.25s cubic-bezier(0.22,1,0.36,1), min-width 0.25s cubic-bezier(0.22,1,0.36,1)",
      overflow: "hidden", zIndex: 50,
    }}>
      <div style={{
        padding: collapsed ? "20px 0" : "20px 16px",
        display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
        gap: 10, borderBottom: "1px solid var(--border)", minHeight: 64,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#1e40af",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>💰</div>
        {!collapsed && <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>MaverickOS</span>}
      </div>
      <div style={{ padding: "12px 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {visibleItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "var(--nav-active)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: 14, fontWeight: active ? 600 : 500,
                transition: "all 0.15s", width: "100%", whiteSpace: "nowrap", overflow: "hidden",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--nav-hover)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "var(--nav-active)" : "transparent"; }}
            >
              <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
              {!collapsed && item.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
        <button onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
            gap: 12, padding: collapsed ? "10px 0" : "10px 12px",
            borderRadius: 8, border: "none", cursor: "pointer",
            background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
            width: "100%", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }}>
            <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
          </svg>
          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Collapse</span>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────

function DashboardPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, settings }) {
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = transactions.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const netWorth = totalAssets - totalDebt;

  const upcomingBills = useMemo(() => generateUpcomingBills(billTemplates, paidDates, 2), [billTemplates, paidDates]);
  const upcomingTotal = upcomingBills.reduce((s, b) => s + b.amount, 0);

  const topSpendCategories = categories
    .map((c) => ({ ...c, spent: transactions.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0) }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Today's data
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTx = transactions.filter((t) => t.date === todayStr);
  const todaySpent = todayTx.reduce((s, t) => s + t.amount, 0);
  const todayBills = useMemo(() => {
    const now = new Date();
    return generateBillInstances(billTemplates, now.getFullYear(), now.getMonth())
      .filter((b) => b.instanceDate === todayStr);
  }, [billTemplates, todayStr]);
  const todayBillsDue = todayBills.filter((b) => !paidDates.has(b.instanceKey));
  const nextBill = upcomingBills[0];

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
                <div style={{ fontSize: 18, fontWeight: 700, color: todaySpent > 0 ? "var(--red)" : "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(todaySpent)}</div>
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
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>Assets</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(totalAssets)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>Liabilities</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(totalDebt)}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ position: "relative", height: 10, borderRadius: 5, background: "var(--red)", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${totalAssets > 0 ? Math.min((totalAssets / (totalAssets + totalDebt)) * 100, 100) : 0}%`, background: "var(--green)", borderRadius: 5, transition: "width 0.6s" }} />
            </div>
          </div>
        </Card>
      )}

      {isVisible("metrics") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <MetricBox label="Income" value={fmt(totalIncome)} sub={`${income.length} source${income.length !== 1 ? "s" : ""}`} accent="var(--green)" />
          <MetricBox label="Expenses" value={fmt(totalExpenses)} sub={`${pct(totalExpenses, totalIncome).toFixed(0)}% of income`} accent="var(--red)" />
          <MetricBox label="Balance" value={fmt(Math.abs(balance))} sub={balance >= 0 ? "net positive" : "net negative"} accent={balance >= 0 ? "var(--green)" : "var(--red)"} />
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
              {topSpendCategories.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{c.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(c.spent)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ {fmt(c.limit)}</span>
                    </span>
                  </div>
                  <ProgressBar value={c.spent} max={c.limit} height={5} />
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

function CalendarPage({ billTemplates, setBillTemplates, paidDates, setPaidDates }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddBill, setShowAddBill] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) calendarDays.push({ day: daysInPrevMonth - i, month: month - 1, outside: true });
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push({ day: d, month, outside: false });
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) calendarDays.push({ day: d, month: month + 1, outside: true });

  // Generate instances for current view month
  const monthInstances = useMemo(
    () => generateBillInstances(billTemplates, year, month),
    [billTemplates, year, month]
  );

  // Index instances by date key
  const instancesByDate = useMemo(() => {
    const map = {};
    monthInstances.forEach((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [monthInstances]);

  // Also generate for adjacent months (for outside days)
  const prevMonthInstances = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    const map = {};
    generateBillInstances(billTemplates, py, pm).forEach((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [billTemplates, year, month]);

  const nextMonthInstances = useMemo(() => {
    const nm = month === 11 ? 0 : month + 1;
    const ny = month === 11 ? year + 1 : year;
    const map = {};
    generateBillInstances(billTemplates, ny, nm).forEach((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [billTemplates, year, month]);

  const togglePaid = (instanceKey) => {
    setPaidDates((prev) => {
      const next = new Set(prev);
      if (next.has(instanceKey)) next.delete(instanceKey);
      else next.add(instanceKey);
      return next;
    });
  };

  const prevMonth = () => { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const today = new Date();
  const isToday = (d) => !d.outside && d.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d) => !d.outside && selectedDay === d.day;

  const getBillsForDay = (d) => {
    if (d.outside) {
      const adjMonth = d.month;
      const adjYear = adjMonth < 0 ? year - 1 : adjMonth > 11 ? year + 1 : year;
      const normMonth = ((adjMonth % 12) + 12) % 12;
      const src = adjMonth < month ? prevMonthInstances : nextMonthInstances;
      return src[`${adjYear}-${normMonth}-${d.day}`] || [];
    }
    return instancesByDate[`${year}-${month}-${d.day}`] || [];
  };

  const selectedBills = selectedDay ? (instancesByDate[`${year}-${month}-${selectedDay}`] || []) : [];
  const selectedDateStr = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : null;

  const paidCount = monthInstances.filter((b) => paidDates.has(b.instanceKey)).length;
  const paidTotal = monthInstances.filter((b) => paidDates.has(b.instanceKey)).reduce((s, b) => s + b.amount, 0);
  const unpaidTotal = monthInstances.filter((b) => !paidDates.has(b.instanceKey)).reduce((s, b) => s + b.amount, 0);

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Bill Calendar</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track and mark bills as paid</p>
        </div>
        <button onClick={() => setShowAddBill(true)} style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Add Bill</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Paid This Month" value={fmt(paidTotal)} sub={`${paidCount} of ${monthInstances.length} bills`} accent="var(--green)" />
        <MetricBox label="Still Due" value={fmt(unpaidTotal)} sub={`${monthInstances.length - paidCount} remaining`} accent={unpaidTotal > 0 ? "var(--amber)" : "var(--green)"} />
        <MetricBox label="Month Total" value={fmt(paidTotal + unpaidTotal)} sub={`${monthInstances.length} bills`} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 12px" }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", padding: "8px 0" }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 12px 16px", gap: 2 }}>
            {calendarDays.map((d, i) => {
              const dayBills = getBillsForDay(d);
              const hasBills = dayBills.length > 0;
              const _isToday = isToday(d);
              const _isSelected = isSelected(d);
              return (
                <div key={i}
                  onClick={() => { if (!d.outside && hasBills) setSelectedDay(d.day === selectedDay ? null : d.day); }}
                  style={{
                    aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    borderRadius: 10, cursor: !d.outside && hasBills ? "pointer" : "default",
                    background: _isSelected ? "var(--accent)" : _isToday ? "var(--nav-active)" : "transparent",
                    border: _isToday && !_isSelected ? "1px solid var(--border-hover)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!d.outside && hasBills && !_isSelected) e.currentTarget.style.background = "var(--nav-hover)"; }}
                  onMouseLeave={(e) => { if (!_isSelected && !_isToday) e.currentTarget.style.background = "transparent"; else if (_isToday && !_isSelected) e.currentTarget.style.background = "var(--nav-active)"; }}
                >
                  <span style={{ fontSize: 14, fontWeight: _isToday || _isSelected ? 700 : 500, color: d.outside ? "var(--border-hover)" : _isSelected ? "#fff" : "var(--text-primary)" }}>
                    {d.day}
                  </span>
                  {hasBills && !d.outside && (
                    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                      {dayBills.map((b) => {
                        const isPaid = paidDates.has(b.instanceKey);
                        return (
                          <span key={b.instanceKey} style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: isPaid ? (_isSelected ? "rgba(255,255,255,0.6)" : "var(--green)") : (_isSelected ? "#fff" : "var(--amber)"),
                            transition: "background 0.2s",
                          }} />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 16, padding: "0 20px 16px", justifyContent: "center" }}>
            {[{ color: "var(--green)", label: "Paid" }, { color: "var(--amber)", label: "Unpaid" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: l.color }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Selected day detail — below calendar */}
        {selectedDay && (
          <Card>
            <div style={{ padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{selectedDateStr}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedBills.length} bill{selectedBills.length !== 1 ? "s" : ""} due</div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(selectedBills.reduce((s, b) => s + b.amount, 0))}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6, padding: "0 12px 16px" }}>
              {selectedBills.map((bill) => {
                const isPaid = paidDates.has(bill.instanceKey);
                return (
                  <div key={bill.instanceKey}
                    onClick={(e) => { e.stopPropagation(); togglePaid(bill.instanceKey); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px", borderRadius: 10,
                      background: isPaid ? "var(--green-bg)" : "var(--surface)",
                      border: `1px solid ${isPaid ? "var(--green)" + "33" : "var(--border)"}`,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = isPaid ? "var(--green)" : "var(--border-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = isPaid ? "var(--green)" + "33" : "var(--border)"; }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      border: isPaid ? "none" : "2px solid var(--border-hover)",
                      background: isPaid ? "var(--green)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                    }}>
                      {isPaid && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 500,
                          color: isPaid ? "var(--green)" : "var(--text-primary)",
                          textDecoration: isPaid ? "line-through" : "none",
                          opacity: isPaid ? 0.8 : 1,
                        }}>{bill.name}</span>
                        {bill.recurring && <FrequencyBadge frequency={bill.frequency} />}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      color: isPaid ? "var(--green)" : "var(--text-primary)",
                      opacity: isPaid ? 0.8 : 1,
                    }}>{fmt(bill.amount)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Add Bill Modal */}
      {showAddBill && (
        <Overlay onClose={() => setShowAddBill(false)}>
          <AddBillForm
            onAdd={(bill) => { setBillTemplates((p) => [...p, bill]); setShowAddBill(false); }}
            onClose={() => setShowAddBill(false)}
          />
        </Overlay>
      )}
    </div>
  );
}

function AddBillForm({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: "", amount: "", anchorDate: new Date().toISOString().split("T")[0],
    recurring: false, frequency: "monthly",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0 && form.anchorDate;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Bill</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Bill Name</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Netflix" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Amount</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{form.recurring ? "Start Date" : "Due Date"}</label>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>

        {/* Recurring toggle */}
        <div
          onClick={() => update("recurring", !form.recurring)}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px",
            borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
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

        {/* Frequency selector */}
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
            if (canSubmit) onAdd({
              id: nextId(), name: form.name.trim(), amount: parseFloat(form.amount),
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
        >Add Bill</button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// RECURRING BILLS PAGE
// ─────────────────────────────────────────────

function RecurringBillsPage({ billTemplates, setBillTemplates, paidDates, onNavigate, showUndo }) {
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

  const freqOrder = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Cost" value={fmt(totalMonthly)} sub={`${recurringBills.length} recurring bills`} accent="var(--accent)" />
        <MetricBox label="Yearly Cost" value={fmtCompact(totalYearly)} sub="projected annual" accent="var(--amber)" />
        <MetricBox label="Recurring Bills" value={recurringBills.length} sub={`${freqOrder.filter((f) => grouped[f]).length} frequencies`} />
        <MetricBox label="One-Time Bills" value={oneTimeBills.length} sub={oneTimeBills.length === 0 ? "none scheduled" : `${fmt(oneTimeBills.reduce((s, b) => s + b.amount, 0))} total`} />
      </div>

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

function EditBillForm({ bill, onSave, onClose }) {
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

// ─────────────────────────────────────────────
// SAVINGS GOALS PAGE
// ─────────────────────────────────────────────

function SavingsPage({ savingsGoals, setSavingsGoals, showUndo }) {
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const totalSaved = savingsGoals.reduce((s, g) => s + g.current, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);
  const totalMonthly = savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0);
  const completedCount = savingsGoals.filter((g) => g.current >= g.target).length;

  const addContribution = (goalId, amount) => {
    setSavingsGoals((prev) => prev.map((g) => g.id === goalId ? {
      ...g, current: g.current + amount,
      contributions: [...g.contributions, { date: new Date().toISOString().split("T")[0], amount }],
    } : g));
    setModal(null);
  };

  const addGoal = (goal) => {
    setSavingsGoals((prev) => [...prev, goal]);
    setModal(null);
  };

  const updateGoal = (updated) => {
    setSavingsGoals((prev) => prev.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
    setModal(null);
  };

  const deleteGoal = (id) => {
    const goal = savingsGoals.find((g) => g.id === id);
    if (showUndo && goal) showUndo(`Deleted "${goal.name}" goal`);
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Savings Goals</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track progress toward your financial goals</p>
        </div>
        <button onClick={() => setModal("add")} style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ New Goal</button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Total Saved" value={fmt(totalSaved)} sub={`${pct(totalSaved, totalTarget).toFixed(0)}% of all goals`} accent="var(--green)" />
        <MetricBox label="Total Target" value={fmtCompact(totalTarget)} sub={`${fmt(totalTarget - totalSaved)} remaining`} />
        <MetricBox label="Monthly Savings" value={fmt(totalMonthly)} sub="combined contributions" accent="var(--accent)" />
        <MetricBox label="Goals Complete" value={`${completedCount}/${savingsGoals.length}`} sub={completedCount === savingsGoals.length && savingsGoals.length > 0 ? "all done!" : `${savingsGoals.length - completedCount} in progress`} accent={completedCount > 0 ? "var(--green)" : "var(--text-muted)"} />
      </div>

      {/* Goal cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {savingsGoals.map((goal) => {
          const percent = pct(goal.current, goal.target);
          const isComplete = goal.current >= goal.target;
          const remaining = Math.max(goal.target - goal.current, 0);
          const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
          const isExpanded = expandedId === goal.id;

          // Deadline info
          const deadline = goal.deadline ? new Date(goal.deadline + "T00:00:00") : null;
          const daysToDeadline = deadline ? Math.ceil((deadline - new Date()) / 86400000) : null;
          const onTrack = deadline && goal.monthlyContribution > 0
            ? (remaining / goal.monthlyContribution) <= (daysToDeadline / 30)
            : null;

          return (
            <SwipeToDelete key={goal.id} onDelete={() => deleteGoal(goal.id)}>
              <Card>
              <div
                style={{ padding: "20px", cursor: "pointer" }}
                onClick={() => setExpandedId(isExpanded ? null : goal.id)}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: (goal.color || "var(--accent)") + "18",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    }}>{goal.icon}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{goal.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                        <span>{fmt(goal.monthlyContribution)}/mo</span>
                        {deadline && (
                          <span style={{ color: daysToDeadline <= 60 ? "var(--amber)" : "var(--text-muted)" }}>
                            Due {deadline.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {isComplete ? (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "4px 12px", borderRadius: 999,
                        background: "var(--green-bg)", color: "var(--green)",
                        fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em",
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Complete
                      </span>
                    ) : (
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: goal.color || "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                          {percent.toFixed(0)}%
                        </div>
                        {onTrack !== null && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: onTrack ? "var(--green)" : "var(--amber)", marginTop: 2 }}>
                            {onTrack ? "On Track" : "Behind"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <ProgressBar value={goal.current} max={goal.target} color={isComplete ? "var(--green)" : goal.color || "var(--accent)"} height={10} />

                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(goal.current)} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>of {fmt(goal.target)}</span>
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!isComplete && monthsLeft && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>~{monthsLeft}mo left</span>
                    )}
                    {!isComplete && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(remaining)} to go</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                  {/* Action buttons */}
                  <div style={{ padding: "12px 20px", display: "flex", gap: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                    {!isComplete && (
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "contribute", goal }); }}
                        style={{
                          padding: "8px 16px", borderRadius: 8, border: "none",
                          background: goal.color || "var(--accent)", color: "#fff",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>+ Add Contribution</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", goal }); }}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "transparent",
                        color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}>Edit Goal</button>
                  </div>

                  {/* Contribution history */}
                  <div style={{ padding: "8px 20px 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      Contribution History
                    </span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {[...goal.contributions].reverse().map((c, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)",
                      }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>
                          +{fmt(c.amount)}
                        </span>
                      </div>
                    ))}
                    {goal.contributions.length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No contributions yet</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
            </SwipeToDelete>
          );
        })}
      </div>

      {savingsGoals.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No savings goals yet</div>
          <button onClick={() => setModal("add")} style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Create Your First Goal</button>
        </Card>
      )}

      {/* Add Goal Modal */}
      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <AddGoalForm onAdd={addGoal} onClose={() => setModal(null)} />
        </Overlay>
      )}

      {/* Contribute Modal */}
      {modal?.type === "contribute" && (
        <Overlay onClose={() => setModal(null)}>
          <ContributeForm goal={modal.goal} onContribute={addContribution} onClose={() => setModal(null)} />
        </Overlay>
      )}

      {/* Edit Goal Modal */}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <EditGoalForm goal={modal.goal} onSave={updateGoal} onClose={() => setModal(null)} />
        </Overlay>
      )}
    </div>
  );
}

// Savings modal forms

const GOAL_COLORS = [
  { value: "var(--green)", label: "Green" },
  { value: "var(--accent)", label: "Blue" },
  { value: "var(--amber)", label: "Amber" },
  { value: "#f472b6", label: "Pink" },
  { value: "var(--red)", label: "Red" },
  { value: "#38bdf8", label: "Sky" },
  { value: "#d4a843", label: "Gold" },
];

const GOAL_ICONS = ["🎯", "🛡", "✈", "💻", "🚗", "🏠", "🎓", "💍", "🏖", "🎁", "📱", "🏥"];

function AddGoalForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", target: "", monthlyContribution: "", deadline: "", icon: "🎯", color: "var(--accent)" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.target) > 0;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>New Savings Goal</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Goal Name</FieldLabel>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Emergency Fund" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Target Amount</FieldLabel><input type="number" step="1" min="0" value={form.target} onChange={(e) => update("target", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Monthly Contribution</FieldLabel><input type="number" step="1" min="0" value={form.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Target Date (optional)</FieldLabel>
          <input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOAL_ICONS.map((icon) => (
              <button key={icon} onClick={() => update("icon", icon)}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: form.icon === icon ? "var(--accent)" + "22" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {GOAL_COLORS.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: c.value,
                  border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`,
                  cursor: "pointer", transition: "border 0.15s",
                }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          if (canSubmit) onAdd({
            id: nextId(), name: form.name.trim(), target: parseFloat(form.target), current: 0,
            monthlyContribution: parseFloat(form.monthlyContribution) || 0,
            deadline: form.deadline || null, icon: form.icon, color: form.color, contributions: [],
          });
        }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Create Goal
        </button>
      </div>
    </>
  );
}

function ContributeForm({ goal, onContribute, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = Math.max(goal.target - goal.current, 0);
  const valid = parseFloat(amount) > 0;
  const quickAmounts = [50, 100, goal.monthlyContribution, remaining].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Add to {goal.icon} {goal.name}
        </h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {fmt(goal.current)} of {fmt(goal.target)} · {fmt(remaining)} remaining
        </div>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Amount</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 600, padding: "14px 12px" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {quickAmounts.map((qa) => (
            <button key={qa} onClick={() => setAmount(String(qa))}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: `1px solid ${parseFloat(amount) === qa ? goal.color || "var(--accent)" : "var(--border)"}`,
                background: parseFloat(amount) === qa ? (goal.color || "var(--accent)") + "22" : "transparent",
                color: parseFloat(amount) === qa ? goal.color || "var(--accent)" : "var(--text-muted)",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
              {qa === remaining ? `${fmt(qa)} (fill)` : qa === goal.monthlyContribution ? `${fmt(qa)} (monthly)` : fmt(qa)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (valid) onContribute(goal.id, parseFloat(amount)); }} disabled={!valid}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: valid ? (goal.color || "var(--accent)") : "var(--border)", color: valid ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed" }}>
          Add {valid ? fmt(parseFloat(amount)) : "Contribution"}
        </button>
      </div>
    </>
  );
}

function EditGoalForm({ goal, onSave, onClose }) {
  const [form, setForm] = useState({
    name: goal.name, target: String(goal.target), monthlyContribution: String(goal.monthlyContribution),
    deadline: goal.deadline || "", icon: goal.icon, color: goal.color || "var(--accent)",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.target) > 0;

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Edit Goal</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Goal Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Target Amount</FieldLabel><input type="number" step="1" min="0" value={form.target} onChange={(e) => update("target", e.target.value)} style={INPUT_STYLE} /></div>
          <div><FieldLabel>Monthly Contribution</FieldLabel><input type="number" step="1" min="0" value={form.monthlyContribution} onChange={(e) => update("monthlyContribution", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Target Date (optional)</FieldLabel><input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} style={INPUT_STYLE} /></div>
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GOAL_ICONS.map((icon) => (
              <button key={icon} onClick={() => update("icon", icon)}
                style={{
                  width: 38, height: 38, borderRadius: 8, fontSize: 18,
                  border: `2px solid ${form.icon === icon ? "var(--accent)" : "var(--border)"}`,
                  background: form.icon === icon ? "var(--accent)" + "22" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{icon}</button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {GOAL_COLORS.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{
                  width: 28, height: 28, borderRadius: 999, background: c.value,
                  border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`,
                  cursor: "pointer",
                }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => {
          if (canSubmit) onSave({
            ...goal, name: form.name.trim(), target: parseFloat(form.target),
            monthlyContribution: parseFloat(form.monthlyContribution) || 0,
            deadline: form.deadline || null, icon: form.icon, color: form.color,
          });
        }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Save Changes
        </button>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────
// PAYCHECK PLANNER PAGE
// ─────────────────────────────────────────────

function generatePaycheckDates(stream, year, month) {
  const dates = [];
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const anchor = new Date(stream.anchorDate + "T00:00:00");

  switch (stream.frequency) {
    case "semimonthly": {
      // Two paydays per month: anchor day and anchor day + 15 (or 1st & 15th if no anchor)
      const anchorDay = anchor.getDate();
      const secondDay = anchorDay <= 15 ? anchorDay + 15 : anchorDay - 15;
      const day1 = Math.min(anchorDay, secondDay);
      const day2 = Math.max(anchorDay, secondDay);
      const first = new Date(year, month, Math.min(day1, monthEnd.getDate()));
      const second = new Date(year, month, Math.min(day2, monthEnd.getDate()));
      if (first >= anchor) dates.push(first);
      if (second >= anchor && second.getTime() !== first.getTime()) dates.push(second);
      break;
    }
    case "biweekly": {
      let cur = new Date(anchor);
      if (cur < monthStart) {
        const diff = Math.floor((monthStart - cur) / (14 * 86400000));
        cur = new Date(cur.getTime() + diff * 14 * 86400000);
      }
      while (cur <= monthEnd) {
        if (cur >= monthStart) dates.push(new Date(cur));
        cur = new Date(cur.getTime() + 14 * 86400000);
      }
      break;
    }
    case "weekly": {
      let cur = new Date(anchor);
      if (cur < monthStart) {
        const diff = Math.floor((monthStart - cur) / (7 * 86400000));
        cur = new Date(cur.getTime() + diff * 7 * 86400000);
      }
      while (cur <= monthEnd) {
        if (cur >= monthStart) dates.push(new Date(cur));
        cur = new Date(cur.getTime() + 7 * 86400000);
      }
      break;
    }
    case "monthly": {
      const day = Math.min(anchor.getDate(), monthEnd.getDate());
      const d = new Date(year, month, day);
      if (d >= anchor) dates.push(d);
      break;
    }
  }
  return dates.sort((a, b) => a - b);
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return { month: months[date.getMonth()], day: date.getDate() };
}

function PaycheckPlannerPage({ paycheckStreams, setPaycheckStreams, billTemplates, savingsGoals, setSavingsGoals, paidDates, setPaidDates, customItems, setCustomItems, monthlyRollovers, setMonthlyRollovers, income, settings, setSettings }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [showAddStream, setShowAddStream] = useState(false);
  const [showAddItem, setShowAddItem] = useState(null);
  const [showAddIncome, setShowAddIncome] = useState(null);
  const [showAddSavings, setShowAddSavings] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  // Persist income stream toggle in settings
  const useIncomeStreams = settings?.paycheckUseIncome !== false;
  const toggleIncomeStreams = () => setSettings((s) => ({ ...s, paycheckUseIncome: !useIncomeStreams }));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Derive paycheck streams from income sources (recurring only)
  const derivedStreams = useMemo(() => {
    if (!useIncomeStreams) return [];
    return income.filter((i) => i.recurring).map((i) => {
      // Map income frequency to paycheck stream format
      const streamColors = ["var(--accent)", "#d4a843", "var(--green)", "#38bdf8", "var(--amber)", "#f472b6"];
      return {
        id: `inc-${i.id}`,
        name: i.source,
        amount: i.amount,
        frequency: i.frequency,
        anchorDate: i.date,
        color: streamColors[(i.id - 1) % streamColors.length],
        fromIncome: true,
      };
    });
  }, [income, useIncomeStreams]);

  // Merge derived + manual streams (manual takes precedence for overrides)
  const effectiveStreams = useMemo(() => {
    if (useIncomeStreams) {
      // Use derived streams + any manual-only streams (those not matching an income source)
      const manualOnly = paycheckStreams.filter((s) => !derivedStreams.some((d) => d.name === s.name));
      return [...derivedStreams, ...manualOnly];
    }
    return paycheckStreams;
  }, [useIncomeStreams, derivedStreams, paycheckStreams]);

  // Generate all paychecks for the month
  const allPaychecks = useMemo(() => {
    const checks = [];
    effectiveStreams.forEach((stream) => {
      generatePaycheckDates(stream, year, month).forEach((date) => {
        checks.push({
          streamId: stream.id, streamName: stream.name, streamColor: stream.color,
          amount: stream.amount, date, dateStr: formatDateKey(date),
          key: `${stream.id}-${formatDateKey(date)}`,
          fromIncome: stream.fromIncome || false,
        });
      });
    });
    return checks.sort((a, b) => a.date - b.date);
  }, [effectiveStreams, year, month]);

  // Generate bill instances for the month
  const monthBills = useMemo(
    () => generateBillInstances(billTemplates, year, month),
    [billTemplates, year, month]
  );

  // Assign bills to the paycheck on or before their due date
  const assignBillsToPaychecks = useMemo(() => {
    const assignments = {};
    allPaychecks.forEach((pc) => { assignments[pc.key] = []; });
    monthBills.forEach((bill) => {
      const billDate = new Date(bill.instanceDate + "T00:00:00");
      let assignedKey = null;
      for (let i = allPaychecks.length - 1; i >= 0; i--) {
        if (allPaychecks[i].date <= billDate) { assignedKey = allPaychecks[i].key; break; }
      }
      if (!assignedKey && allPaychecks.length > 0) assignedKey = allPaychecks[0].key;
      if (assignedKey) assignments[assignedKey].push(bill);
    });
    return assignments;
  }, [allPaychecks, monthBills]);

  // Build the waterfall schedule for each paycheck
  const paycheckSchedules = useMemo(() => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    let carryOver = monthlyRollovers[monthKey] || 0;
    return allPaychecks.map((pc) => {
      const startingBuffer = carryOver;
      const bills = (assignBillsToPaychecks[pc.key] || []).sort((a, b) => a.amount - b.amount);
      const custom = customItems[pc.key] || [];
      const customExpenses = custom.filter((i) => i.type === "expense");
      const customIncome = custom.filter((i) => i.type === "income");
      const customSavings = custom.filter((i) => i.type === "savings");

      // Build waterfall lines
      const lines = [];
      // Income line
      const extraIncome = customIncome.reduce((s, i) => s + i.amount, 0);
      lines.push({ type: "income", name: pc.streamName, amount: pc.amount, dateInfo: formatShortDate(pc.date), color: pc.streamColor, isIncome: true, rawDate: pc.date });
      customIncome.forEach((ci) => {
        lines.push({ type: "income", name: ci.name, amount: ci.amount, dateInfo: formatShortDate(pc.date), color: "var(--green)", isIncome: true, customId: ci.id, rawDate: pc.date });
      });
      // Bills
      bills.forEach((bill) => {
        const isPaid = paidDates.has(bill.instanceKey);
        const billDate = new Date(bill.instanceDate + "T00:00:00");
        lines.push({ type: "bill", name: bill.name, amount: bill.amount, dateInfo: formatShortDate(billDate), isPaid, recurring: bill.recurring, frequency: bill.frequency, rawDate: billDate, instanceKey: bill.instanceKey });
      });
      // Savings (manually added by user)
      customSavings.forEach((cs) => {
        lines.push({ type: "savings", name: cs.name, amount: cs.amount, dateInfo: formatShortDate(pc.date), color: cs.color || "var(--accent)", customId: cs.id, rawDate: pc.date });
      });
      // Custom expenses
      customExpenses.forEach((ci) => {
        lines.push({ type: "custom", name: ci.name, amount: ci.amount, dateInfo: formatShortDate(pc.date), customId: ci.id, rawDate: pc.date });
      });

      // Calculate running balance starting from the carry-over buffer
      let balance = startingBuffer;
      lines.forEach((line) => {
        if (line.isIncome) balance += line.amount;
        else balance -= line.amount;
        line.balance = balance;
      });

      const finalBalance = balance;
      carryOver = finalBalance;

      return { ...pc, lines, startingBuffer, finalBalance, totalIncome: pc.amount + extraIncome };
    });
  }, [allPaychecks, assignBillsToPaychecks, customItems, paidDates, monthlyRollovers, year, month]);

  const totalIncome = paycheckSchedules.reduce((s, pc) => s + pc.totalIncome, 0);
  const totalAllocated = paycheckSchedules.reduce((s, pc) => s + (pc.totalIncome - pc.finalBalance), 0);
  const totalRemaining = totalIncome - totalAllocated;
  const riskLevel = totalRemaining < 0 ? "high" : totalRemaining < totalIncome * 0.05 ? "medium" : "low";
  const riskColors = { low: "var(--green)", medium: "var(--amber)", high: "var(--red)" };
  const riskLabels = { low: "Low", medium: "Medium", high: "High" };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const addCustomItem = (paycheckKey, item) => {
    setCustomItems((prev) => ({ ...prev, [paycheckKey]: [...(prev[paycheckKey] || []), { ...item, id: nextId() }] }));
    setShowAddItem(null);
    setShowAddIncome(null);
  };

  const addSavingsContribution = (paycheckKey, goalId, amount) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;
    const today = new Date().toISOString().split("T")[0];
    // Add to waterfall as a savings custom item
    setCustomItems((prev) => ({
      ...prev,
      [paycheckKey]: [...(prev[paycheckKey] || []), {
        id: nextId(), type: "savings", name: `${goal.icon} ${goal.name}`,
        amount, color: goal.color || "var(--accent)", goalId,
      }],
    }));
    // Also update the savings goal's current balance and contributions
    setSavingsGoals((prev) => prev.map((g) => g.id === goalId ? {
      ...g,
      current: g.current + amount,
      contributions: [...(g.contributions || []), { date: today, amount }],
    } : g));
    setShowAddSavings(null);
  };

  const removeCustomItem = (paycheckKey, itemId) => {
    // If it's a savings item, also reverse the contribution from the goal
    const items = customItems[paycheckKey] || [];
    const item = items.find((i) => i.id === itemId);
    if (item?.type === "savings" && item.goalId) {
      setSavingsGoals((prev) => prev.map((g) => g.id === item.goalId ? {
        ...g,
        current: Math.max(0, g.current - item.amount),
        contributions: (g.contributions || []).filter((c) => !(c.amount === item.amount && c.date === new Date().toISOString().split("T")[0])),
      } : g));
    }
    setCustomItems((prev) => ({ ...prev, [paycheckKey]: (prev[paycheckKey] || []).filter((i) => i.id !== itemId) }));
  };

  // Toggle bill paid status
  const toggleBillPaid = useCallback((instanceKey) => {
    setPaidDates((prev) => {
      const next = new Set(prev);
      if (next.has(instanceKey)) next.delete(instanceKey);
      else next.add(instanceKey);
      return next;
    });
  }, [setPaidDates]);

  // Waterfall row component with swipe-right-to-pay for bills
  const WaterfallRow = ({ line, paycheckKey, isLast, isFirst, onMoveUp, onMoveDown }) => {
    const isIncome = line.isIncome;
    const canRemove = line.customId != null;
    const isBill = line.type === "bill";
    const isSavings = line.type === "savings";
    const canSwipePaid = isBill && line.instanceKey;
    const canSwipe = canSwipePaid || canRemove;

    // Swipe state — bidirectional
    const swipeStartX = useRef(0);
    const swipeCurrentX = useRef(0);
    const swipingRef = useRef(false);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [dragging, setDragging] = useState(false);
    const didSwipe = useRef(false);
    const SWIPE_THRESHOLD = 70;
    const SWIPE_MIN = 8;

    const handleSwipeStart = (clientX) => {
      if (!canSwipe) return;
      swipeStartX.current = clientX;
      swipeCurrentX.current = clientX;
      didSwipe.current = false;
      swipingRef.current = true;
      setDragging(true);
    };

    const handleSwipeMove = (clientX) => {
      if (!swipingRef.current || !canSwipe) return;
      swipeCurrentX.current = clientX;
      const dx = clientX - swipeStartX.current;
      if (Math.abs(dx) > SWIPE_MIN) didSwipe.current = true;
      if (dx > 0 && canSwipePaid) setSwipeOffset(Math.min(dx, 120));
      if (dx < 0 && canRemove) setSwipeOffset(Math.max(dx, -140));
    };

    const handleSwipeEnd = () => {
      if (!swipingRef.current) return;
      swipingRef.current = false;
      setDragging(false);
      const dx = swipeCurrentX.current - swipeStartX.current;
      if (dx > SWIPE_THRESHOLD && canSwipePaid) {
        toggleBillPaid(line.instanceKey);
        setSwipeOffset(0);
      } else if (dx < -SWIPE_THRESHOLD && canRemove) {
        setSwipeOffset(-140);
        setShowDeleteConfirm(true);
      } else {
        setSwipeOffset(0);
        setShowDeleteConfirm(false);
      }
    };

    const onTouchStart = (e) => handleSwipeStart(e.touches[0].clientX);
    const onTouchMove = (e) => handleSwipeMove(e.touches[0].clientX);
    const onTouchEnd = () => handleSwipeEnd();

    const onMouseDown = (e) => {
      if (!canSwipe) return;
      handleSwipeStart(e.clientX);
      const onMM = (ev) => handleSwipeMove(ev.clientX);
      const onMU = () => { document.removeEventListener("mousemove", onMM); document.removeEventListener("mouseup", onMU); handleSwipeEnd(); };
      document.addEventListener("mousemove", onMM);
      document.addEventListener("mouseup", onMU);
    };

    const onClickCapture = (e) => {
      if (didSwipe.current) { e.stopPropagation(); e.preventDefault(); didSwipe.current = false; }
    };

    const arrowBtn = (direction, onClick, disabled) => (
      <button onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
        style={{
          background: "none", border: "none", padding: "2px", cursor: disabled ? "default" : "pointer",
          color: disabled ? "var(--border)" : "var(--text-muted)", display: "flex", alignItems: "center",
          opacity: disabled ? 0.3 : 1, transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = disabled ? "var(--border)" : "var(--text-muted)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {direction === "up" ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
        </svg>
      </button>
    );

    const revealPct = canSwipePaid && swipeOffset > 0 ? Math.min(swipeOffset / SWIPE_THRESHOLD, 1) : 0;

    return (
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Paid/Unpaid reveal behind (left side, shown when swiping right) */}
        {canSwipePaid && swipeOffset > 0 && (
          <div style={{
            position: "absolute", top: 0, left: 0, bottom: 0, width: 120,
            background: line.isPaid ? "var(--amber)" : "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, zIndex: 1,
            opacity: Math.max(revealPct, 0.6),
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              {line.isPaid ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <polyline points="20 6 9 17 4 12"/>}
            </svg>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{line.isPaid ? "Unpay" : "Paid"}</span>
          </div>
        )}
        {/* Delete reveal behind (right side, shown when swiping left) */}
        {canRemove && (
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: 140,
            background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, zIndex: 1,
          }}>
            <button onClick={() => { removeCustomItem(paycheckKey, line.customId); setSwipeOffset(0); setShowDeleteConfirm(false); }}
              style={{
                background: "none", border: "none", color: "#fff", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontSize: 12, fontWeight: 700, padding: "8px 16px",
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
              Delete
            </button>
          </div>
        )}
        {/* Slideable row content */}
        <div
          onTouchStart={canSwipe ? onTouchStart : undefined}
          onTouchMove={canSwipe ? onTouchMove : undefined}
          onTouchEnd={canSwipe ? onTouchEnd : undefined}
          onMouseDown={canSwipe ? onMouseDown : undefined}
          onClickCapture={canSwipe ? onClickCapture : undefined}
          style={{
            display: "grid", gridTemplateColumns: "28px 48px 1fr auto",
            alignItems: "center", padding: "10px 16px 10px 4px",
            borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
            background: isIncome ? "var(--green-bg)" : line.isPaid ? "var(--surface)" : "var(--card)",
            transform: `translateX(${swipeOffset}px)`,
            transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
            position: "relative", zIndex: 2, userSelect: "none",
            cursor: canSwipe ? "grab" : "default",
          }}
        >
          {/* Reorder arrows */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {arrowBtn("up", onMoveUp, isFirst)}
            {arrowBtn("down", onMoveDown, isLast)}
          </div>

          {/* Date column */}
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{line.dateInfo.month}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>{line.dateInfo.day}</div>
          </div>

          {/* Name column */}
          <div style={{ paddingLeft: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {isIncome && <span style={{ width: 8, height: 8, borderRadius: 2, background: line.color || "var(--green)" }} />}
              {isSavings && <span style={{ width: 8, height: 8, borderRadius: 2, background: line.color || "var(--accent)" }} />}
              {isBill && (
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: line.isPaid ? "var(--green)" : "var(--border-hover)",
                  transition: "background 0.2s",
                }} />
              )}
              <span style={{
                fontSize: 15, fontWeight: 600,
                color: line.isPaid ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: line.isPaid ? "line-through" : "none",
              }}>{line.name}</span>
              {isBill && line.recurring && line.frequency && (
                <FrequencyBadge frequency={line.frequency} />
              )}
            </div>
          </div>

          {/* Amount + Balance column */}
          <div style={{ textAlign: "right", minWidth: 100 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: isIncome ? "var(--green)" : line.isPaid ? "var(--text-muted)" : "var(--red)",
            }}>
              {isIncome ? "+" : "-"}{fmt(line.amount)}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: line.balance < 0 ? "var(--red)" : "var(--text-primary)" }}>
              {fmt(line.balance)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Paycheck Planner</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Plan how each paycheck gets spent</p>
        </div>
        <button onClick={() => setShowAddStream(true)} style={{
          padding: "10px 18px", borderRadius: 10, border: "none",
          background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Income Stream</button>
      </div>

      {/* Month nav */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Risk indicator */}
      <div style={{
        textAlign: "center", padding: "10px 0 20px",
        fontSize: 14, color: riskColors[riskLevel], fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={riskColors[riskLevel]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {riskLevel === "low" ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></> :
           <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
        </svg>
        <span>{riskLabels[riskLevel]} risk of overspending</span>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <MetricBox label="Total Income" value={fmt(totalIncome)} sub={`${allPaychecks.length} paycheck${allPaychecks.length !== 1 ? "s" : ""}`} accent="var(--green)" />
        <MetricBox label="Bills" value={fmt(paycheckSchedules.reduce((s, pc) => s + pc.lines.filter((l) => l.type === "bill").reduce((s2, l) => s2 + l.amount, 0), 0))} sub={`${monthBills.length} this month`} accent="var(--red)" />
        <MetricBox label="Savings" value={fmt(savingsGoals.reduce((s, g) => s + g.monthlyContribution, 0))} sub={`${savingsGoals.filter((g) => g.monthlyContribution > 0).length} goals`} accent="var(--accent)" />
        <MetricBox label="Remaining" value={fmt(totalRemaining)} sub={totalRemaining >= 0 ? "unallocated" : "over budget"} accent={riskColors[riskLevel]} />
      </div>

      {/* Income streams legend */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Income Streams</span>
          <button onClick={toggleIncomeStreams}
            style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {useIncomeStreams ? "Use manual streams" : "Pull from Income page"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {effectiveStreams.map((stream) => (
            <div key={stream.id} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: stream.color }} />
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{stream.name}</span>
              <span style={{ color: "var(--text-muted)" }}>{fmt(stream.amount)} · {FREQUENCY_LABELS[stream.frequency] || stream.frequency}</span>
              {stream.fromIncome && (
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--green-bg)", color: "var(--green)", fontWeight: 700 }}>AUTO</span>
              )}
              {!stream.fromIncome && (
                confirmingDelete === stream.id ? (
                  <button onClick={() => { setPaycheckStreams((p) => p.filter((s) => s.id !== stream.id)); setConfirmingDelete(null); }}
                    onMouseLeave={() => setConfirmingDelete(null)}
                    style={{ background: "var(--red)", border: "none", borderRadius: 4, padding: "1px 8px", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                ) : (
                  <button onClick={() => setConfirmingDelete(stream.id)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                  >×</button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Unified Spending Schedule */}
      {paycheckSchedules.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No paychecks this month</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Add an income stream to get started</div>
        </Card>
      )}

      {paycheckSchedules.length > 0 && (() => {
        // Build a single unified timeline — paycheck waterfall order:
        // Paycheck 1 income → expenses due before paycheck 2 → Paycheck 2 income → expenses → etc.
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const startBuffer = monthlyRollovers[monthKey] || 0;

        // Flatten paycheckSchedules in order — each paycheck's lines are already sorted correctly
        // (income first, then bills by amount, then savings, then custom)
        const allLines = [];
        let lineIdx = 0;
        paycheckSchedules.forEach((pc) => {
          pc.lines.forEach((line) => {
            allLines.push({ ...line, paycheckKey: pc.key, streamColor: pc.streamColor, streamName: pc.streamName, lineId: lineIdx++ });
          });
        });

        // Apply manual order overrides if stored
        const orderKey = `order-${monthKey}`;
        const savedOrder = customItems[orderKey];
        if (savedOrder && Array.isArray(savedOrder)) {
          const idxMap = {};
          savedOrder.forEach((id, i) => { idxMap[id] = i; });
          allLines.sort((a, b) => {
            const posA = idxMap[a.lineId] !== undefined ? idxMap[a.lineId] : 9999;
            const posB = idxMap[b.lineId] !== undefined ? idxMap[b.lineId] : 9999;
            return posA - posB;
          });
        }

        // Recalculate running balance across the unified timeline
        let balance = startBuffer;
        allLines.forEach((line) => {
          if (line.isIncome) balance += line.amount;
          else balance -= line.amount;
          line.balance = balance;
        });

        const finalBalance = allLines.length > 0 ? allLines[allLines.length - 1].balance : startBuffer;

        // Swap two lines and persist the new order
        const swapLines = (idx, dir) => {
          const targetIdx = idx + dir;
          if (targetIdx < 0 || targetIdx >= allLines.length) return;
          const newOrder = allLines.map((l) => l.lineId);
          [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
          setCustomItems((prev) => ({ ...prev, [orderKey]: newOrder }));
        };

        const resetOrder = () => {
          setCustomItems((prev) => {
            const next = { ...prev };
            delete next[orderKey];
            return next;
          });
        };

        const hasCustomOrder = !!customItems[orderKey];

        return (
          <Card>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto",
              padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                  Spending Schedule
                </span>
                {hasCustomOrder && (
                  <button onClick={resetOrder} style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Reset Order
                  </button>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                Balance
              </span>
            </div>

            {/* Starting buffer — only if non-zero */}
            {startBuffer !== 0 && (
              <div style={{
                display: "grid", gridTemplateColumns: "28px 48px 1fr auto",
                alignItems: "center", padding: "10px 16px 10px 4px",
                borderBottom: "1px solid var(--border-subtle)",
                background: startBuffer > 0 ? "var(--green-bg)" : "var(--red-bg)",
              }}>
                <div />
                <div style={{ textAlign: "center", lineHeight: 1.2 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {new Date(year, month, 1).toLocaleDateString("en-US", { month: "short" }).toUpperCase().slice(0, 3)}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>1</div>
                </div>
                <div style={{ paddingLeft: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Starting Buffer</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>rolled over</span>
                </div>
                <div style={{ textAlign: "right", minWidth: 100 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: startBuffer > 0 ? "var(--green)" : "var(--red)" }}>
                    {fmt(startBuffer)}
                  </div>
                </div>
              </div>
            )}

            {/* Unified waterfall rows */}
            {allLines.map((line, i) => (
              <WaterfallRow key={`${line.paycheckKey}-${line.lineId}`} line={line} paycheckKey={line.paycheckKey}
                isFirst={i === 0} isLast={i === allLines.length - 1}
                onMoveUp={() => swapLines(i, -1)} onMoveDown={() => swapLines(i, 1)} />
            ))}

            {/* Footer */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 20px", borderTop: "1px solid var(--border)",
              background: finalBalance < 0 ? "var(--red-bg)" : "var(--surface)",
            }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowAddItem(allPaychecks[allPaychecks.length - 1]?.key)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  + Expense
                </button>
                <button onClick={() => setShowAddSavings(allPaychecks[allPaychecks.length - 1]?.key)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  + Savings
                </button>
                <button onClick={() => setShowAddIncome(allPaychecks[allPaychecks.length - 1]?.key)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--green)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  + Income
                </button>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>End of Month</div>
                <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: finalBalance < 0 ? "var(--red)" : "var(--green)" }}>
                  {fmt(finalBalance)}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Month rollover section */}
      {paycheckSchedules.length > 0 && (() => {
        const lastCheck = paycheckSchedules[paycheckSchedules.length - 1];
        const endBalance = lastCheck.finalBalance;
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const currentRollover = monthlyRollovers[monthKey] || 0;
        const nextMonthDate = new Date(year, month + 1, 1);
        const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
        const nextMonthName = nextMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        const alreadyRolled = monthlyRollovers[nextMonthKey] != null;

        return (
          <div style={{ marginTop: 20 }}>
            <Card>
              <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>End of Month Balance</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {endBalance >= 0
                      ? `${fmt(endBalance)} remaining after all ${monthName} obligations`
                      : `${fmt(Math.abs(endBalance))} over budget for ${monthName}`}
                  </div>
                  {currentRollover > 0 && (
                    <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500, marginTop: 4 }}>
                      Includes {fmt(currentRollover)} rolled over from previous month
                    </div>
                  )}
                  {alreadyRolled && (
                    <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {fmt(monthlyRollovers[nextMonthKey])} rolled over to {nextMonthName}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: endBalance >= 0 ? "var(--green)" : "var(--red)" }}>
                      {fmt(endBalance)}
                    </div>
                  </div>
                  {endBalance > 0 && (
                    alreadyRolled ? (
                      <button onClick={() => setMonthlyRollovers((prev) => { const next = { ...prev }; delete next[nextMonthKey]; return next; })}
                        style={{
                          padding: "10px 18px", borderRadius: 10,
                          border: "1px solid var(--border)", background: "transparent",
                          color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        }}>Undo Rollover</button>
                    ) : (
                      <button onClick={() => setMonthlyRollovers((prev) => ({ ...prev, [nextMonthKey]: endBalance }))}
                        style={{
                          padding: "10px 18px", borderRadius: 10, border: "none",
                          background: "var(--green)", color: "#fff",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 004 4h12"/>
                        </svg>
                        Roll Over to {nextMonthDate.toLocaleDateString("en-US", { month: "short" })}
                      </button>
                    )
                  )}
                </div>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Modals */}
      {showAddStream && (
        <Overlay onClose={() => setShowAddStream(false)}>
          <AddStreamForm onAdd={(stream) => { setPaycheckStreams((p) => [...p, stream]); setShowAddStream(false); }} onClose={() => setShowAddStream(false)} />
        </Overlay>
      )}
      {showAddItem && (
        <Overlay onClose={() => setShowAddItem(null)}>
          <AddCustomItemForm type="expense" paycheckKey={showAddItem} onAdd={addCustomItem} onClose={() => setShowAddItem(null)} />
        </Overlay>
      )}
      {showAddIncome && (
        <Overlay onClose={() => setShowAddIncome(null)}>
          <AddCustomItemForm type="income" paycheckKey={showAddIncome} onAdd={addCustomItem} onClose={() => setShowAddIncome(null)} />
        </Overlay>
      )}
      {showAddSavings && (
        <Overlay onClose={() => setShowAddSavings(null)}>
          <AddSavingsContributionForm
            savingsGoals={savingsGoals}
            paycheckKey={showAddSavings}
            onAdd={addSavingsContribution}
            onClose={() => setShowAddSavings(null)}
          />
        </Overlay>
      )}
    </div>
  );
}

function AddStreamForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", amount: "", frequency: "semimonthly", anchorDate: new Date().toISOString().split("T")[0], color: "var(--accent)" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0;
  const streamColors = [
    { value: "var(--accent)", label: "Blue" }, { value: "#d4a843", label: "Gold" },
    { value: "var(--green)", label: "Green" }, { value: "#38bdf8", label: "Sky" },
    { value: "var(--amber)", label: "Amber" }, { value: "#f472b6", label: "Pink" },
  ];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Income Stream</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Wife's Pay" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Amount per check</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Start Date</FieldLabel><input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div>
          <FieldLabel>Frequency</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["semimonthly", "1st & 15th"], ["biweekly", "Biweekly"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([key, label]) => {
              const active = form.frequency === key;
              return (
                <button key={key} onClick={() => update("frequency", key)}
                  style={{
                    padding: "7px 14px", borderRadius: 8,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "22" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>{label}</button>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {streamColors.map((c) => (
              <button key={c.value} onClick={() => update("color", c.value)}
                style={{ width: 28, height: 28, borderRadius: 999, background: c.value, border: `3px solid ${form.color === c.value ? "var(--text-primary)" : "transparent"}`, cursor: "pointer" }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onAdd({ id: nextId(), name: form.name.trim(), amount: parseFloat(form.amount), frequency: form.frequency, anchorDate: form.anchorDate, color: form.color }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Add Stream
        </button>
      </div>
    </>
  );
}

function AddCustomItemForm({ type, paycheckKey, onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", amount: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.amount) > 0;
  const isIncome = type === "income";

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{isIncome ? "Add Extra Income" : "Add Expense"}</h3>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Description</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder={isIncome ? "e.g. Freelance gig" : "e.g. New tires"} style={INPUT_STYLE} /></div>
        <div><FieldLabel>Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onAdd(paycheckKey, { name: form.name.trim(), amount: parseFloat(form.amount), type }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? (isIncome ? "var(--green)" : "var(--accent)") : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {isIncome ? "Add Income" : "Add Expense"}
        </button>
      </div>
    </>
  );
}

function AddSavingsContributionForm({ savingsGoals, paycheckKey, onAdd, onClose }) {
  const [goalId, setGoalId] = useState(savingsGoals[0]?.id || "");
  const [amount, setAmount] = useState("");
  const canSubmit = goalId && parseFloat(amount) > 0;
  const selectedGoal = savingsGoals.find((g) => g.id === Number(goalId) || g.id === goalId);
  const remaining = selectedGoal ? selectedGoal.target - selectedGoal.current : 0;
  const quickAmounts = [25, 50, 100, 250].filter((a) => a <= remaining + 10);

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Savings Contribution</h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>This will update your savings goal progress too</p>
      </div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Savings Goal</FieldLabel>
          <select value={goalId} onChange={(e) => setGoalId(e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
            {savingsGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.icon} {g.name} — {fmt(g.current)} of {fmt(g.target)}</option>
            ))}
          </select>
        </div>
        {selectedGoal && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ProgressBar value={selectedGoal.current} max={selectedGoal.target} color={selectedGoal.color || "var(--accent)"} height={5} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span>{fmt(selectedGoal.current)} saved</span>
              <span>{fmt(remaining)} to go</span>
            </div>
          </div>
        )}
        <div>
          <FieldLabel>Amount</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
        </div>
        {quickAmounts.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {quickAmounts.map((qa) => (
              <button key={qa} onClick={() => setAmount(String(qa))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === qa ? "var(--accent)" : "transparent",
                  color: parseFloat(amount) === qa ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                ${qa}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onAdd(paycheckKey, Number(goalId) || goalId, parseFloat(amount)); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          Add Contribution
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// INCOME PAGE
// ─────────────────────────────────────────────

const INCOME_CATEGORIES = {
  employment: { label: "Employment", color: "var(--accent)" },
  freelance: { label: "Freelance", color: "var(--amber)" },
  investment: { label: "Investment", color: "var(--green)" },
  rental: { label: "Rental", color: "#d4a843" },
  gift: { label: "Gift / Other", color: "#f472b6" },
};

function IncomePage({ income, setIncome, showUndo }) {
  const [modal, setModal] = useState(null);

  const totalMonthly = income.filter((i) => i.recurring).reduce((s, i) => {
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);
  const totalYearly = totalMonthly * 12;
  const recurringCount = income.filter((i) => i.recurring).length;
  const oneTimeTotal = income.filter((i) => !i.recurring).reduce((s, i) => s + i.amount, 0);

  const grouped = {};
  income.forEach((i) => {
    const cat = i.category || "gift";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  const deleteIncome = (id) => { const inc = income.find((i) => i.id === id); if (showUndo && inc) showUndo(`Deleted "${inc.source}"`); setIncome((prev) => prev.filter((i) => i.id !== id)); setConfirmingDelete(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Income</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Track all household income sources</p>
        </div>
        <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Income</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Income" value={fmt(totalMonthly)} sub={`${recurringCount} recurring sources`} accent="var(--green)" />
        <MetricBox label="Annual Income" value={fmtCompact(totalYearly)} sub="projected yearly" />
        <MetricBox label="One-Time Income" value={fmt(oneTimeTotal)} sub={`${income.filter((i) => !i.recurring).length} entries`} accent="var(--amber)" />
        <MetricBox label="Total Sources" value={income.length} sub={`${Object.keys(grouped).length} categories`} />
      </div>

      {Object.entries(INCOME_CATEGORIES).filter(([key]) => grouped[key]).map(([catKey, catInfo]) => (
        <div key={catKey} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: catInfo.color, background: catInfo.color + "18", padding: "2px 7px", borderRadius: 4 }}>{catInfo.label}</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{grouped[catKey].length} source{grouped[catKey].length !== 1 ? "s" : ""}</span>
          </div>
          <Card>
            {grouped[catKey].map((inc, idx) => (
              <SwipeToDelete key={inc.id} onDelete={() => deleteIncome(inc.id)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < grouped[catKey].length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{inc.icon || "💰"}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{inc.source}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 10 }}>
                        {inc.recurring && <FrequencyBadge frequency={inc.frequency} />}
                        {!inc.recurring && <span>One-time · {new Date(inc.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>+{fmt(inc.amount)}</span>
                    <button onClick={() => setModal({ type: "edit", income: inc })} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                </div>
              </SwipeToDelete>
            ))}
          </Card>
        </div>
      ))}

      {income.length === 0 && (
        <Card style={{ padding: "48px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-muted)", marginBottom: 8 }}>No income sources yet</div>
          <button onClick={() => setModal("add")} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Your First Income</button>
        </Card>
      )}

      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <IncomeForm onSave={(inc) => { setIncome((p) => [...p, { ...inc, id: nextId() }]); setModal(null); }} onClose={() => setModal(null)} title="Add Income Source" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <IncomeForm existing={modal.income} onSave={(updated) => { setIncome((p) => p.map((i) => i.id === updated.id ? updated : i)); setModal(null); }} onClose={() => setModal(null)} title="Edit Income Source" />
        </Overlay>
      )}
    </div>
  );
}

function IncomeForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    source: existing.source, amount: String(existing.amount), date: existing.date,
    recurring: existing.recurring, frequency: existing.frequency || "monthly",
    category: existing.category || "employment", icon: existing.icon || "💰",
  } : {
    source: "", amount: "", date: new Date().toISOString().split("T")[0],
    recurring: true, frequency: "monthly", category: "employment", icon: "💼",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.source.trim() && parseFloat(form.amount) > 0;
  const icons = ["💼", "🎨", "📈", "🏠", "🎁", "💰", "🛒", "📱"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Source Name</FieldLabel><input value={form.source} onChange={(e) => update("source", e.target.value)} placeholder="e.g. My Salary" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Category</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(INCOME_CATEGORIES).map(([key, info]) => {
              const active = form.category === key;
              return (<button key={key} onClick={() => update("category", key)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? info.color : "var(--border)"}`, background: active ? info.color + "22" : "transparent", color: active ? info.color : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{info.label}</button>);
            })}
          </div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
        <div onClick={() => update("recurring", !form.recurring)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}>
          <div style={{ width: 40, height: 22, borderRadius: 11, padding: 2, background: form.recurring ? "var(--accent)" : "var(--track)", transition: "background 0.2s", display: "flex", alignItems: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "transform 0.2s", transform: form.recurring ? "translateX(18px)" : "translateX(0)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
          <div><div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recurring</div></div>
        </div>
        {form.recurring && (
          <div><FieldLabel>Frequency</FieldLabel>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => {
                const active = form.frequency === key;
                return (<button key={key} onClick={() => update("frequency", key)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)22" : "transparent", color: active ? "var(--accent)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{label}</button>);
              })}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), source: form.source.trim(), amount: parseFloat(form.amount), date: form.date, recurring: form.recurring, frequency: form.recurring ? form.frequency : null, category: form.category, icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Income"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// DEBT PAGE
// ─────────────────────────────────────────────

function DebtPage({ debts, setDebts, showUndo }) {
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

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
        <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Debt</button>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                  <div style={{ padding: "8px 20px 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Payment History</span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    {[...(debt.payments || [])].reverse().map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>-{fmt(p.amount)}</span>
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

function DebtForm({ existing, onSave, onClose, title }) {
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

function DebtPaymentForm({ debt, onPay, onClose }) {
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

function NetWorthPage({ assets, setAssets, debts, showUndo }) {
  const [modal, setModal] = useState(null);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalDebts = debts.reduce((s, d) => s + d.balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Group assets by category
  const groupedAssets = {};
  assets.forEach((a) => {
    const cat = a.category || "other";
    if (!groupedAssets[cat]) groupedAssets[cat] = [];
    groupedAssets[cat].push(a);
  });

  const assetCatTotals = Object.entries(ASSET_CATEGORIES).map(([key, info]) => ({
    key, ...info, total: (groupedAssets[key] || []).reduce((s, a) => s + a.value, 0), count: (groupedAssets[key] || []).length,
  })).filter((c) => c.total > 0);

  const deleteAsset = (id) => { const asset = assets.find((a) => a.id === id); if (showUndo && asset) showUndo(`Deleted "${asset.name}"`); setAssets((prev) => prev.filter((a) => a.id !== id)); };
  const updateAsset = (updated) => { setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a)); setModal(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Net Worth</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Assets minus liabilities</p>
        </div>
        <button onClick={() => setModal("add")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Asset</button>
      </div>

      {/* Big net worth display */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>Net Worth</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: netWorth >= 0 ? "var(--green)" : "var(--red)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {netWorth < 0 && "-"}{fmt(Math.abs(netWorth))}
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>Total Assets</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalAssets)}</div>
            </div>
            <div style={{ width: 1, background: "var(--border)" }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 2 }}>Total Liabilities</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalDebts)}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, maxWidth: 400, margin: "16px auto 0" }}>
            <div style={{ position: "relative", height: 14, borderRadius: 7, background: "var(--red)", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${totalAssets > 0 ? Math.min((totalAssets / (totalAssets + totalDebts)) * 100, 100) : 0}%`, background: "var(--green)", borderRadius: 7, transition: "width 0.6s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />Assets</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--red)" }} />Liabilities</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Asset breakdown by category */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {assetCatTotals.map((cat) => (
          <MetricBox key={cat.key} label={cat.label} value={fmtCompact(cat.total)} sub={`${cat.count} account${cat.count !== 1 ? "s" : ""}`} accent={cat.color} />
        ))}
      </div>

      {/* Assets list */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--green)" }}>Assets</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(totalAssets)}</span>
        </div>
        {Object.entries(ASSET_CATEGORIES).filter(([key]) => groupedAssets[key]).map(([catKey, catInfo]) => (
          <div key={catKey} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "0 4px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: catInfo.color, background: catInfo.color + "18", padding: "2px 7px", borderRadius: 4 }}>{catInfo.label}</span>
            </div>
            <Card>
              {groupedAssets[catKey].map((asset, idx) => (
                <SwipeToDelete key={asset.id} onDelete={() => deleteAsset(asset.id)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < groupedAssets[catKey].length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{asset.icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{asset.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(asset.value)}</span>
                      <button onClick={() => setModal({ type: "edit", asset })} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              ))}
            </Card>
          </div>
        ))}
      </div>

      {/* Liabilities list */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 4px" }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--red)" }}>Liabilities</span>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(totalDebts)}</span>
        </div>
        <Card>
          {debts.map((debt, idx) => (
            <div key={debt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < debts.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{debt.icon}</span>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{debt.name}</span>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{debt.lender || ""} · {debt.apr}% APR</div>
                </div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</span>
            </div>
          ))}
          {debts.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No debts — debt free!</div>}
        </Card>
      </div>

      {/* Modals */}
      {modal === "add" && (
        <Overlay onClose={() => setModal(null)}>
          <AssetForm onSave={(a) => { setAssets((p) => [...p, { ...a, id: nextId() }]); setModal(null); }} onClose={() => setModal(null)} title="Add Asset" />
        </Overlay>
      )}
      {modal?.type === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <AssetForm existing={modal.asset} onSave={updateAsset} onClose={() => setModal(null)} title="Edit Asset" />
        </Overlay>
      )}
    </div>
  );
}

function AssetForm({ existing, onSave, onClose, title }) {
  const [form, setForm] = useState(existing ? {
    name: existing.name, value: String(existing.value), category: existing.category || "cash", icon: existing.icon || "💰",
  } : { name: "", value: "", category: "cash", icon: "🏦" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.value) >= 0;
  const icons = ["🏦", "💰", "📊", "📈", "💹", "🚗", "🏠", "🛋", "💎", "📱", "🎨", "📦"];

  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3></div>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Asset Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Checking Account" style={INPUT_STYLE} /></div>
        <div><FieldLabel>Current Value</FieldLabel><input type="number" step="0.01" min="0" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
        <div><FieldLabel>Category</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(ASSET_CATEGORIES).map(([key, info]) => {
              const active = form.category === key;
              return (<button key={key} onClick={() => update("category", key)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? info.color : "var(--border)"}`, background: active ? info.color + "22" : "transparent", color: active ? info.color : "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{info.label}</button>);
            })}
          </div>
        </div>
        <div><FieldLabel>Icon</FieldLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {icons.map((ic) => (<button key={ic} onClick={() => update("icon", ic)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 16, border: `2px solid ${form.icon === ic ? "var(--accent)" : "var(--border)"}`, background: form.icon === ic ? "var(--accent)22" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{ic}</button>))}
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={() => { if (canSubmit) onSave({ ...(existing || {}), name: form.name.trim(), value: parseFloat(form.value), category: form.category, icon: form.icon }); }} disabled={!canSubmit}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          {existing ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// DEBT STRATEGY PAGE (Baby Step 2)
// ─────────────────────────────────────────────

function simulatePayoff(debts, extraMonthly, method) {
  if (debts.length === 0 || debts.every((d) => d.balance <= 0)) return { months: 0, totalInterest: 0, timeline: [], order: [] };

  // Sort: snowball = smallest balance first, avalanche = highest APR first
  const sorted = [...debts].filter((d) => d.balance > 0).sort((a, b) =>
    method === "snowball" ? a.balance - b.balance : b.apr - a.apr
  );

  const order = sorted.map((d) => d.id);
  const balances = {};
  sorted.forEach((d) => { balances[d.id] = d.balance; });
  const mins = {};
  sorted.forEach((d) => { mins[d.id] = d.minPayment; });
  const aprs = {};
  sorted.forEach((d) => { aprs[d.id] = d.apr; });

  const timeline = [];
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // safety cap

  while (Object.values(balances).some((b) => b > 0) && months < maxMonths) {
    months++;
    const monthData = { month: months, payments: {}, interest: {}, balances: {}, paidOff: [] };

    // Apply interest
    let monthInterest = 0;
    sorted.forEach((d) => {
      if (balances[d.id] > 0) {
        const interest = (aprs[d.id] / 100 / 12) * balances[d.id];
        balances[d.id] += interest;
        monthData.interest[d.id] = interest;
        monthInterest += interest;
      }
    });
    totalInterest += monthInterest;

    // Pay minimums on all active debts
    let availableExtra = extraMonthly;
    sorted.forEach((d) => {
      if (balances[d.id] > 0) {
        const payment = Math.min(mins[d.id], balances[d.id]);
        balances[d.id] -= payment;
        monthData.payments[d.id] = payment;
        if (balances[d.id] <= 0.01) {
          // Freed up this minimum for the snowball
          availableExtra += mins[d.id];
          balances[d.id] = 0;
          monthData.paidOff.push(d.id);
        }
      }
    });

    // Apply snowball/avalanche extra to the target debt
    for (const d of sorted) {
      if (balances[d.id] > 0 && availableExtra > 0) {
        const extra = Math.min(availableExtra, balances[d.id]);
        balances[d.id] -= extra;
        monthData.payments[d.id] = (monthData.payments[d.id] || 0) + extra;
        availableExtra -= extra;
        if (balances[d.id] <= 0.01) {
          availableExtra += mins[d.id]; // freed minimum rolls into snowball
          balances[d.id] = 0;
          if (!monthData.paidOff.includes(d.id)) monthData.paidOff.push(d.id);
        }
        break; // snowball focuses on one at a time
      }
    }

    sorted.forEach((d) => { monthData.balances[d.id] = Math.max(balances[d.id], 0); });
    timeline.push(monthData);
  }

  return { months, totalInterest, timeline, order };
}

function DebtStrategyPage({ debts, income }) {
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
      case "semimonthly": return s + i.amount;
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

function FinancialRoadmapPage({ savingsGoals, debts, income, transactions, assets, categories, onNavigate }) {
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

function CalcInput({ label, value, onChange, prefix, suffix, step = "1", min = "0" }) {
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

function CalcResult({ label, value, accent, sub }) {
  return (
    <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CompoundInterestCalc() {
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

function MortgageCalc() {
  const [price, setPrice] = useState("350000");
  const [down, setDown] = useState("70000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");

  const loan = (parseFloat(price) || 0) - (parseFloat(down) || 0);
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = (parseFloat(term) || 0) * 12;
  const payment = r > 0 && n > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const totalPaid = payment * n;
  const totalInterest = totalPaid - loan;

  // Simple amortization first 12 months
  const schedule = [];
  let bal = loan;
  for (let i = 1; i <= Math.min(n, 12); i++) {
    const interest = bal * r;
    const princ = payment - interest;
    bal -= princ;
    schedule.push({ month: i, payment, principal: princ, interest, balance: Math.max(bal, 0) });
  }

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
        <CalcResult label="Total Interest" value={fmtCompact(totalInterest)} accent="var(--red)" />
        <CalcResult label="Loan Amount" value={fmtCompact(loan)} sub={`${((parseFloat(down) || 0) / (parseFloat(price) || 1) * 100).toFixed(0)}% down`} />
      </div>
      {schedule.length > 0 && (
        <div style={{ marginTop: 4, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Month", "Payment", "Principal", "Interest", "Balance"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: h === "Month" ? "left" : "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{schedule.map((r) => (
              <tr key={r.month} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "7px 10px", color: "var(--text-primary)", fontWeight: 500 }}>{r.month}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{fmt(r.payment)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--green)" }}>{fmt(r.principal)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--red)" }}>{fmt(r.interest)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{fmtCompact(r.balance)}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>Showing first 12 of {n} months</div>
        </div>
      )}
    </div>
  );
}

function RetirementCalc() {
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

function LoanPayoffCalc() {
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

function SavingsGoalCalc() {
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

function CalculatorPage() {
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

function TransactionsPage({ transactions, setTransactions, categories, showUndo }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const catMap = {};
  categories.forEach((c) => { catMap[c.id] = c; });

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q) || (catMap[t.categoryId]?.name || "").toLowerCase().includes(q));
    }
    if (filterCat !== "all") list = list.filter((t) => t.categoryId === filterCat);
    list.sort((a, b) => {
      if (sortField === "date") return sortDir === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      if (sortField === "amount") return sortDir === "desc" ? b.amount - a.amount : a.amount - b.amount;
      return 0;
    });
    return list;
  }, [transactions, search, filterCat, sortField, sortDir]);

  const totalFiltered = filtered.reduce((s, t) => s + t.amount, 0);
  const selectedTotal = filtered.filter((t) => selected.has(t.id)).reduce((s, t) => s + t.amount, 0);
  const hasSelection = selected.size > 0;
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((t) => t.id)));
  };

  const deleteSelected = () => {
    if (showUndo) showUndo(`Deleted ${selected.size} transaction${selected.size !== 1 ? "s" : ""}`);
    setTransactions((prev) => prev.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
  };

  const deleteAll = () => {
    if (showUndo) showUndo(`Deleted all ${transactions.length} transactions`);
    setTransactions([]);
    setSelected(new Set());
    setConfirmDeleteAll(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Transactions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{filtered.length} transactions · {fmt(totalFiltered)} total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {transactions.length > 0 && (
            confirmDeleteAll ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={deleteAll} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--red)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Yes, Delete All ({transactions.length})
                </button>
                <button onClick={() => setConfirmDeleteAll(false)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteAll(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--red)44", background: "transparent", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Delete All
              </button>
            )
          )}
          <button onClick={() => setShowAdd(true)} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Transaction</button>
        </div>
      </div>

      {/* Selection action bar */}
      {hasSelection && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 16px", marginBottom: 12, borderRadius: 10,
          background: "var(--accent)" + "18", border: "1px solid var(--accent)" + "44",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>
              {selected.size} selected
            </span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {fmt(selectedTotal)}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSelected(new Set())} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Deselect</button>
            <button onClick={deleteSelected} style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: "var(--red)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
              Delete ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 250px", position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..."
            style={{ ...INPUT_STYLE, paddingLeft: 36 }} />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ ...INPUT_STYLE, width: "auto", minWidth: 150, cursor: "pointer" }}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Transaction list */}
      <Card>
        {/* Header row with select all */}
        <div style={{
          display: "grid", gridTemplateColumns: "40px 1fr auto",
          padding: "10px 16px", borderBottom: "1px solid var(--border)",
          alignItems: "center",
        }}>
          <div onClick={selectAll} style={{
            width: 22, height: 22, borderRadius: 6, cursor: "pointer",
            border: allSelected ? "none" : "2px solid var(--border-hover)",
            background: allSelected ? "var(--accent)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            )}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span onClick={() => toggleSort("date")} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
              Date {sortField === "date" && (sortDir === "desc" ? "↓" : "↑")}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Description</span>
          </div>
          <span onClick={() => toggleSort("amount")} style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
            Amount {sortField === "amount" && (sortDir === "desc" ? "↓" : "↑")}
          </span>
        </div>

        {/* Transaction rows */}
        {filtered.map((t) => {
          const cat = catMap[t.categoryId];
          const isSelected = selected.has(t.id);
          return (
            <div key={t.id}
              onClick={() => toggleSelect(t.id)}
              style={{
                display: "grid", gridTemplateColumns: "40px 1fr auto",
                padding: "12px 16px", alignItems: "center",
                borderBottom: "1px solid var(--border-subtle)",
                background: isSelected ? "var(--accent)" + "0c" : "transparent",
                cursor: "pointer", transition: "background 0.15s",
                userSelect: "none",
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--nav-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "var(--accent)" + "0c" : "transparent"; }}
            >
              {/* Checkbox */}
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: isSelected ? "none" : "2px solid var(--border-hover)",
                background: isSelected ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0,
              }}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>

              {/* Info */}
              <div style={{ minWidth: 0, paddingRight: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {cat && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{cat.icon} {cat.name}</span>}
                </div>
              </div>

              {/* Amount */}
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--red)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                -{fmt(t.amount)}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {search || filterCat !== "all" ? "No transactions match your filters" : "No transactions yet"}
          </div>
        )}
      </Card>

      {showAdd && (
        <Overlay onClose={() => setShowAdd(false)}>
          <ModalForm title="Add Transaction">
            <AddTransactionFields categories={categories} onSubmit={(tx) => { setTransactions((p) => [...p, tx]); setShowAdd(false); }} onClose={() => setShowAdd(false)} />
          </ModalForm>
        </Overlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CASH FLOW FORECAST PAGE
// ─────────────────────────────────────────────

function CashFlowForecastPage({ income, billTemplates, paidDates, transactions, savingsGoals, debts, assets }) {
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
                <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="#26262e" strokeWidth="0.5" />
                <text x={pad.left - 8} y={t.y + 4} textAnchor="end" fill="#6a6a7a" fontSize="9" fontFamily="DM Sans, sans-serif">
                  {t.val >= 1000 ? `$${(t.val / 1000).toFixed(0)}k` : `$${Math.round(t.val)}`}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xTicks.map((t, i) => (
              <text key={i} x={t.x} y={chartH - 6} textAnchor="middle" fill="#6a6a7a" fontSize="8.5" fontFamily="DM Sans, sans-serif">
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
                <circle cx={scaleX(d.dayNum)} cy={scaleY(d.balance)} r="3.5" fill="#34d399" stroke="#111827" strokeWidth="1.5" />
              </g>
            ))}

            {/* Bill day markers */}
            {billEvents.map((d, i) => (
              <g key={`bill-${i}`}>
                <circle cx={scaleX(d.dayNum)} cy={scaleY(d.balance)} r="3" fill="#fbbf24" stroke="#111827" strokeWidth="1.5" />
              </g>
            ))}

            {/* Today marker */}
            <circle cx={scaleX(0)} cy={scaleY(visibleDays[0].balance)} r="4" fill="#3b82f6" stroke="#111827" strokeWidth="2" />
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

function SpendingTrendsPage({ categories, transactions }) {
  const [selectedCat, setSelectedCat] = useState("all");
  const [monthCount, setMonthCount] = useState(4); // how many months to show

  // Build month keys for the last N months (including current)
  const monthKeys = useMemo(() => {
    const now = new Date();
    const keys = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        longLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return keys;
  }, [monthCount]);

  // Group transactions by month key
  const txByMonth = useMemo(() => {
    const map = {};
    monthKeys.forEach((m) => { map[m.key] = []; });
    transactions.forEach((t) => {
      const mk = t.date.substring(0, 7); // "YYYY-MM"
      if (map[mk]) map[mk].push(t);
    });
    return map;
  }, [transactions, monthKeys]);

  // Per-month totals
  const monthTotals = useMemo(() => {
    return monthKeys.map((m) => {
      const txs = txByMonth[m.key] || [];
      const total = txs.reduce((s, t) => s + t.amount, 0);
      const byCat = {};
      categories.forEach((c) => { byCat[c.id] = 0; });
      txs.forEach((t) => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount; });
      return { ...m, total, byCat, txCount: txs.length };
    });
  }, [monthKeys, txByMonth, categories]);

  // Current month (last in array) vs previous months average
  const currentMonth = monthTotals[monthTotals.length - 1];
  const prevMonths = monthTotals.slice(0, -1).filter((m) => m.total > 0);
  const prevAvg = prevMonths.length > 0 ? prevMonths.reduce((s, m) => s + m.total, 0) / prevMonths.length : 0;
  const trendDelta = prevAvg > 0 ? ((currentMonth.total - prevAvg) / prevAvg) * 100 : 0;

  // Category breakdown for selected view
  const catBreakdown = useMemo(() => {
    return categories.map((cat, ci) => {
      const monthlyAmounts = monthTotals.map((m) => m.byCat[cat.id] || 0);
      const currentAmt = monthlyAmounts[monthlyAmounts.length - 1];
      const prevAmts = monthlyAmounts.slice(0, -1).filter((a) => a > 0);
      const avg = prevAmts.length > 0 ? prevAmts.reduce((s, a) => s + a, 0) / prevAmts.length : 0;
      const delta = avg > 0 ? ((currentAmt - avg) / avg) * 100 : 0;
      const total = monthlyAmounts.reduce((s, a) => s + a, 0);
      return {
        ...cat,
        monthlyAmounts,
        currentAmt,
        avg,
        delta,
        total,
        color: TREND_COLORS[ci % TREND_COLORS.length],
      };
    }).filter((c) => c.total > 0).sort((a, b) => b.currentAmt - a.currentAmt);
  }, [categories, monthTotals]);

  // Chart data — either all categories stacked or single category
  const chartData = selectedCat === "all" ? monthTotals : monthTotals.map((m) => ({
    ...m,
    total: m.byCat[selectedCat] || 0,
  }));

  // SVG bar chart dimensions
  const chartW = 560;
  const chartH = 200;
  const pad = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = chartW - pad.left - pad.right;
  const innerH = chartH - pad.top - pad.bottom;

  const maxVal = Math.max(...chartData.map((m) => m.total), 1);
  const barGap = 12;
  const barW = Math.max((innerW - barGap * (chartData.length - 1)) / chartData.length, 20);

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxVal * i) / tickCount;
    yTicks.push({ val, y: pad.top + innerH - (val / maxVal) * innerH });
  }

  // Category trend sparkline for per-category rows
  function Sparkline({ data, color, width = 80, height = 28 }) {
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    });
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        {data.length > 0 && (() => {
          const lastX = width;
          const lastY = height - (data[data.length - 1] / max) * (height - 4) - 2;
          return <circle cx={lastX} cy={lastY} r="2.5" fill={color} />;
        })()}
      </svg>
    );
  }

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Spending Trends</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          How your spending compares month to month
        </p>
      </div>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { n: 3, label: "3 Months" },
          { n: 4, label: "4 Months" },
          { n: 6, label: "6 Months" },
        ].map((opt) => (
          <button key={opt.n} onClick={() => setMonthCount(opt.n)} style={pillStyle(monthCount === opt.n)}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="This Month" value={fmt(currentMonth.total)} sub={`${currentMonth.txCount} transactions`} accent="var(--text-primary)" />
        <MetricBox label="Prior Average" value={fmt(prevAvg)} sub={prevMonths.length > 0 ? `last ${prevMonths.length} month${prevMonths.length > 1 ? "s" : ""}` : "no data"} accent="var(--text-secondary)" />
        <MetricBox
          label="Trend"
          value={prevAvg > 0 ? `${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)}%` : "—"}
          sub={trendDelta > 5 ? "spending up" : trendDelta < -5 ? "spending down" : "roughly flat"}
          accent={trendDelta > 5 ? "var(--red)" : trendDelta < -5 ? "var(--green)" : "var(--text-muted)"}
        />
        <MetricBox label="Categories" value={catBreakdown.length} sub="with spending" accent="var(--accent)" />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
        <button onClick={() => setSelectedCat("all")} style={pillStyle(selectedCat === "all")}>All Categories</button>
        {catBreakdown.map((c) => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} style={pillStyle(selectedCat === c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title={selectedCat === "all" ? "Monthly Spending" : `${categories.find((c) => c.id === selectedCat)?.icon || ""} ${categories.find((c) => c.id === selectedCat)?.name || ""} — Monthly`} />
        <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 240 }} preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="#26262e" strokeWidth="0.5" />
                <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="#6a6a7a" fontSize="9" fontFamily="DM Sans, sans-serif">
                  {t.val >= 1000 ? `$${(t.val / 1000).toFixed(1)}k` : `$${Math.round(t.val)}`}
                </text>
              </g>
            ))}

            {/* Bars */}
            {chartData.map((m, i) => {
              const barH = maxVal > 0 ? (m.total / maxVal) * innerH : 0;
              const x = pad.left + i * (barW + barGap);
              const y = pad.top + innerH - barH;
              const isCurrentMonth = i === chartData.length - 1;

              // For "all" view, stack categories within each bar
              if (selectedCat === "all" && catBreakdown.length > 0) {
                let stackY = pad.top + innerH;
                const segments = catBreakdown.map((cat) => {
                  const val = m.byCat?.[cat.id] || 0;
                  const segH = maxVal > 0 ? (val / maxVal) * innerH : 0;
                  stackY -= segH;
                  return { cat, val, segH, segY: stackY };
                }).filter((s) => s.segH > 0);

                return (
                  <g key={m.key}>
                    {segments.map((seg, si) => (
                      <rect key={si} x={x} y={seg.segY} width={barW} height={seg.segH}
                        rx={si === segments.length - 1 ? 4 : si === 0 ? 0 : 0}
                        fill={seg.cat.color} opacity={isCurrentMonth ? 1 : 0.55} />
                    ))}
                    {/* Total label on top */}
                    {m.total > 0 && (
                      <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrentMonth ? "#e8e8ec" : "#6a6a7a"} fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">
                        {m.total >= 1000 ? `$${(m.total / 1000).toFixed(1)}k` : `$${Math.round(m.total)}`}
                      </text>
                    )}
                    {/* Month label */}
                    <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrentMonth ? "#e8e8ec" : "#6a6a7a"} fontSize="10" fontWeight={isCurrentMonth ? "700" : "500"} fontFamily="DM Sans, sans-serif">
                      {m.label}
                    </text>
                  </g>
                );
              }

              // Single category view — simple bars
              return (
                <g key={m.key}>
                  <rect x={x} y={y} width={barW} height={barH} rx={4}
                    fill={isCurrentMonth ? "var(--accent)" : "var(--accent)"} opacity={isCurrentMonth ? 1 : 0.4} />
                  {m.total > 0 && (
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrentMonth ? "#e8e8ec" : "#6a6a7a"} fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">
                      {fmt(m.total)}
                    </text>
                  )}
                  <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrentMonth ? "#e8e8ec" : "#6a6a7a"} fontSize="10" fontWeight={isCurrentMonth ? "700" : "500"} fontFamily="DM Sans, sans-serif">
                    {m.label}
                  </text>
                </g>
              );
            })}

            {/* Average line (if we have prior data) */}
            {prevAvg > 0 && selectedCat === "all" && (() => {
              const avgY = pad.top + innerH - (prevAvg / maxVal) * innerH;
              return (
                <g>
                  <line x1={pad.left} y1={avgY} x2={pad.left + chartData.length * (barW + barGap) - barGap} y2={avgY}
                    stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.6" />
                  <text x={pad.left + chartData.length * (barW + barGap) - barGap + 4} y={avgY + 3.5} fill="#3b82f6" fontSize="8.5" fontWeight="600" fontFamily="DM Sans, sans-serif">
                    avg
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Stacked bar legend — only in "all" view */}
          {selectedCat === "all" && (
            <div style={{ display: "flex", justifyContent: "center", gap: 14, paddingTop: 8, flexWrap: "wrap" }}>
              {catBreakdown.slice(0, 6).map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                  onClick={() => setSelectedCat(c.id)}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: c.color }} />
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Category-by-category breakdown */}
      <Card style={{ marginBottom: 20 }}>
        <CardHeader title="Category Breakdown" />
        <div style={{ padding: "0 20px 12px" }}>
          {catBreakdown.map((cat) => (
            <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
              onClick={() => setSelectedCat(cat.id === selectedCat ? "all" : cat.id)}>
              {/* Icon & name */}
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {fmt(cat.currentAmt)} this month
                  {cat.avg > 0 && ` · ${fmt(cat.avg)} avg`}
                </div>
              </div>

              {/* Sparkline */}
              <div style={{ flexShrink: 0, marginRight: 4 }}>
                <Sparkline data={cat.monthlyAmounts} color={cat.color} />
              </div>

              {/* Trend indicator */}
              <div style={{ textAlign: "right", minWidth: 56, flexShrink: 0 }}>
                {cat.avg > 0 ? (
                  <>
                    <div style={{
                      fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                      color: cat.delta > 10 ? "var(--red)" : cat.delta < -10 ? "var(--green)" : "var(--text-muted)",
                    }}>
                      {cat.delta >= 0 ? "+" : ""}{cat.delta.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>vs avg</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>new</div>
                )}
              </div>
            </div>
          ))}
          {catBreakdown.length === 0 && (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No spending data yet
            </div>
          )}
        </div>
      </Card>

      {/* Month-over-month table */}
      <Card>
        <CardHeader title="Month-over-Month Detail" />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</th>
                {monthTotals.map((m) => (
                  <th key={m.key} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {catBreakdown.map((cat) => (
                <tr key={cat.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                    <span style={{ marginRight: 6 }}>{cat.icon}</span>{cat.name}
                  </td>
                  {cat.monthlyAmounts.map((amt, i) => (
                    <td key={i} style={{
                      padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums",
                      color: amt > 0 ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: i === cat.monthlyAmounts.length - 1 ? 600 : 400,
                    }}>
                      {amt > 0 ? fmt(amt) : "—"}
                    </td>
                  ))}
                  <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--text-muted)", fontWeight: 500 }}>
                    {cat.avg > 0 ? fmt(cat.avg) : "—"}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--text-primary)" }}>Total</td>
                {monthTotals.map((m) => (
                  <td key={m.key} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {m.total > 0 ? fmt(m.total) : "—"}
                  </td>
                ))}
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                  {prevAvg > 0 ? fmt(prevAvg) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Empty state hint */}
      {prevMonths.length === 0 && (
        <div style={{ marginTop: 20, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto" }}>
            Add transactions across multiple months to see trends and comparisons. The more history you have, the more useful this page becomes.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FINANCIAL RECAP PAGE
// ─────────────────────────────────────────────

function FinancialRecapPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets }) {
  const [view, setView] = useState("weekly"); // "weekly" | "monthly"

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // ── helpers ──
  const monthlyIncome = useMemo(() => income.reduce((s, i) => {
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
  }, 0), [income]);

  const weeklyIncome = monthlyIncome * 12 / 52;

  // ── period helpers ──
  function getWeekRange(weeksAgo) {
    const end = new Date(now);
    end.setDate(end.getDate() - (weeksAgo * 7));
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  function getMonthRange(monthsAgo) {
    const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0);
    return { start, end };
  }

  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function txInRange(start, end) {
    const s = dateStr(start);
    const e = dateStr(end);
    return transactions.filter((t) => t.date >= s && t.date <= e);
  }

  function billsInRange(start, end) {
    const all = [];
    const d = new Date(start);
    const seen = new Set();
    while (d <= end) {
      const instances = generateBillInstances(billTemplates, d.getFullYear(), d.getMonth());
      instances.forEach((b) => {
        if (!seen.has(b.instanceKey) && b.instanceDate >= dateStr(start) && b.instanceDate <= dateStr(end)) {
          seen.add(b.instanceKey);
          all.push(b);
        }
      });
      d.setMonth(d.getMonth() + 1);
    }
    return all;
  }

  // ── build period data ──
  const periods = useMemo(() => {
    const count = view === "weekly" ? 4 : 3;
    const result = [];
    for (let i = 0; i < count; i++) {
      const range = view === "weekly" ? getWeekRange(i) : getMonthRange(i);
      const tx = txInRange(range.start, range.end);
      const bills = billsInRange(range.start, range.end);
      const billsPaidCount = bills.filter((b) => paidDates.has(b.instanceKey)).length;
      const totalSpent = tx.reduce((s, t) => s + t.amount, 0);
      const billsTotal = bills.reduce((s, b) => s + b.amount, 0);
      const txCount = tx.length;

      // spending by category
      const byCat = {};
      tx.forEach((t) => {
        byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
      });

      // top category
      let topCatId = null;
      let topCatAmt = 0;
      Object.entries(byCat).forEach(([id, amt]) => {
        if (amt > topCatAmt) { topCatId = Number(id); topCatAmt = amt; }
      });
      const topCat = categories.find((c) => c.id === topCatId);

      // average per tx
      const avgTx = txCount > 0 ? totalSpent / txCount : 0;

      // biggest single transaction
      const biggestTx = tx.length > 0 ? tx.reduce((a, b) => a.amount > b.amount ? a : b) : null;

      // daily spending (for weekly sparkline)
      const days = [];
      const d = new Date(range.start);
      while (d <= range.end) {
        const ds = dateStr(d);
        const dayTotal = tx.filter((t) => t.date === ds).reduce((s, t) => s + t.amount, 0);
        days.push({ date: ds, total: dayTotal, label: d.toLocaleDateString("en-US", { weekday: "short" }) });
        d.setDate(d.getDate() + 1);
      }

      const label = view === "weekly"
        ? (i === 0 ? "This Week" : i === 1 ? "Last Week" : `${i} Weeks Ago`)
        : (i === 0 ? "This Month" : i === 1 ? "Last Month" : new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString("en-US", { month: "long" }));

      const dateLabel = view === "weekly"
        ? `${range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${range.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : range.start.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      result.push({
        label, dateLabel, totalSpent, billsTotal, billsPaidCount, billsCount: bills.length,
        txCount, byCat, topCat, topCatAmt, avgTx, biggestTx, days, range,
      });
    }
    return result;
  }, [view, transactions, billTemplates, paidDates, categories, income, now.toDateString()]);

  const current = periods[0];
  const previous = periods[1];

  // ── deltas ──
  const spendDelta = previous && previous.totalSpent > 0 ? ((current.totalSpent - previous.totalSpent) / previous.totalSpent) * 100 : 0;
  const txCountDelta = previous ? current.txCount - previous.txCount : 0;

  // ── savings contributions this period ──
  const savingsThisPeriod = useMemo(() => {
    const s = dateStr(current.range.start);
    const e = dateStr(current.range.end);
    return savingsGoals.reduce((total, g) => {
      return total + (g.contributions || [])
        .filter((c) => c.date >= s && c.date <= e)
        .reduce((sum, c) => sum + c.amount, 0);
    }, 0);
  }, [savingsGoals, current]);

  // ── debt payments this period ──
  const debtPaidThisPeriod = useMemo(() => {
    const s = dateStr(current.range.start);
    const e = dateStr(current.range.end);
    return debts.reduce((total, d) => {
      return total + (d.payments || [])
        .filter((p) => p.date >= s && p.date <= e)
        .reduce((sum, p) => sum + p.amount, 0);
    }, 0);
  }, [debts, current]);

  // ── streaks: consecutive days with no spending ──
  const noSpendStreak = useMemo(() => {
    let streak = 0;
    const d = new Date(now);
    // start from yesterday (today is still in progress)
    d.setDate(d.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      const ds = dateStr(d);
      const dayTx = transactions.filter((t) => t.date === ds);
      if (dayTx.length === 0) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [transactions, todayStr]);

  // ── under/over budget categories ──
  const budgetStatus = useMemo(() => {
    const s = dateStr(current.range.start);
    const e = dateStr(current.range.end);
    const periodTx = transactions.filter((t) => t.date >= s && t.date <= e);
    return categories.map((c) => {
      const spent = periodTx.filter((t) => t.categoryId === c.id).reduce((sum, t) => sum + t.amount, 0);
      const limit = view === "weekly" ? (c.limit || 0) * 12 / 52 : (c.limit || 0);
      return { ...c, spent, limit, over: limit > 0 && spent > limit, under: limit > 0 && spent <= limit * 0.5 };
    }).filter((c) => c.spent > 0 || c.limit > 0);
  }, [categories, transactions, current, view]);

  const overBudget = budgetStatus.filter((c) => c.over);
  const underBudget = budgetStatus.filter((c) => c.under && c.limit > 0);

  // ── insights generator ──
  const insights = useMemo(() => {
    const msgs = [];

    if (spendDelta < -10 && previous && previous.totalSpent > 0) {
      msgs.push({ icon: "🎉", text: `Spending is down ${Math.abs(spendDelta).toFixed(0)}% compared to ${previous.label.toLowerCase()}.`, type: "positive" });
    } else if (spendDelta > 15 && previous && previous.totalSpent > 0) {
      msgs.push({ icon: "⚠️", text: `Spending is up ${spendDelta.toFixed(0)}% compared to ${previous.label.toLowerCase()}.`, type: "warning" });
    }

    if (noSpendStreak >= 2) {
      msgs.push({ icon: "🔥", text: `${noSpendStreak}-day no-spend streak! Keep it going.`, type: "positive" });
    }

    if (overBudget.length > 0) {
      msgs.push({ icon: "🚨", text: `${overBudget.length} categor${overBudget.length === 1 ? "y" : "ies"} over budget: ${overBudget.map((c) => c.name).join(", ")}.`, type: "warning" });
    }

    if (underBudget.length >= 3) {
      msgs.push({ icon: "💪", text: `${underBudget.length} categories well under budget. Nice discipline!`, type: "positive" });
    }

    if (savingsThisPeriod > 0) {
      msgs.push({ icon: "💰", text: `${fmt(savingsThisPeriod)} saved toward goals ${view === "weekly" ? "this week" : "this month"}.`, type: "positive" });
    }

    if (debtPaidThisPeriod > 0) {
      msgs.push({ icon: "📉", text: `${fmt(debtPaidThisPeriod)} paid toward debt ${view === "weekly" ? "this week" : "this month"}.`, type: "positive" });
    }

    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const paidOff = debts.filter((d) => d.balance <= 0 && d.originalBalance > 0);
    if (paidOff.length > 0) {
      msgs.push({ icon: "🏆", text: `${paidOff.length} debt${paidOff.length > 1 ? "s" : ""} paid off! Total remaining: ${fmt(totalDebt)}.`, type: "positive" });
    }

    const pendingBills = current.billsCount - current.billsPaidCount;
    if (pendingBills > 0) {
      msgs.push({ icon: "📋", text: `${pendingBills} bill${pendingBills !== 1 ? "s" : ""} still unpaid ${view === "weekly" ? "this week" : "this month"}.`, type: "neutral" });
    }

    if (current.biggestTx && current.biggestTx.amount > current.avgTx * 3 && current.txCount >= 3) {
      const cat = categories.find((c) => c.id === current.biggestTx.categoryId);
      msgs.push({ icon: "📌", text: `Biggest purchase: ${fmt(current.biggestTx.amount)} on "${current.biggestTx.description}"${cat ? ` (${cat.name})` : ""}.`, type: "neutral" });
    }

    if (msgs.length === 0) {
      msgs.push({ icon: "👍", text: "Looking good! Keep tracking your finances.", type: "positive" });
    }

    return msgs;
  }, [spendDelta, noSpendStreak, overBudget, underBudget, savingsThisPeriod, debtPaidThisPeriod, debts, current, previous, view, categories]);

  // ── Chart constants ──
  const RECAP_CHART_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f43f5e", "#84cc16"];

  // ── SVG Daily Spending Bar Chart (weekly view) ──
  function DailySpendingChart({ days }) {
    const chartW = 560;
    const chartH = 180;
    const pad = { top: 12, right: 12, bottom: 28, left: 52 };
    const innerW = chartW - pad.left - pad.right;
    const innerH = chartH - pad.top - pad.bottom;
    const maxVal = Math.max(...days.map((d) => d.total), 1);
    const barGap = 10;
    const barW = Math.max((innerW - barGap * (days.length - 1)) / days.length, 16);

    const yTicks = [];
    for (let i = 0; i <= 3; i++) {
      const val = (maxVal * i) / 3;
      yTicks.push({ val, y: pad.top + innerH - (val / maxVal) * innerH });
    }

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 200 }} preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="#26262e" strokeWidth="0.5" />
            <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="#6a6a7a" fontSize="9" fontFamily="system-ui, sans-serif">
              {t.val >= 1000 ? `$${(t.val / 1000).toFixed(1)}k` : `$${Math.round(t.val)}`}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const barH = Math.max((d.total / maxVal) * innerH, 2);
          const x = pad.left + i * (barW + barGap);
          const y = pad.top + innerH - barH;
          const isToday = d.date === todayStr;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill={isToday ? "var(--accent)" : "#3b82f6"} opacity={isToday ? 1 : 0.4} />
              {d.total > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill={isToday ? "#e8e8ec" : "#6a6a7a"} fontSize="8.5" fontWeight="600" fontFamily="system-ui, sans-serif">
                  {d.total >= 1000 ? `$${(d.total / 1000).toFixed(1)}k` : `$${Math.round(d.total)}`}
                </text>
              )}
              <text x={x + barW / 2} y={chartH - 6} textAnchor="middle" fill={isToday ? "#e8e8ec" : "#6a6a7a"} fontSize="10" fontWeight={isToday ? 700 : 500} fontFamily="system-ui, sans-serif">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // ── SVG Period Comparison Bar Chart (monthly view) ──
  function PeriodComparisonChart() {
    const chartW = 560;
    const chartH = 200;
    const pad = { top: 16, right: 16, bottom: 36, left: 56 };
    const innerW = chartW - pad.left - pad.right;
    const innerH = chartH - pad.top - pad.bottom;
    const data = [...periods].reverse();
    const maxVal = Math.max(...data.map((p) => p.totalSpent), 1);
    const barGap = 16;
    const barW = Math.max((innerW - barGap * (data.length - 1)) / data.length, 30);

    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal * i) / 4;
      yTicks.push({ val, y: pad.top + innerH - (val / maxVal) * innerH });
    }

    // average line
    const avg = data.reduce((s, d) => s + d.totalSpent, 0) / data.length;
    const avgY = pad.top + innerH - (avg / maxVal) * innerH;

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 220 }} preserveAspectRatio="xMidYMid meet">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="#26262e" strokeWidth="0.5" />
            <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="#6a6a7a" fontSize="9" fontFamily="system-ui, sans-serif">
              {t.val >= 1000 ? `$${(t.val / 1000).toFixed(1)}k` : `$${Math.round(t.val)}`}
            </text>
          </g>
        ))}
        {/* Average line */}
        <line x1={pad.left} y1={avgY} x2={chartW - pad.right} y2={avgY} stroke="#f59e0b" strokeWidth="1" strokeDasharray="5,4" opacity="0.6" />
        <text x={chartW - pad.right + 4} y={avgY + 3.5} fill="#f59e0b" fontSize="8" fontFamily="system-ui, sans-serif">avg</text>
        {data.map((p, i) => {
          const barH = Math.max((p.totalSpent / maxVal) * innerH, 3);
          const x = pad.left + i * (barW + barGap);
          const y = pad.top + innerH - barH;
          const isCurrent = i === data.length - 1;
          return (
            <g key={i}>
              <defs>
                <linearGradient id={`recapBar${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isCurrent ? "#3b82f6" : "#6366f1"} stopOpacity={isCurrent ? 1 : 0.6} />
                  <stop offset="100%" stopColor={isCurrent ? "#2563eb" : "#4f46e5"} stopOpacity={isCurrent ? 0.85 : 0.3} />
                </linearGradient>
              </defs>
              <rect x={x} y={y} width={barW} height={barH} rx={5} fill={`url(#recapBar${i})`} />
              {p.totalSpent > 0 && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrent ? "#e8e8ec" : "#6a6a7a"} fontSize="9.5" fontWeight="600" fontFamily="system-ui, sans-serif">
                  {p.totalSpent >= 1000 ? `$${(p.totalSpent / 1000).toFixed(1)}k` : `$${Math.round(p.totalSpent)}`}
                </text>
              )}
              <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrent ? "#e8e8ec" : "#6a6a7a"} fontSize="10" fontWeight={isCurrent ? 700 : 500} fontFamily="system-ui, sans-serif">
                {view === "weekly"
                  ? p.range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : p.range.start.toLocaleDateString("en-US", { month: "short" })}
              </text>
              {isCurrent && (
                <text x={x + barW / 2} y={chartH - 20} textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="700" fontFamily="system-ui, sans-serif">
                  CURRENT
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  // ── SVG Donut Chart for category breakdown ──
  function CategoryDonutChart() {
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 80;
    const innerR = 52;
    const cats = sortedCats.slice(0, 6);
    const total = cats.reduce((s, c) => s + c.spent, 0);
    if (total <= 0) return null;
    const otherAmt = current.totalSpent - total;

    const slices = cats.map((c, i) => ({ label: c.name, icon: c.icon, value: c.spent, color: c.color || RECAP_CHART_COLORS[i % RECAP_CHART_COLORS.length] }));
    if (otherAmt > 0) slices.push({ label: "Other", icon: "···", value: otherAmt, color: "#4b5563" });

    const sliceTotal = slices.reduce((s, sl) => s + sl.value, 0);
    let cumAngle = -Math.PI / 2;

    function arcPath(startAngle, endAngle, oR, iR) {
      const x1 = cx + oR * Math.cos(startAngle);
      const y1 = cy + oR * Math.sin(startAngle);
      const x2 = cx + oR * Math.cos(endAngle);
      const y2 = cy + oR * Math.sin(endAngle);
      const x3 = cx + iR * Math.cos(endAngle);
      const y3 = cy + iR * Math.sin(endAngle);
      const x4 = cx + iR * Math.cos(startAngle);
      const y4 = cy + iR * Math.sin(startAngle);
      const large = endAngle - startAngle > Math.PI ? 1 : 0;
      return `M${x1},${y1} A${oR},${oR} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${iR},${iR} 0 ${large} 0 ${x4},${y4} Z`;
    }

    const paths = slices.map((sl) => {
      const angle = (sl.value / sliceTotal) * Math.PI * 2;
      const start = cumAngle;
      const end = cumAngle + angle;
      cumAngle = end;
      return { ...sl, d: arcPath(start, end - 0.02, outerR, innerR) };
    });

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} opacity="0.85" />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#e8e8ec" fontSize="18" fontWeight="700" fontFamily="system-ui, sans-serif">
            {fmt(current.totalSpent).replace(".00", "")}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#6a6a7a" fontSize="10" fontFamily="system-ui, sans-serif">
            total spent
          </text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {slices.map((sl, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: sl.color, flexShrink: 0, opacity: 0.85 }} />
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{sl.icon} {sl.label}</span>
              <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>{((sl.value / sliceTotal) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SVG Spending Trend Line Chart (period-over-period by category) ──
  function SpendingTrendLineChart() {
    const chartW = 560;
    const chartH = 200;
    const pad = { top: 16, right: 16, bottom: 30, left: 56 };
    const innerW = chartW - pad.left - pad.right;
    const innerH = chartH - pad.top - pad.bottom;

    const data = [...periods].reverse(); // oldest first
    const topCats = sortedCats.slice(0, 4);
    if (topCats.length === 0 || data.length < 2) return null;

    // Build lines per category across periods
    const lines = topCats.map((cat, ci) => {
      const values = data.map((p) => p.byCat[cat.id] || 0);
      return { ...cat, values, color: cat.color || RECAP_CHART_COLORS[ci % RECAP_CHART_COLORS.length] };
    });

    const allVals = lines.flatMap((l) => l.values);
    const maxVal = Math.max(...allVals, 1);

    const scaleX = (i) => pad.left + (i / (data.length - 1)) * innerW;
    const scaleY = (v) => pad.top + innerH - (v / maxVal) * innerH;

    const yTicks = [];
    for (let i = 0; i <= 3; i++) {
      const val = (maxVal * i) / 3;
      yTicks.push({ val, y: scaleY(val) });
    }

    return (
      <div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 220 }} preserveAspectRatio="xMidYMid meet">
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="#26262e" strokeWidth="0.5" />
              <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="#6a6a7a" fontSize="9" fontFamily="system-ui, sans-serif">
                {t.val >= 1000 ? `$${(t.val / 1000).toFixed(1)}k` : `$${Math.round(t.val)}`}
              </text>
            </g>
          ))}
          {/* X labels */}
          {data.map((p, i) => (
            <text key={i} x={scaleX(i)} y={chartH - 6} textAnchor="middle" fill="#6a6a7a" fontSize="9" fontFamily="system-ui, sans-serif">
              {view === "weekly" ? p.range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : p.range.start.toLocaleDateString("en-US", { month: "short" })}
            </text>
          ))}
          {/* Lines */}
          {lines.map((line, li) => {
            const points = line.values.map((v, i) => `${scaleX(i)},${scaleY(v)}`);
            return (
              <g key={li}>
                <polyline points={points.join(" ")} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                {line.values.map((v, i) => (
                  <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r={i === line.values.length - 1 ? 4 : 3} fill={line.color} stroke="#111827" strokeWidth="1.5" />
                ))}
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
              <span style={{ width: 12, height: 3, borderRadius: 2, background: l.color }} />
              {l.icon} {l.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SVG Income vs Expenses Grouped Bar Chart ──
  function IncomeVsExpensesChart() {
    const chartW = 560;
    const chartH = 200;
    const pad = { top: 16, right: 16, bottom: 36, left: 56 };
    const innerW = chartW - pad.left - pad.right;
    const innerH = chartH - pad.top - pad.bottom;

    const data = [...periods].reverse().map((p) => {
      const pIncome = view === "weekly" ? weeklyIncome : monthlyIncome;
      return { ...p, income: pIncome, expenses: p.totalSpent };
    });

    const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);
    const groupGap = 24;
    const barGap = 4;
    const groupW = (innerW - groupGap * (data.length - 1)) / data.length;
    const singleW = (groupW - barGap) / 2;

    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal * i) / 4;
      yTicks.push({ val, y: pad.top + innerH - (val / maxVal) * innerH });
    }

    return (
      <div>
        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", maxHeight: 220 }} preserveAspectRatio="xMidYMid meet">
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="#26262e" strokeWidth="0.5" />
              <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="#6a6a7a" fontSize="9" fontFamily="system-ui, sans-serif">
                {t.val >= 1000 ? `$${(t.val / 1000).toFixed(1)}k` : `$${Math.round(t.val)}`}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const gx = pad.left + i * (groupW + groupGap);
            const incH = Math.max((d.income / maxVal) * innerH, 2);
            const expH = Math.max((d.expenses / maxVal) * innerH, 2);
            const isCurrent = i === data.length - 1;
            return (
              <g key={i}>
                {/* Income bar */}
                <rect x={gx} y={pad.top + innerH - incH} width={singleW} height={incH} rx={4} fill="#34d399" opacity={isCurrent ? 0.9 : 0.4} />
                {/* Expenses bar */}
                <rect x={gx + singleW + barGap} y={pad.top + innerH - expH} width={singleW} height={expH} rx={4} fill="#f87171" opacity={isCurrent ? 0.9 : 0.4} />
                {/* Period label */}
                <text x={gx + groupW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrent ? "#e8e8ec" : "#6a6a7a"} fontSize="9.5" fontWeight={isCurrent ? 700 : 500} fontFamily="system-ui, sans-serif">
                  {view === "weekly" ? d.range.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : d.range.start.toLocaleDateString("en-US", { month: "short" })}
                </text>
                {isCurrent && (
                  <text x={gx + groupW / 2} y={chartH - 20} textAnchor="middle" fill="#3b82f6" fontSize="7.5" fontWeight="700" fontFamily="system-ui, sans-serif">CURRENT</text>
                )}
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#34d399" }} /> Income
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#f87171" }} /> Expenses
          </div>
        </div>
      </div>
    );
  }

  // ── category breakdown sorted ──
  const sortedCats = useMemo(() => {
    return categories.map((c) => ({
      ...c,
      spent: current.byCat[c.id] || 0,
    })).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  }, [categories, current]);

  // ── net worth snapshot ──
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const netWorth = totalAssets - totalDebt;

  const periodIncome = view === "weekly" ? weeklyIncome : monthlyIncome;
  const savingsRate = periodIncome > 0 ? (savingsThisPeriod / periodIncome) * 100 : 0;

  const pillStyle = (active) => ({
    padding: "7px 18px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Financial Recap</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Your {view === "weekly" ? "weekly" : "monthly"} financial highlights
        </p>
      </div>

      {/* Weekly / Monthly toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={pillStyle(view === "weekly")} onClick={() => setView("weekly")}>Weekly</button>
        <button style={pillStyle(view === "monthly")} onClick={() => setView("monthly")}>Monthly</button>
      </div>

      {/* ─── Period Header Card ─── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{current.label}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{current.dateLabel}</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>
            {fmt(current.totalSpent)}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            spent across {current.txCount} transaction{current.txCount !== 1 ? "s" : ""}
          </div>
          {previous && previous.totalSpent > 0 && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10,
              padding: "4px 10px", borderRadius: 999,
              background: spendDelta <= 0 ? "var(--green-bg)" : "var(--red-bg)",
              color: spendDelta <= 0 ? "var(--green)" : "var(--red)",
              fontSize: 12, fontWeight: 600,
            }}>
              <span>{spendDelta <= 0 ? "▼" : "▲"}</span>
              <span>{Math.abs(spendDelta).toFixed(1)}% vs {previous.label.toLowerCase()}</span>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Key Metrics Row ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <MetricBox label="Bills Paid" value={`${current.billsPaidCount}/${current.billsCount}`}
          sub={fmt(current.billsTotal)} accent={current.billsPaidCount === current.billsCount ? "var(--green)" : "var(--amber)"} />
        <MetricBox label="Saved" value={fmt(savingsThisPeriod)}
          sub={savingsRate > 0 ? `${savingsRate.toFixed(0)}% of income` : "–"} accent="var(--accent)" />
        <MetricBox label="Debt Paid" value={fmt(debtPaidThisPeriod)}
          sub={`${fmt(totalDebt)} remaining`} accent="var(--amber)" />
        <MetricBox label="Net Worth" value={fmtCompact(netWorth)}
          sub={netWorth >= 0 ? "positive" : "negative"} accent={netWorth >= 0 ? "var(--green)" : "var(--red)"} />
      </div>

      {/* ─── Insights ─── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Insights" />
        <div style={{ padding: "0 20px 16px" }}>
          {insights.map((insight, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0",
              borderBottom: i < insights.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>{insight.icon}</span>
              <span style={{
                fontSize: 14, fontWeight: 500, lineHeight: 1.45,
                color: insight.type === "warning" ? "var(--amber)" : insight.type === "positive" ? "var(--green)" : "var(--text-primary)",
              }}>{insight.text}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Spending Pattern Chart ─── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title={view === "weekly" ? "Daily Spending" : "Spending Comparison"} />
        <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
          {view === "weekly" && current.days.length > 0 ? (
            <DailySpendingChart days={current.days} />
          ) : (
            <PeriodComparisonChart />
          )}
        </div>
      </Card>

      {/* ─── Category Donut Chart ─── */}
      {sortedCats.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Spending Breakdown" />
          <div style={{ padding: "4px 20px 20px" }}>
            <CategoryDonutChart />
          </div>
        </Card>
      )}

      {/* ─── Income vs Expenses ─── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Income vs Expenses" />
        <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
          <IncomeVsExpensesChart />
        </div>
      </Card>

      {/* ─── Category Trend Lines ─── */}
      {periods.length >= 2 && sortedCats.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Category Trends" />
          <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
            <SpendingTrendLineChart />
          </div>
        </Card>
      )}

      {/* ─── Top Spending Categories ─── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Where It Went" />
        <div style={{ padding: "0 20px 16px" }}>
          {sortedCats.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No spending this period</div>
          ) : sortedCats.slice(0, 8).map((c, i) => {
            const pctOfTotal = current.totalSpent > 0 ? (c.spent / current.totalSpent * 100) : 0;
            return (
              <div key={c.id} style={{ padding: "10px 0", borderBottom: i < Math.min(sortedCats.length, 8) - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(c.spent)}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>{pctOfTotal.toFixed(0)}%</span>
                  </div>
                </div>
                <ProgressBar value={c.spent} max={current.totalSpent} color={c.color || "var(--accent)"} height={4} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── Period-over-Period Comparison Table ─── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title={`${view === "weekly" ? "Week" : "Month"}-over-${view === "weekly" ? "Week" : "Month"}`} />
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>Period</th>
                  <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>Spent</th>
                  <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>Txns</th>
                  <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>Avg/Tx</th>
                  <th style={{ textAlign: "left", padding: "8px 0 8px 12px", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>Top Category</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p, i) => (
                  <tr key={i} style={{ opacity: i === 0 ? 1 : 0.7 }}>
                    <td style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", fontWeight: i === 0 ? 600 : 400, color: "var(--text-primary)" }}>
                      {p.label}
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{p.dateLabel}</div>
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(p.totalSpent)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {p.txCount}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(p.avgTx)}
                    </td>
                    <td style={{ padding: "10px 0 10px 12px", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      {p.topCat ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span>{p.topCat.icon}</span>
                          <span>{p.topCat.name}</span>
                          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 11 }}>({fmt(p.topCatAmt)})</span>
                        </span>
                      ) : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* ─── Budget Alerts ─── */}
      {(overBudget.length > 0 || underBudget.length > 0) && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Budget Alerts" />
          <div style={{ padding: "0 20px 16px" }}>
            {overBudget.map((c) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--red-bg)", fontSize: 14,
                }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--red)" }}>
                    {fmt(c.spent)} / {fmt(c.limit)} — over by {fmt(c.spent - c.limit)}
                  </div>
                </div>
                <span style={{
                  padding: "2px 8px", borderRadius: 999, background: "var(--red-bg)",
                  color: "var(--red)", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                }}>Over</span>
              </div>
            ))}
            {underBudget.map((c) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--green-bg)", fontSize: 14,
                }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--green)" }}>
                    {fmt(c.spent)} / {fmt(c.limit)} — {fmt(c.limit - c.spent)} under
                  </div>
                </div>
                <span style={{
                  padding: "2px 8px", borderRadius: 999, background: "var(--green-bg)",
                  color: "var(--green)", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                }}>Under</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Biggest Purchase ─── */}
      {current.biggestTx && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 12 }}>Biggest Purchase</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {(() => { const cat = categories.find((c) => c.id === current.biggestTx.categoryId); return cat ? cat.icon : "💳"; })()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{current.biggestTx.description}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {new Date(current.biggestTx.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {(() => { const cat = categories.find((c) => c.id === current.biggestTx.categoryId); return cat ? ` · ${cat.name}` : ""; })()}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(current.biggestTx.amount)}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MONTHLY SUMMARY PAGE
// ─────────────────────────────────────────────

function MonthlySummaryPage({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Filter transactions to viewed month
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthTx = transactions.filter((t) => t.date.startsWith(monthKey));
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

      {/* Allocation pie breakdown */}
      <Card>
        <CardHeader title="Where Your Money Went" />
        <div style={{ padding: "0 20px 20px" }}>
          {[
            { label: "Spending", amount: totalSpent, color: "var(--red)", pct: (totalSpent / totalIncome * 100) },
            { label: "Bills", amount: billsTotal, color: "var(--amber)", pct: (billsTotal / totalIncome * 100) },
            { label: "Savings", amount: savingsMonthly, color: "var(--accent)", pct: (savingsMonthly / totalIncome * 100) },
            { label: "Debt Payments", amount: debtPayments, color: "var(--red)", pct: (debtPayments / totalIncome * 100) },
            { label: surplus >= 0 ? "Surplus" : "Deficit", amount: Math.abs(surplus), color: surplus >= 0 ? "var(--green)" : "var(--red)", pct: (Math.abs(surplus) / totalIncome * 100) },
          ].filter((r) => r.amount > 0).map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(row.amount)}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 40, textAlign: "right" }}>{row.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────

function SettingsPage({ settings, setSettings, onExport, onImport, onReset, onRestartWizard }) {
  const fileRef = useRef(null);
  const hiddenPages = settings.hiddenPages || [];
  const dashWidgets = settings.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;

  const togglePage = (pageId) => {
    setSettings((s) => {
      const hidden = s.hiddenPages || [];
      return { ...s, hiddenPages: hidden.includes(pageId) ? hidden.filter((p) => p !== pageId) : [...hidden, pageId] };
    });
  };

  const toggleWidget = (widgetId) => {
    setSettings((s) => {
      const w = s.dashboardWidgets || DEFAULT_SETTINGS.dashboardWidgets;
      return { ...s, dashboardWidgets: w.includes(widgetId) ? w.filter((id) => id !== widgetId) : [...w, widgetId] };
    });
  };

  const toggleablePages = NAV_ITEMS.filter((p) => p.id !== "dashboard" && p.id !== "settings");

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Customize your experience</p>
      </div>

      {/* Household */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Household" />
        <div style={{ padding: "0 20px 20px" }}>
          <FieldLabel>Household Name</FieldLabel>
          <input value={settings.householdName} onChange={(e) => setSettings((s) => ({ ...s, householdName: e.target.value }))} style={INPUT_STYLE} />
        </div>
      </Card>

      {/* Appearance — Dark / Light toggle */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Appearance" />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { key: "dark", label: "Dark", icon: "🌙" },
              { key: "light", label: "Light", icon: "☀" },
            ].map((mode) => {
              const active = (settings.theme || "dark") === mode.key;
              return (
                <div key={mode.key} onClick={() => setSettings((s) => ({ ...s, theme: mode.key }))}
                  style={{
                    flex: 1, padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "10" : "var(--surface)",
                    transition: "all 0.15s", textAlign: "center",
                  }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{mode.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {mode.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Color Theme */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Color Theme" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Changes apply instantly</span>} />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {Object.entries(COLOR_THEMES).map(([key, theme]) => {
              const active = (settings.colorTheme || "blue_gold") === key;
              return (
                <div key={key} onClick={() => setSettings((s) => ({ ...s, colorTheme: key }))}
                  style={{
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent)" + "10" : "var(--surface)",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    {theme.preview.map((color, i) => (
                      <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: color, border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                    {theme.label}
                  </div>
                  {active && (
                    <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Page Visibility */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Pages" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Toggle pages on/off</span>} />
        <div style={{ padding: "0 12px 12px" }}>
          {toggleablePages.map((page) => {
            const enabled = !hiddenPages.includes(page.id);
            return (
              <div key={page.id} onClick={() => togglePage(page.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: enabled ? "transparent" : "var(--surface)",
                  opacity: enabled ? 1 : 0.5,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "flex", color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{page.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{page.label}</span>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 11, padding: 2,
                  background: enabled ? "var(--green)" : "var(--track)",
                  transition: "background 0.2s", display: "flex", alignItems: "center",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9, background: "#fff",
                    transition: "transform 0.2s", transform: enabled ? "translateX(18px)" : "translateX(0)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dashboard Widgets */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Dashboard Widgets" action={<span style={{ fontSize: 12, color: "var(--text-muted)" }}>Choose what shows on Dashboard</span>} />
        <div style={{ padding: "0 12px 12px" }}>
          {DASHBOARD_WIDGETS.map((widget) => {
            const enabled = dashWidgets.includes(widget.id);
            return (
              <div key={widget.id} onClick={() => toggleWidget(widget.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  opacity: enabled ? 1 : 0.5,
                }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{widget.label}</span>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: enabled ? "none" : "2px solid var(--border-hover)",
                  background: enabled ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {enabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Data Management" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onExport} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Data (JSON)
            </button>
            <button onClick={() => fileRef.current?.click()} style={{
              padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Data (JSON)
            </button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => { onImport(ev.target.result); };
              reader.readAsText(file);
              e.target.value = "";
            }} />
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Export saves all data as JSON. Import replaces all current data.</div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader title="Danger Zone" />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Restart Setup Wizard</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Clear your data and start fresh with the onboarding flow.</div>
              </div>
              <button onClick={onRestartWizard} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--accent)",
                background: "transparent", color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Restart</button>
            </div>
          </div>
          <div style={{ padding: "16px", borderRadius: 10, border: "1px solid var(--red)33", background: "var(--red-bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Reset All Data</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Restore default sample data. This cannot be undone.</div>
              </div>
              <button onClick={onReset} style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid var(--red)",
                background: "transparent", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Reset</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// RECURRING TRANSACTIONS PAGE (Auto-Spend)
// ─────────────────────────────────────────────

function RecurringTransactionsPage({ recurringTransactions, setRecurringTransactions, categories, transactions, setTransactions, showUndo }) {
  const [modal, setModal] = useState(null);

  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c.id] = c; });
    return map;
  }, [categories]);

  // Monthly cost equivalent
  const monthlyEquiv = (rt) => {
    switch (rt.frequency) {
      case "weekly": return rt.amount * 52 / 12;
      case "biweekly": return rt.amount * 26 / 12;
      case "monthly": return rt.amount;
      case "quarterly": return rt.amount / 3;
      case "yearly": return rt.amount / 12;
      default: return rt.amount;
    }
  };

  const activeTemplates = recurringTransactions.filter((rt) => rt.active);
  const inactiveTemplates = recurringTransactions.filter((rt) => !rt.active);
  const totalMonthly = activeTemplates.reduce((s, rt) => s + monthlyEquiv(rt), 0);
  const totalYearly = totalMonthly * 12;

  // Next occurrence for a template
  const getNextDate = (rt) => {
    const now = new Date();
    const anchor = new Date(rt.anchorDate + "T00:00:00");
    if (rt.frequency === "monthly") {
      const day = anchor.getDate();
      let next = new Date(now.getFullYear(), now.getMonth(), day);
      if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, day);
      return next;
    }
    if (rt.frequency === "weekly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getTime() + 7 * 86400000);
      return cur;
    }
    if (rt.frequency === "biweekly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getTime() + 14 * 86400000);
      return cur;
    }
    if (rt.frequency === "quarterly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getFullYear(), cur.getMonth() + 3, cur.getDate());
      return cur;
    }
    if (rt.frequency === "yearly") {
      let cur = new Date(anchor);
      while (cur <= now) cur = new Date(cur.getFullYear() + 1, cur.getMonth(), cur.getDate());
      return cur;
    }
    return now;
  };

  // Check if a recurring transaction has already been logged this period
  const isLoggedThisPeriod = (rt) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return transactions.some((t) =>
      t.categoryId === rt.categoryId &&
      t.description === rt.description &&
      Math.abs(t.amount - rt.amount) < 0.01 &&
      t.date.startsWith(monthKey)
    );
  };

  // Log a recurring transaction as a real transaction now
  const handleLogNow = (rt) => {
    const today = new Date().toISOString().split("T")[0];
    setTransactions((prev) => [...prev, {
      id: nextId(),
      categoryId: rt.categoryId,
      description: rt.description,
      amount: rt.amount,
      date: today,
    }]);
  };

  // Log all active un-logged templates at once
  const handleLogAll = () => {
    const today = new Date().toISOString().split("T")[0];
    const toLog = activeTemplates.filter((rt) => !isLoggedThisPeriod(rt));
    if (toLog.length === 0) return;
    setTransactions((prev) => [
      ...prev,
      ...toLog.map((rt) => ({
        id: nextId(),
        categoryId: rt.categoryId,
        description: rt.description,
        amount: rt.amount,
        date: today,
      })),
    ]);
  };

  const toggleActive = (id) => {
    setRecurringTransactions((prev) => prev.map((rt) => rt.id === id ? { ...rt, active: !rt.active } : rt));
  };

  const deleteTemplate = (id) => {
    const rt = recurringTransactions.find((r) => r.id === id);
    if (showUndo && rt) showUndo(`Deleted "${rt.description}"`);
    setRecurringTransactions((prev) => prev.filter((rt) => rt.id !== id));
  };

  const saveTemplate = (template) => {
    setRecurringTransactions((prev) => {
      const exists = prev.find((rt) => rt.id === template.id);
      if (exists) return prev.map((rt) => rt.id === template.id ? template : rt);
      return [...prev, template];
    });
    setModal(null);
  };

  const unloggedCount = activeTemplates.filter((rt) => !isLoggedThisPeriod(rt)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Recurring Transactions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Auto-log regular spending — subscriptions, memberships, and habits</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unloggedCount > 0 && (
            <button onClick={handleLogAll} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Log All ({unloggedCount})
            </button>
          )}
          <button onClick={() => setModal({ type: "add" })} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Add Template
          </button>
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <MetricBox label="Monthly Auto-Spend" value={fmt(totalMonthly)} sub={`${activeTemplates.length} active`} accent="var(--accent)" />
        <MetricBox label="Yearly Total" value={fmt(totalYearly)} sub="projected" accent="var(--text-secondary)" />
        <MetricBox label="Unlogged" value={unloggedCount} sub="this month" accent={unloggedCount > 0 ? "var(--amber)" : "var(--green)"} />
        <MetricBox label="Templates" value={recurringTransactions.length} sub={`${inactiveTemplates.length} paused`} accent="var(--text-muted)" />
      </div>

      {/* Active templates */}
      {activeTemplates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Active" action={
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{fmt(totalMonthly)}/mo</span>
          } />
          <div>
            {activeTemplates.map((rt) => {
              const cat = catMap[rt.categoryId];
              const logged = isLoggedThisPeriod(rt);
              const nextDate = getNextDate(rt);
              return (
                <SwipeToDelete key={rt.id} onDelete={() => deleteTemplate(rt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                    {/* Category icon */}
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cat?.icon || "●"}
                    </span>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rt.description}</span>
                        <FrequencyBadge frequency={rt.frequency} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {cat?.name || "Unknown"} · Next: {nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>

                    {/* Amount + actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(rt.amount)}</span>
                      {logged ? (
                        <span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--green-bg)", color: "var(--green)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Logged</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleLogNow(rt); }}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                          Log
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setModal({ type: "edit", template: rt }); }}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(rt.id); }}
                        style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Pause
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        </Card>
      )}

      {/* Inactive / Paused templates */}
      {inactiveTemplates.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Paused" />
          <div>
            {inactiveTemplates.map((rt) => {
              const cat = catMap[rt.categoryId];
              return (
                <SwipeToDelete key={rt.id} onDelete={() => deleteTemplate(rt.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", opacity: 0.5 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cat?.icon || "●"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{rt.description}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{cat?.name || "Unknown"} · {fmt(rt.amount)} · {FREQUENCY_LABELS[rt.frequency]}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(rt.id)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                        Resume
                      </button>
                      <button onClick={() => setModal({ type: "edit", template: rt })}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                        Edit
                      </button>
                    </div>
                  </div>
                </SwipeToDelete>
              );
            })}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {recurringTransactions.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>↻</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No recurring transactions yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 400, margin: "0 auto" }}>
            Add templates for subscriptions, memberships, and regular spending. Log them each month with one tap.
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {(modal?.type === "add" || modal?.type === "edit") && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={modal.type === "add" ? "Add Recurring Transaction" : "Edit Recurring Transaction"}>
            <RecurringTransactionFields
              categories={categories}
              existing={modal.type === "edit" ? modal.template : null}
              onSubmit={saveTemplate}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
    </div>
  );
}

function RecurringTransactionFields({ categories, existing, onSubmit, onClose }) {
  const [form, setForm] = useState({
    description: existing?.description || "",
    amount: existing ? String(existing.amount) : "",
    categoryId: existing?.categoryId || categories[0]?.id || "",
    frequency: existing?.frequency || "monthly",
    anchorDate: existing?.anchorDate || new Date().toISOString().split("T")[0],
    active: existing?.active ?? true,
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = form.description.trim() && parseFloat(form.amount) > 0 && form.categoryId && form.anchorDate;

  const handleSave = () => {
    if (!canSubmit) return;
    onSubmit({
      id: existing?.id || nextId(),
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      categoryId: form.categoryId,
      frequency: form.frequency,
      anchorDate: form.anchorDate,
      active: form.active,
    });
  };

  // Monthly equivalent preview
  const monthlyEq = (() => {
    const amt = parseFloat(form.amount) || 0;
    switch (form.frequency) {
      case "weekly": return amt * 52 / 12;
      case "biweekly": return amt * 26 / 12;
      case "monthly": return amt;
      case "quarterly": return amt / 3;
      case "yearly": return amt / 12;
      default: return amt;
    }
  })();

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <FieldLabel>Description</FieldLabel>
          <input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Netflix, Gym, Weekly groceries" style={INPUT_STYLE} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Amount ($)</FieldLabel>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Frequency</FieldLabel>
            <select value={form.frequency} onChange={(e) => update("frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <FieldLabel>Start Date</FieldLabel>
            <input type="date" value={form.anchorDate} onChange={(e) => update("anchorDate", e.target.value)} style={INPUT_STYLE} />
          </div>
        </div>
        {parseFloat(form.amount) > 0 && form.frequency !== "monthly" && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
            ≈ {fmt(monthlyEq)} per month · {fmt(monthlyEq * 12)} per year
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label={existing ? "Save" : "Add Template"} onSubmit={handleSave} />
    </>
  );
}

// ─────────────────────────────────────────────
// BUDGET TARGETS PAGE (YNAB-Style)
// ─────────────────────────────────────────────

const TARGET_TYPES = [
  { id: "monthly", label: "Monthly Limit", desc: "Spend up to this amount each month", icon: "📅" },
  { id: "target_by_date", label: "Target by Date", desc: "Save a total amount by a specific date", icon: "🎯" },
  { id: "weekly", label: "Weekly Limit", desc: "Spend up to this amount each week", icon: "🗓" },
];

function getTargetStatus(target, spent, category) {
  if (!target) {
    // Fallback to category limit
    const ratio = category.limit > 0 ? spent / category.limit : 0;
    return { monthlyNeeded: category.limit, progress: ratio, status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track", label: "Monthly Limit" };
  }

  const now = new Date();

  switch (target.type) {
    case "monthly": {
      const limit = target.monthlyAmount || category.limit;
      const ratio = limit > 0 ? spent / limit : 0;
      return {
        monthlyNeeded: limit,
        progress: ratio,
        status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track",
        label: "Monthly Limit",
        effectiveLimit: limit,
      };
    }
    case "target_by_date": {
      const funded = target.funded || 0;
      const goalAmt = target.targetAmount || 0;
      const deadline = new Date(target.targetDate + "T00:00:00");
      const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
      const remaining = Math.max(goalAmt - funded, 0);
      const monthlyNeeded = remaining / monthsLeft;
      const goalProgress = goalAmt > 0 ? funded / goalAmt : 0;
      const isPastDue = deadline < now;
      const isComplete = funded >= goalAmt;
      return {
        monthlyNeeded: Math.ceil(monthlyNeeded * 100) / 100,
        progress: goalProgress,
        status: isComplete ? "complete" : isPastDue ? "over" : goalProgress >= (1 - 1 / Math.max(monthsLeft, 1)) ? "on_track" : "behind",
        label: "Target by Date",
        effectiveLimit: monthlyNeeded,
        funded,
        goalAmt,
        deadline: target.targetDate,
        monthsLeft,
        remaining,
        isComplete,
      };
    }
    case "weekly": {
      const weeklyLimit = target.weeklyAmount || 0;
      const monthlyEquiv = weeklyLimit * 52 / 12;
      const ratio = monthlyEquiv > 0 ? spent / monthlyEquiv : 0;
      return {
        monthlyNeeded: monthlyEquiv,
        progress: ratio,
        status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track",
        label: "Weekly Limit",
        effectiveLimit: monthlyEquiv,
        weeklyAmount: weeklyLimit,
      };
    }
    default: {
      const limit = category.limit;
      const ratio = limit > 0 ? spent / limit : 0;
      return { monthlyNeeded: limit, progress: ratio, status: ratio >= 1 ? "over" : ratio >= 0.85 ? "warning" : "on_track", label: "Monthly Limit", effectiveLimit: limit };
    }
  }
}

function TargetStatusBadge({ status }) {
  const config = {
    on_track: { bg: "var(--green-bg)", fg: "var(--green)", text: "On Track" },
    warning: { bg: "var(--amber-bg)", fg: "var(--amber)", text: "Warning" },
    over: { bg: "var(--red-bg)", fg: "var(--red)", text: "Over" },
    behind: { bg: "var(--amber-bg)", fg: "var(--amber)", text: "Behind" },
    complete: { bg: "var(--green-bg)", fg: "var(--green)", text: "Complete" },
  }[status] || { bg: "var(--green-bg)", fg: "var(--green)", text: "OK" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999, background: config.bg, color: config.fg,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: config.fg }} />
      {config.text}
    </span>
  );
}

function EditTargetFields({ category, target, onSubmit, onClose }) {
  const existing = target || { type: "monthly", monthlyAmount: category.limit };
  const [type, setType] = useState(existing.type || "monthly");
  const [monthlyAmount, setMonthlyAmount] = useState(String(existing.monthlyAmount || category.limit || ""));
  const [targetAmount, setTargetAmount] = useState(String(existing.targetAmount || ""));
  const [targetDate, setTargetDate] = useState(existing.targetDate || "2026-12-31");
  const [funded, setFunded] = useState(String(existing.funded || "0"));
  const [weeklyAmount, setWeeklyAmount] = useState(String(existing.weeklyAmount || ""));

  const canSubmit = (() => {
    if (type === "monthly") return parseFloat(monthlyAmount) > 0;
    if (type === "target_by_date") return parseFloat(targetAmount) > 0 && targetDate;
    if (type === "weekly") return parseFloat(weeklyAmount) > 0;
    return false;
  })();

  const handleSave = () => {
    if (!canSubmit) return;
    let result;
    switch (type) {
      case "monthly":
        result = { type: "monthly", monthlyAmount: parseFloat(monthlyAmount) };
        break;
      case "target_by_date":
        result = { type: "target_by_date", targetAmount: parseFloat(targetAmount), targetDate, funded: parseFloat(funded) || 0 };
        break;
      case "weekly":
        result = { type: "weekly", weeklyAmount: parseFloat(weeklyAmount) };
        break;
      default: return;
    }
    onSubmit(category.id, result);
  };

  // Calculate preview for target_by_date
  const previewMonthly = (() => {
    if (type !== "target_by_date") return null;
    const goal = parseFloat(targetAmount) || 0;
    const f = parseFloat(funded) || 0;
    const deadline = new Date(targetDate + "T00:00:00");
    const now = new Date();
    const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
    const remaining = Math.max(goal - f, 0);
    return { monthlyNeeded: remaining / monthsLeft, monthsLeft, remaining };
  })();

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Type selector */}
        <div>
          <FieldLabel>Target Type</FieldLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {TARGET_TYPES.map((tt) => (
              <div key={tt.id} onClick={() => setType(tt.id)}
                style={{
                  padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${type === tt.id ? "var(--accent)" : "var(--border)"}`,
                  background: type === tt.id ? "var(--accent)" + "10" : "transparent",
                  transition: "all 0.15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{tt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: type === tt.id ? "var(--text-primary)" : "var(--text-secondary)" }}>{tt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tt.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields based on type */}
        {type === "monthly" && (
          <div>
            <FieldLabel>Monthly Limit ($)</FieldLabel>
            <input type="number" step="1" min="0" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
          </div>
        )}

        {type === "target_by_date" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <FieldLabel>Target Amount ($)</FieldLabel>
                <input type="number" step="1" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
              </div>
              <div>
                <FieldLabel>Target Date</FieldLabel>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
            <div>
              <FieldLabel>Already Funded ($)</FieldLabel>
              <input type="number" step="1" min="0" value={funded} onChange={(e) => setFunded(e.target.value)} placeholder="0" style={INPUT_STYLE} />
            </div>
            {previewMonthly && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>To reach your goal:</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                    {fmt(previewMonthly.monthlyNeeded)}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>/mo</span>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {fmt(previewMonthly.remaining)} left · {previewMonthly.monthsLeft} month{previewMonthly.monthsLeft !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {type === "weekly" && (
          <div>
            <FieldLabel>Weekly Limit ($)</FieldLabel>
            <input type="number" step="1" min="0" value={weeklyAmount} onChange={(e) => setWeeklyAmount(e.target.value)} placeholder="0" style={INPUT_STYLE} />
            {parseFloat(weeklyAmount) > 0 && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                ≈ {fmt(parseFloat(weeklyAmount) * 52 / 12)} per month
              </div>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Save Target" onSubmit={handleSave} />
    </>
  );
}

function FundTargetFields({ category, target, onSubmit, onClose }) {
  const [amount, setAmount] = useState("");
  const remaining = (target?.targetAmount || 0) - (target?.funded || 0);
  const canSubmit = parseFloat(amount) > 0;
  const quickAmounts = [25, 50, 100, 250].filter((a) => a <= remaining + 10);

  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Progress</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(target?.funded || 0)} of {fmt(target?.targetAmount || 0)}
            </span>
          </div>
          <ProgressBar value={target?.funded || 0} max={target?.targetAmount || 1} color="var(--accent)" height={6} />
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            {fmt(remaining)} remaining
          </div>
        </div>
        <div>
          <FieldLabel>Fund Amount ($)</FieldLabel>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={INPUT_STYLE} />
        </div>
        {quickAmounts.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            {quickAmounts.map((qa) => (
              <button key={qa} onClick={() => setAmount(String(qa))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === qa ? "var(--accent)" : "transparent",
                  color: parseFloat(amount) === qa ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                ${qa}
              </button>
            ))}
            {remaining > 0 && (
              <button onClick={() => setAmount(String(remaining))}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: "1px solid var(--border)", background: parseFloat(amount) === remaining ? "var(--green)" : "transparent",
                  color: parseFloat(amount) === remaining ? "#fff" : "var(--text-secondary)", transition: "all 0.15s",
                }}>
                Fill
              </button>
            )}
          </div>
        )}
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Funds"
        onSubmit={() => { if (canSubmit) onSubmit(category.id, parseFloat(amount)); }} />
    </>
  );
}

// ─────────────────────────────────────────────
// BUDGET PAGE
// ─────────────────────────────────────────────

function CategoryCard({ category, transactions, onExpand, isExpanded, onEditTarget, onFundTarget, target, rollover }) {
  const spent = transactions.reduce((s, t) => s + t.amount, 0);
  const tStatus = getTargetStatus(target, spent, category);
  const isTargetByDate = target?.type === "target_by_date";
  const isWeekly = target?.type === "weekly";
  const baseLimit = tStatus.effectiveLimit || tStatus.monthlyNeeded || category.limit;
  const effectiveLimit = baseLimit + (rollover || 0);
  const diff = isTargetByDate ? (tStatus.goalAmt || 0) - (tStatus.funded || 0) : effectiveLimit - spent;

  return (
    <div
      style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", transition: "box-shadow 0.2s, border-color 0.2s", cursor: "pointer",
      }}
      onClick={() => onExpand(isExpanded ? null : category.id)}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.boxShadow = "0 2px 12px var(--shadow)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--icon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{category.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{category.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                {TARGET_TYPES.find((t) => t.id === (target?.type || "monthly"))?.icon || "📅"}{" "}
                {tStatus.label}
                {isWeekly && ` · ${fmt(tStatus.weeklyAmount)}/wk`}
                {!isTargetByDate && ` · ${transactions.length} txn${transactions.length !== 1 ? "s" : ""}`}
              </div>
            </div>
          </div>
          <TargetStatusBadge status={tStatus.status} />
        </div>

        {isTargetByDate ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(tStatus.funded || 0)}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>of {fmt(tStatus.goalAmt)}</span>
            </div>
            <ProgressBar value={tStatus.funded || 0} max={tStatus.goalAmt || 1} color="var(--accent)" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
              <span style={{ color: tStatus.isComplete ? "var(--green)" : "var(--amber)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {tStatus.isComplete ? "Goal reached!" : `${fmt(tStatus.remaining)} to go · ${fmt(tStatus.monthlyNeeded)}/mo`}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                {!tStatus.isComplete && `${tStatus.monthsLeft}mo left`}
              </span>
            </div>
            {!tStatus.isComplete && tStatus.deadline && (
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                Due {new Date(tStatus.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(spent)}</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>of {fmt(effectiveLimit)}</span>
                {rollover > 0 && (
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>
                    +{fmt(rollover)} rolled over
                  </div>
                )}
              </div>
            </div>
            <ProgressBar value={spent} max={effectiveLimit} />
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: tStatus.status === "on_track" || tStatus.status === "complete" ? "var(--green)" : tStatus.status === "warning" || tStatus.status === "behind" ? "var(--amber)" : "var(--red)" }}>
              {diff >= 0 ? `${fmt(diff)} remaining` : `${fmt(Math.abs(diff))} over budget`}
            </div>
          </>
        )}
      </div>

      {isExpanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", maxHeight: 360, overflowY: "auto" }}>
          <div style={{ padding: "8px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Transactions</span>
            <div style={{ display: "flex", gap: 6 }}>
              {isTargetByDate && !tStatus.isComplete && (
                <button onClick={(e) => { e.stopPropagation(); onFundTarget(category); }}
                  style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                  + Fund
                </button>
              )}
              <button onClick={(e) => { e.stopPropagation(); onEditTarget(category); }}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
                Edit Target
              </button>
            </div>
          </div>
          {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{t.description}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{new Date(t.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{fmt(t.amount)}</div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No transactions yet</div>}
        </div>
      )}
    </div>
  );
}

function BudgetPage({ categories, transactions, setCategories, setTransactions, income, budgetTargets, setBudgetTargets, budgetRollovers, setBudgetRollovers, showUndo }) {
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [sortBy, setSortBy] = useState("status");
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthName = prevMonthDate.toLocaleDateString("en-US", { month: "long" });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Filter transactions to viewed month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date.startsWith(currentMonthKey));
  }, [transactions, currentMonthKey]);

  const txByCategory = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = []));
    monthTransactions.forEach((t) => { if (map[t.categoryId]) map[t.categoryId].push(t); });
    return map;
  }, [categories, monthTransactions]);

  // Current month's rollovers (carried from previous month)
  const currentRollovers = budgetRollovers[currentMonthKey] || {};
  const totalRolledOver = Object.values(currentRollovers).reduce((s, v) => s + v, 0);

  // Calculate what COULD be rolled over from previous month (unspent budget)
  const prevMonthUnspent = useMemo(() => {
    const unspent = {};
    let totalAvailable = 0;
    categories.forEach((c) => {
      const target = budgetTargets[c.id];
      if (target?.type === "target_by_date") return; // don't roll over date targets
      const spent = (txByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
      const tStatus = getTargetStatus(target, spent, c);
      const limit = tStatus.effectiveLimit || tStatus.monthlyNeeded || c.limit;
      const remaining = limit - spent;
      if (remaining > 0) {
        unspent[c.id] = Math.round(remaining * 100) / 100;
        totalAvailable += remaining;
      }
    });
    return { byCat: unspent, total: totalAvailable };
  }, [categories, txByCategory, budgetTargets]);

  // Has rollover already been applied this month?
  const rolloverApplied = Object.keys(currentRollovers).length > 0;

  const handleApplyRollovers = () => {
    setBudgetRollovers((prev) => ({ ...prev, [currentMonthKey]: prevMonthUnspent.byCat }));
  };

  const handleClearRollovers = () => {
    setBudgetRollovers((prev) => {
      const next = { ...prev };
      delete next[currentMonthKey];
      return next;
    });
  };

  const sortedCategories = useMemo(() => {
    const arr = [...categories];
    if (sortBy === "name") return arr.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "spent") return arr.sort((a, b) => (txByCategory[b.id]?.reduce((s, t) => s + t.amount, 0) || 0) - (txByCategory[a.id]?.reduce((s, t) => s + t.amount, 0) || 0));
    return arr.sort((a, b) => {
      const spentA = txByCategory[a.id]?.reduce((s, t) => s + t.amount, 0) || 0;
      const spentB = txByCategory[b.id]?.reduce((s, t) => s + t.amount, 0) || 0;
      const limA = getTargetStatus(budgetTargets[a.id], spentA, a).effectiveLimit || a.limit;
      const limB = getTargetStatus(budgetTargets[b.id], spentB, b).effectiveLimit || b.limit;
      return (spentB / limB) - (spentA / limA);
    });
  }, [categories, sortBy, txByCategory, budgetTargets]);

  // Income-aware calculations
  const totalIncome = income.reduce((s, i) => {
    if (!i.recurring) return s + i.amount;
    switch (i.frequency) {
      case "weekly": return s + i.amount * 52 / 12;
      case "biweekly": return s + i.amount * 26 / 12;
      case "semimonthly": return s + i.amount;
      case "monthly": return s + i.amount;
      case "quarterly": return s + i.amount / 3;
      case "yearly": return s + i.amount / 12;
      default: return s + i.amount;
    }
  }, 0);

  // Use target-aware totals (including rollovers)
  const totalBudgeted = categories.reduce((s, c) => {
    const spent = (txByCategory[c.id] || []).reduce((sum, t) => sum + t.amount, 0);
    const ts = getTargetStatus(budgetTargets[c.id], spent, c);
    const base = ts.effectiveLimit || ts.monthlyNeeded || c.limit;
    const ro = currentRollovers[c.id] || 0;
    return s + base + ro;
  }, 0);
  const totalSpent = monthTransactions.reduce((s, t) => s + t.amount, 0);
  const unbudgeted = totalIncome - totalBudgeted + totalRolledOver;
  const overCount = categories.filter((c) => {
    const spent = (txByCategory[c.id] || []).reduce((s, t) => s + t.amount, 0);
    const ts = getTargetStatus(budgetTargets[c.id], spent, c);
    const limit = (ts.effectiveLimit || ts.monthlyNeeded || c.limit) + (currentRollovers[c.id] || 0);
    return spent > limit;
  }).length;
  const targetByDateCount = categories.filter((c) => budgetTargets[c.id]?.type === "target_by_date").length;
  const rolloverCatCount = Object.keys(currentRollovers).filter((k) => currentRollovers[k] > 0).length;

  const handleSaveTarget = (catId, targetData) => {
    setBudgetTargets((prev) => ({ ...prev, [catId]: targetData }));
    // Also sync the category limit for backward compatibility
    if (targetData.type === "monthly") {
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, limit: targetData.monthlyAmount } : c));
    } else if (targetData.type === "weekly") {
      setCategories((prev) => prev.map((c) => c.id === catId ? { ...c, limit: Math.round(targetData.weeklyAmount * 52 / 12) } : c));
    }
    setModal(null);
  };

  const handleFund = (catId, amount) => {
    setBudgetTargets((prev) => {
      const existing = prev[catId];
      if (!existing || existing.type !== "target_by_date") return prev;
      return { ...prev, [catId]: { ...existing, funded: (existing.funded || 0) + amount } };
    });
    setModal(null);
  };

  const pillStyle = (active) => ({
    padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)",
    background: active ? "var(--text-primary)" : "transparent",
    color: active ? "var(--card)" : "var(--text-muted)",
    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Budget Tracker</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            {targetByDateCount > 0 ? `${targetByDateCount} date target${targetByDateCount > 1 ? "s" : ""}` : "Track spending by category"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModal("addCat")} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Category</button>
          <button onClick={() => setModal("addTx")} style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Transaction</button>
        </div>
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Income vs Budget bar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Income vs Budget</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
              {fmt(totalBudgeted)} budgeted of {fmt(totalIncome)} income
            </span>
          </div>
          <div style={{ position: "relative", height: 12, borderRadius: 6, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.min((totalBudgeted / totalIncome) * 100, 100)}%`, background: totalBudgeted > totalIncome ? "var(--red)" : "var(--accent)", borderRadius: 6, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.min((totalSpent / totalIncome) * 100, 100)}%`, background: "var(--green)", borderRadius: 6, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)", opacity: 0.6 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", opacity: 0.6 }} />Spent {fmt(totalSpent)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />Budgeted {fmt(totalBudgeted)}</span>
            </div>
            <span style={{ fontWeight: 600, color: unbudgeted >= 0 ? "var(--green)" : "var(--red)" }}>
              {unbudgeted >= 0 ? `${fmt(unbudgeted)} unbudgeted` : `${fmt(Math.abs(unbudgeted))} over income`}
            </span>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricBox label="Monthly Income" value={fmt(totalIncome)} sub={`${income.length} sources`} accent="var(--green)" />
        <MetricBox label="Total Budgeted" value={fmt(totalBudgeted)} sub={`${categories.length} categories`} accent="var(--accent)" />
        <MetricBox label="Total Spent" value={fmt(totalSpent)} sub={`${pct(totalSpent, totalBudgeted).toFixed(0)}% of budget`} accent="var(--red)" />
        <MetricBox label="Unbudgeted" value={fmt(Math.abs(unbudgeted))} sub={unbudgeted >= 0 ? "available to assign" : "over income"} accent={unbudgeted >= 0 ? "var(--green)" : "var(--red)"} />
        <MetricBox label="Categories Over" value={overCount} sub={overCount === 0 ? "all on track" : "need attention"} accent={overCount > 0 ? "var(--red)" : "var(--green)"} />
      </div>

      {/* Budget Rollover Card */}
      {(prevMonthUnspent.total > 0 || rolloverApplied) && (
        <Card style={{ marginBottom: 20, borderColor: rolloverApplied ? "var(--accent)" : "var(--border)" }}>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rolloverApplied ? 12 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: rolloverApplied ? "var(--accent)" + "18" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {rolloverApplied ? "✓" : "↻"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {rolloverApplied ? "Rollovers Applied" : "Roll Over Unspent Budget"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {rolloverApplied
                      ? `${fmt(totalRolledOver)} carried forward across ${rolloverCatCount} categor${rolloverCatCount === 1 ? "y" : "ies"}`
                      : `${fmt(prevMonthUnspent.total)} unspent from ${prevMonthName} available to roll forward`
                    }
                  </div>
                </div>
              </div>
              {rolloverApplied ? (
                <button onClick={handleClearRollovers}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Undo
                </button>
              ) : (
                <button onClick={handleApplyRollovers}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Roll Over
                </button>
              )}
            </div>

            {/* Per-category rollover detail (only show when applied) */}
            {rolloverApplied && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.filter((c) => (currentRollovers[c.id] || 0) > 0).map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 12, color: "var(--text-secondary)",
                    }}>
                      <span>{c.icon}</span>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>+{fmt(currentRollovers[c.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview of what will roll over (before applying) */}
            {!rolloverApplied && prevMonthUnspent.total > 0 && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
                  Unspent by Category
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.filter((c) => (prevMonthUnspent.byCat[c.id] || 0) > 0).map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                      borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)",
                      fontSize: 12, color: "var(--text-secondary)",
                    }}>
                      <span>{c.icon}</span>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{fmt(prevMonthUnspent.byCat[c.id])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ key: "status", label: "By Status" }, { key: "spent", label: "By Spent" }, { key: "name", label: "By Name" }].map((s) => (
          <button key={s.key} onClick={() => setSortBy(s.key)} style={pillStyle(sortBy === s.key)}>{s.label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {sortedCategories.map((cat) => (
          <SwipeToDelete key={cat.id} onDelete={() => { showUndo(`Deleted "${cat.name}" category`); setCategories((prev) => prev.filter((c) => c.id !== cat.id)); }}>
            <CategoryCard category={cat} transactions={txByCategory[cat.id] || []}
              target={budgetTargets[cat.id] || null}
              rollover={currentRollovers[cat.id] || 0}
              isExpanded={expandedId === cat.id} onExpand={setExpandedId}
              onEditTarget={(c) => setModal({ type: "editTarget", category: c })}
              onFundTarget={(c) => setModal({ type: "fund", category: c })}
            />
          </SwipeToDelete>
        ))}
      </div>

      {modal === "addTx" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title="Add Transaction">
            <AddTransactionFields categories={categories} onSubmit={(tx) => { setTransactions((p) => [...p, tx]); setModal(null); }} onClose={() => setModal(null)} />
          </ModalForm>
        </Overlay>
      )}
      {modal === "addCat" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title="Add Category">
            <AddCategoryFields onSubmit={(cat) => { setCategories((p) => [...p, cat]); setModal(null); }} onClose={() => setModal(null)} />
          </ModalForm>
        </Overlay>
      )}
      {modal?.type === "editTarget" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`${modal.category.icon} ${modal.category.name} — Set Target`}>
            <EditTargetFields
              category={modal.category}
              target={budgetTargets[modal.category.id]}
              onSubmit={handleSaveTarget}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}
      {modal?.type === "fund" && (
        <Overlay onClose={() => setModal(null)}>
          <ModalForm title={`${modal.category.icon} ${modal.category.name} — Add Funds`}>
            <FundTargetFields
              category={modal.category}
              target={budgetTargets[modal.category.id]}
              onSubmit={handleFund}
              onClose={() => setModal(null)}
            />
          </ModalForm>
        </Overlay>
      )}

      {/* Target type legend */}
      <div style={{ marginTop: 20, padding: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          {TARGET_TYPES.map((tt) => (
            <div key={tt.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
              <span>{tt.icon}</span>
              <span>{tt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL FORM COMPONENTS
// ─────────────────────────────────────────────

function ModalForm({ title, children }) {
  return (
    <>
      <div style={{ padding: "24px 24px 8px" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      {children}
    </>
  );
}

function ModalActions({ onClose, onSubmit, canSubmit, label = "Save" }) {
  return (
    <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
      <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      <button onClick={onSubmit} disabled={!canSubmit}
        style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: canSubmit ? "var(--accent)" : "var(--border)", color: canSubmit ? "#fff" : "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}>
        {label}
      </button>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>{children}</label>;
}

function AddTransactionFields({ categories, onSubmit, onClose }) {
  const [form, setForm] = useState({ categoryId: categories[0]?.id || "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.categoryId && form.description.trim() && parseFloat(form.amount) > 0 && form.date;
  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><FieldLabel>Category</FieldLabel><select value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
        <div><FieldLabel>Description</FieldLabel><input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Grocery store run" style={INPUT_STYLE} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><FieldLabel>Amount</FieldLabel><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0.00" style={INPUT_STYLE} /></div>
          <div><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={INPUT_STYLE} /></div>
        </div>
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Transaction"
        onSubmit={() => { if (canSubmit) onSubmit({ id: nextId(), categoryId: form.categoryId, description: form.description.trim(), amount: parseFloat(form.amount), date: form.date }); }} />
    </>
  );
}

function AddCategoryFields({ onSubmit, onClose }) {
  const [form, setForm] = useState({ name: "", icon: "●", limit: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name.trim() && parseFloat(form.limit) > 0;
  return (
    <>
      <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12 }}>
          <div><FieldLabel>Icon</FieldLabel><input value={form.icon} onChange={(e) => update("icon", e.target.value)} maxLength={2} style={{ ...INPUT_STYLE, textAlign: "center", fontSize: 18 }} /></div>
          <div><FieldLabel>Name</FieldLabel><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Subscriptions" style={INPUT_STYLE} /></div>
        </div>
        <div><FieldLabel>Monthly Limit ($)</FieldLabel><input type="number" step="1" min="0" value={form.limit} onChange={(e) => update("limit", e.target.value)} placeholder="0" style={INPUT_STYLE} /></div>
      </div>
      <ModalActions onClose={onClose} canSubmit={canSubmit} label="Add Category"
        onSubmit={() => { if (canSubmit) onSubmit({ id: form.name.toLowerCase().replace(/\s+/g, "-"), name: form.name.trim(), icon: form.icon || "●", limit: parseFloat(form.limit) }); }} />
    </>
  );
}

function EditLimitFields({ category, onSubmit, onClose }) {
  const [limit, setLimit] = useState(String(category.limit));
  const valid = parseFloat(limit) > 0;
  return (
    <>
      <div style={{ padding: "16px 24px" }}>
        <FieldLabel>Monthly Limit ($)</FieldLabel>
        <input type="number" step="1" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} style={INPUT_STYLE} />
      </div>
      <ModalActions onClose={onClose} canSubmit={valid} label="Save"
        onSubmit={() => { if (valid) onSubmit(category.id, parseFloat(limit)); }} />
    </>
  );
}

// ─────────────────────────────────────────────
// PWA HEAD (App Icon for Home Screen)
// ─────────────────────────────────────────────

function generateAppIcon(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  // Green background with rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0); ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r); ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size); ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "#1e40af";
  ctx.fill();
  // Money bag emoji
  ctx.font = `${size * 0.55}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("💰", size / 2, size / 2 + size * 0.03);
  return canvas.toDataURL("image/png");
}

function PwaHead() {
  useEffect(() => {
    // Generate icon
    const iconUrl = generateAppIcon(512);
    const iconUrl192 = generateAppIcon(192);

    // Apple touch icon
    let appleLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!appleLink) { appleLink = document.createElement("link"); appleLink.rel = "apple-touch-icon"; document.head.appendChild(appleLink); }
    appleLink.href = iconUrl;

    // Favicon
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) { favicon = document.createElement("link"); favicon.rel = "icon"; document.head.appendChild(favicon); }
    favicon.href = iconUrl192;

    // Theme color
    let theme = document.querySelector('meta[name="theme-color"]');
    if (!theme) { theme = document.createElement("meta"); theme.name = "theme-color"; document.head.appendChild(theme); }
    theme.content = "#1e40af";

    // Apple mobile web app capable
    let capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!capable) { capable = document.createElement("meta"); capable.name = "apple-mobile-web-app-capable"; capable.content = "yes"; document.head.appendChild(capable); }

    // Apple status bar
    let statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBar) { statusBar = document.createElement("meta"); statusBar.name = "apple-mobile-web-app-status-bar-style"; statusBar.content = "black-translucent"; document.head.appendChild(statusBar); }

    // Title
    document.title = "MaverickOS";

    // Web app manifest (inline as data URI)
    const manifest = {
      name: "MaverickOS",
      short_name: "MaverickOS",
      start_url: "/",
      display: "standalone",
      background_color: "#0c0c0e",
      theme_color: "#1e40af",
      icons: [
        { src: iconUrl192, sizes: "192x192", type: "image/png" },
        { src: iconUrl, sizes: "512x512", type: "image/png" },
      ],
    };
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement("link"); manifestLink.rel = "manifest"; document.head.appendChild(manifestLink); }
    manifestLink.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(manifest));
  }, []);

  return null;
}

// ─────────────────────────────────────────────
// ONBOARDING WIZARD
// ─────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome to MaverickOS", icon: "💰" },
  { id: "income", title: "Your Income", icon: "💼" },
  { id: "bills", title: "Monthly Bills", icon: "📋" },
  { id: "finances", title: "Debts & Savings", icon: "🏦" },
  { id: "theme", title: "Make It Yours", icon: "🎨" },
];

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    householdName: "",
    incomeStreams: [{ id: 1, source: "", amount: "", frequency: "semimonthly" }],
    bills: [{ id: 1, name: "", amount: "", frequency: "monthly" }],
    debts: [{ id: 1, name: "", balance: "", minPayment: "", apr: "" }],
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
    // Build real data from wizard inputs
    const incomes = data.incomeStreams
      .filter((s) => s.source.trim() && parseFloat(s.amount) > 0)
      .map((s, i) => ({ id: i + 1, source: s.source.trim(), amount: parseFloat(s.amount), date: new Date().toISOString().split("T")[0], recurring: true, frequency: s.frequency, category: "employment", icon: "💼" }));

    const bills = data.bills
      .filter((b) => b.name.trim() && parseFloat(b.amount) > 0)
      .map((b, i) => ({ id: i + 1, name: b.name.trim(), amount: parseFloat(b.amount), anchorDate: new Date().toISOString().split("T")[0], recurring: true, frequency: b.frequency }));

    const debts = data.debts
      .filter((d) => d.name.trim() && parseFloat(d.balance) > 0)
      .map((d, i) => ({ id: i + 1, name: d.name.trim(), balance: parseFloat(d.balance), originalBalance: parseFloat(d.balance), minPayment: parseFloat(d.minPayment) || 0, apr: parseFloat(d.apr) || 0, icon: "💳", lender: "", startDate: new Date().toISOString().split("T")[0], payments: [] }));

    const assets = [];
    if (parseFloat(data.checkingBalance) > 0) assets.push({ id: 1, name: "Checking Account", value: parseFloat(data.checkingBalance), category: "cash", icon: "🏦" });
    if (parseFloat(data.savingsBalance) > 0) assets.push({ id: 2, name: "Savings Account", value: parseFloat(data.savingsBalance), category: "cash", icon: "💰" });

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
      billTemplates: bills.length > 0 ? bills : INITIAL_BILL_TEMPLATES,
      debts: debts.length > 0 ? debts : INITIAL_DEBTS,
      assets: assets.length > 0 ? assets : INITIAL_ASSETS,
      savingsGoals: savingsGoals.length > 0 ? savingsGoals : INITIAL_SAVINGS_GOALS,
      categories: INITIAL_CATEGORIES,
      transactions: [],
      paidDates: new Set(),
      settings: newSettings,
    });
  };

  // Get active theme for preview
  const previewTheme = COLOR_THEMES[data.colorTheme] || COLOR_THEMES.blue_gold;
  const previewVars = data.theme === "light" ? previewTheme.light : previewTheme.dark;

  return (
    <div style={{
      ...previewVars,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 520 }}>
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
                  <div key={s.id} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      {s.id === 1 && <FieldLabel>Source</FieldLabel>}
                      <input value={s.source} onChange={(e) => updateListItem("incomeStreams", s.id, "source", e.target.value)} placeholder="e.g. My Salary" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {s.id === 1 && <FieldLabel>Amount</FieldLabel>}
                      <input type="number" step="0.01" min="0" value={s.amount} onChange={(e) => updateListItem("incomeStreams", s.id, "amount", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {s.id === 1 && <FieldLabel>Frequency</FieldLabel>}
                      <select value={s.frequency} onChange={(e) => updateListItem("incomeStreams", s.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="semimonthly">1st & 15th</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    {data.incomeStreams.length > 1 && (
                      <button onClick={() => removeListItem("incomeStreams", s.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem("incomeStreams", { source: "", amount: "", frequency: "semimonthly" })}
                  style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Another Income
                </button>
              </div>
            )}

            {/* STEP 2: Bills */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>What are your regular monthly bills? Don't worry about getting them all — add more anytime.</div>
                {data.bills.map((b) => (
                  <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      {b.id === 1 && <FieldLabel>Bill Name</FieldLabel>}
                      <input value={b.name} onChange={(e) => updateListItem("bills", b.id, "name", e.target.value)} placeholder="e.g. Rent, Electric" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {b.id === 1 && <FieldLabel>Amount</FieldLabel>}
                      <input type="number" step="0.01" min="0" value={b.amount} onChange={(e) => updateListItem("bills", b.id, "amount", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {b.id === 1 && <FieldLabel>Frequency</FieldLabel>}
                      <select value={b.frequency} onChange={(e) => updateListItem("bills", b.id, "frequency", e.target.value)} style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                        <option value="monthly">Monthly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {data.bills.length > 1 && (
                      <button onClick={() => removeListItem("bills", b.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => addListItem("bills", { name: "", amount: "", frequency: "monthly" })}
                  style={{ padding: "8px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  + Add Another Bill
                </button>
              </div>
            )}

            {/* STEP 3: Debts & Savings */}
            {step === 3 && (
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
                    <div key={d.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                      <div style={{ flex: 2 }}>
                        {d.id === 1 && <FieldLabel>Name</FieldLabel>}
                        <input value={d.name} onChange={(e) => updateListItem("debts", d.id, "name", e.target.value)} placeholder="e.g. Credit Card" style={INPUT_STYLE} />
                      </div>
                      <div style={{ flex: 1 }}>
                        {d.id === 1 && <FieldLabel>Balance</FieldLabel>}
                        <input type="number" step="0.01" min="0" value={d.balance} onChange={(e) => updateListItem("debts", d.id, "balance", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                      </div>
                      <div style={{ flex: 1 }}>
                        {d.id === 1 && <FieldLabel>Min Pmt</FieldLabel>}
                        <input type="number" step="0.01" min="0" value={d.minPayment} onChange={(e) => updateListItem("debts", d.id, "minPayment", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                      </div>
                      <div style={{ flex: 0.7 }}>
                        {d.id === 1 && <FieldLabel>APR %</FieldLabel>}
                        <input type="number" step="0.1" min="0" value={d.apr} onChange={(e) => updateListItem("debts", d.id, "apr", e.target.value)} placeholder="0" style={INPUT_STYLE} />
                      </div>
                      {data.debts.length > 1 && (
                        <button onClick={() => removeListItem("debts", d.id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px 0", fontSize: 18 }}>×</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addListItem("debts", { name: "", balance: "", minPayment: "", apr: "" })}
                    style={{ padding: "6px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                    + Add Debt
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Theme */}
            {step === 4 && (
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

export default function MaverickOS() {
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [undoToast, setUndoToast] = useState(null); // { message, snapshot }
  const isMobile = useIsMobile();

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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Undo system — snapshot current state before destructive actions
  const takeSnapshot = useCallback(() => ({
    categories, transactions, income, billTemplates, paidDates, savingsGoals,
    debts, assets, paycheckStreams, customItems, monthlyRollovers,
    budgetRollovers, budgetTargets, recurringTransactions, settings,
  }), [categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, settings]);

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

  // Load from localStorage on mount — show onboarding if no saved data
  useEffect(() => {
    const saved = loadState();
    if (!saved) {
      setShowOnboarding(true);
      setLoaded(true);
      return;
    }
    if (saved) {
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
      if (saved.settings) setSettings(saved.settings);
      seedNextId(saved);
    }
    setLoaded(true);
  }, []);

  // Save to localStorage whenever state changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    saveState({ categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, settings });
  }, [loaded, categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, settings]);

  // Export all data as JSON download
  const handleExport = useCallback(() => {
    const data = { categories, transactions, income, billTemplates, paidDates: [...paidDates], savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `maverickos-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [categories, transactions, income, billTemplates, paidDates, savingsGoals, debts, assets, paycheckStreams, customItems, monthlyRollovers, budgetRollovers, budgetTargets, recurringTransactions, settings]);

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
      if (data.settings) setSettings(data.settings);
    } catch {}
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setCategories(INITIAL_CATEGORIES); setTransactions(INITIAL_TRANSACTIONS);
    setIncome(INITIAL_INCOME); setBillTemplates(INITIAL_BILL_TEMPLATES);
    setPaidDates(INITIAL_PAID_DATES); setSavingsGoals(INITIAL_SAVINGS_GOALS);
    setDebts(INITIAL_DEBTS); setAssets(INITIAL_ASSETS);
    setPaycheckStreams(INITIAL_PAYCHECK_STREAMS); setCustomItems(INITIAL_CUSTOM_ITEMS);
    setMonthlyRollovers({}); setBudgetRollovers({}); setBudgetTargets(INITIAL_BUDGET_TARGETS); setRecurringTransactions(INITIAL_RECURRING_TRANSACTIONS); setSettings(DEFAULT_SETTINGS);
    clearState();
  }, []);

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
      setBudgetTargets({});
      setRecurringTransactions([]);
    }

    setShowOnboarding(false);
  }, []);

  // Get active color theme and mode
  const activeTheme = COLOR_THEMES[settings.colorTheme] || COLOR_THEMES.blue_gold;
  const isDark = settings.theme !== "light";
  const themeVars = isDark ? activeTheme.dark : activeTheme.light;

  // Show onboarding wizard for first-time users
  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{
      ...themeVars,
      fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      display: "flex", minHeight: "100vh", boxSizing: "border-box",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <PwaHead />
      <ResponsiveStyles />

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
              savingsGoals={savingsGoals} debts={debts} assets={assets} settings={settings} />
          )}
          {page === "budget" && (
            <BudgetPage categories={categories} transactions={transactions} setCategories={setCategories} setTransactions={setTransactions} income={income} budgetTargets={budgetTargets} setBudgetTargets={setBudgetTargets} budgetRollovers={budgetRollovers} setBudgetRollovers={setBudgetRollovers} showUndo={showUndo} />
          )}
          {page === "calendar" && (
            <CalendarPage billTemplates={billTemplates} setBillTemplates={setBillTemplates}
              paidDates={paidDates} setPaidDates={setPaidDates} />
          )}
          {page === "recurring" && (
            <RecurringBillsPage billTemplates={billTemplates} setBillTemplates={setBillTemplates}
              paidDates={paidDates} onNavigate={setPage} showUndo={showUndo} />
          )}
          {page === "autospend" && (
            <RecurringTransactionsPage recurringTransactions={recurringTransactions} setRecurringTransactions={setRecurringTransactions}
              categories={categories} transactions={transactions} setTransactions={setTransactions} showUndo={showUndo} />
          )}
          {page === "savings" && (
            <SavingsPage savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} showUndo={showUndo} />
          )}
          {page === "paycheck" && (
            <PaycheckPlannerPage paycheckStreams={paycheckStreams} setPaycheckStreams={setPaycheckStreams}
              billTemplates={billTemplates} savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals} paidDates={paidDates} setPaidDates={setPaidDates}
              customItems={customItems} setCustomItems={setCustomItems}
              monthlyRollovers={monthlyRollovers} setMonthlyRollovers={setMonthlyRollovers}
              income={income} settings={settings} setSettings={setSettings} />
          )}
          {page === "income" && (
            <IncomePage income={income} setIncome={setIncome} showUndo={showUndo} />
          )}
          {page === "debt" && (
            <DebtPage debts={debts} setDebts={setDebts} showUndo={showUndo} />
          )}
          {page === "networth" && (
            <NetWorthPage assets={assets} setAssets={setAssets} debts={debts} showUndo={showUndo} />
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
              billTemplates={billTemplates} paidDates={paidDates} savingsGoals={savingsGoals} debts={debts} />
          )}
          {page === "forecast" && (
            <CashFlowForecastPage income={income} billTemplates={billTemplates} paidDates={paidDates}
              transactions={transactions} savingsGoals={savingsGoals} debts={debts} assets={assets} />
          )}
          {page === "trends" && (
            <SpendingTrendsPage categories={categories} transactions={transactions} />
          )}
          {page === "recap" && (
            <FinancialRecapPage categories={categories} transactions={transactions} income={income}
              billTemplates={billTemplates} paidDates={paidDates} savingsGoals={savingsGoals}
              debts={debts} assets={assets} />
          )}
          {page === "settings" && (
            <SettingsPage settings={settings} setSettings={setSettings}
              onExport={handleExport} onImport={handleImport} onReset={handleReset}
              onRestartWizard={() => { clearState(); setShowOnboarding(true); }} />
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
