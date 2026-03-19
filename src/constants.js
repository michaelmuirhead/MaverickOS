export const DASHBOARD_WIDGETS = [
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

export const INITIAL_CATEGORIES = [
  { id: "housing", name: "Housing", icon: "⌂", limit: 1800 },
  { id: "groceries", name: "Groceries", icon: "◉", limit: 600 },
  { id: "transport", name: "Transport", icon: "▷", limit: 300 },
  { id: "dining", name: "Dining Out", icon: "◈", limit: 250 },
  { id: "utilities", name: "Utilities", icon: "⚡", limit: 200 },
  { id: "entertainment", name: "Entertainment", icon: "♫", limit: 150 },
  { id: "health", name: "Health", icon: "✚", limit: 200 },
  { id: "personal", name: "Personal", icon: "◆", limit: 150 },
];

export const INITIAL_TRANSACTIONS = [
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

export const INITIAL_INCOME = [
  { id: 1, source: "My Salary", amount: 5200, date: "2026-03-01", recurring: true, frequency: "semimonthly", category: "employment", icon: "💼" },
  { id: 2, source: "Wife's Salary", amount: 4200, date: "2026-03-09", recurring: true, frequency: "biweekly", category: "employment", icon: "💼" },
  { id: 3, source: "Freelance Project", amount: 850, date: "2026-03-10", recurring: false, category: "freelance", icon: "🎨" },
  { id: 4, source: "Dividend — Fidelity", amount: 125, date: "2026-03-15", recurring: true, frequency: "quarterly", category: "investment", icon: "📈" },
];

// Paycheck streams — supports multiple earners and schedules
export const INITIAL_PAYCHECK_STREAMS = [
  { id: 1, name: "My Pay", amount: 2600, frequency: "semimonthly", anchorDate: "2026-01-01", color: "var(--accent)" },
  { id: 2, name: "Wife's Pay", amount: 2100, frequency: "biweekly", anchorDate: "2026-01-09", color: "#d4a843" },
];

// Custom line items added manually to specific paychecks — keyed by "streamId-YYYY-MM-DD"
export const INITIAL_CUSTOM_ITEMS = {};

// Budget category rollovers — keyed by "YYYY-MM" with category overrides
export const INITIAL_BUDGET_ROLLOVERS = {};

// Budget targets — YNAB-style goal assignments per category
// Types: "monthly" (flat monthly limit — default), "target_by_date" (save X by Y), "weekly" (X per week)
export const INITIAL_BUDGET_TARGETS = {
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
export const INITIAL_RECURRING_TRANSACTIONS = [
  { id: 1, description: "Spotify", amount: 15.99, categoryId: "entertainment", frequency: "monthly", anchorDate: "2026-01-01", active: true },
  { id: 2, description: "Gym Membership", amount: 49.99, categoryId: "health", frequency: "monthly", anchorDate: "2026-01-01", active: true },
  { id: 3, description: "Haircut", amount: 35, categoryId: "personal", frequency: "monthly", anchorDate: "2026-01-06", active: true },
  { id: 4, description: "Cloud Storage", amount: 2.99, categoryId: "personal", frequency: "monthly", anchorDate: "2026-01-10", active: true },
  { id: 5, description: "Weekly Groceries", amount: 120, categoryId: "groceries", frequency: "weekly", anchorDate: "2026-01-04", active: false },
];

// Bill templates — recurring bills use anchorDate + frequency
// Non-recurring bills use anchorDate as their one-time due date
export const INITIAL_BILL_TEMPLATES = [
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

// Net worth history snapshots — [ { date: "YYYY-MM-DD", netWorth, assets, liabilities } ]
// Seeded with 6 months of sample data so the chart has something to show immediately
export const INITIAL_NETWORTH_HISTORY = (() => {
  const now = new Date();
  const samples = [
    { mo: 6, nw: 52400, a: 84200, l: 31800 },
    { mo: 5, nw: 55100, a: 85100, l: 30000 },
    { mo: 4, nw: 57800, a: 86300, l: 28500 },
    { mo: 3, nw: 60200, a: 87500, l: 27300 },
    { mo: 2, nw: 62900, a: 88900, l: 26000 },
    { mo: 1, nw: 65500, a: 90100, l: 24600 },
  ];
  return samples.map(({ mo, nw, a, l }) => {
    const d = new Date(now.getFullYear(), now.getMonth() - mo, 1);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      netWorth: nw, assets: a, liabilities: l,
    };
  });
})();

// Tracks which bill instances have been paid — keys are "billId-YYYY-MM-DD"
export const INITIAL_PAID_DATES = new Set([
  // March bills already paid
  "1-2026-03-01", "2-2026-03-05", "3-2026-03-05", "4-2026-03-06",
  "5-2026-03-15", "6-2026-03-15",
  "8-2026-03-08", // biweekly phone bill first occurrence
]);

export const INITIAL_SAVINGS_GOALS = [
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

export const INITIAL_DEBTS = [
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

export const INITIAL_ASSETS = [];

// ─────────────────────────────────────────────
// RECURRENCE ENGINE
// ─────────────────────────────────────────────

const FREQUENCY_LABELS = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "1st & 15th",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/**
 * Generate concrete bill instances for a given month from templates.
 * Each instance gets: { ...template fields, instanceDate: "YYYY-MM-DD", instanceKey: "id-YYYY-MM-DD" }
 */
