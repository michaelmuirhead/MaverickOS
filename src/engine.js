export const pillStyle = (active) => ({
  padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
  cursor: "pointer", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "var(--accent)" + "18" : "transparent",
  color: active ? "var(--accent)" : "var(--text-muted)",
  transition: "all 0.15s",
});

export const FREQUENCY_LABELS = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  semimonthly: "1st & 15th",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export const INPUT_STYLE = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box",
};

export function generateBillInstances(templates, year, month) {
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
      case "semimonthly": {
        // Two instances per month: 1st and 15th (regardless of anchor day)
        const days = [1, 15];
        days.forEach((d) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (new Date(dateStr + "T00:00:00") >= anchor) {
            instances.push({ ...bill, instanceDate: dateStr, instanceKey: `${bill.id}-${dateStr}` });
          }
        });
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
export function generateUpcomingBills(templates, paidDates, monthsAhead = 2) {
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

// Currency is set by root app via setCurrency() when settings load/change
let _currency = "USD";
let _locale = "en-US";
const CURRENCY_LOCALES = {
  USD: "en-US", EUR: "de-DE", GBP: "en-GB", CAD: "en-CA",
  AUD: "en-AU", JPY: "ja-JP", MXN: "es-MX", INR: "en-IN",
  BRL: "pt-BR", CHF: "de-CH", KRW: "ko-KR", SGD: "en-SG",
};
export function setCurrency(currency) {
  _currency = currency || "USD";
  _locale = CURRENCY_LOCALES[_currency] || "en-US";
}

export const fmt = (n) => {
  try {
    return n.toLocaleString(_locale, { style: "currency", currency: _currency, maximumFractionDigits: _currency === "JPY" || _currency === "KRW" ? 0 : 2 });
  } catch { return n.toLocaleString("en-US", { style: "currency", currency: "USD" }); }
};
export const fmtCompact = (n) => {
  const sym = _currency === "JPY" || _currency === "KRW" ? "¥" : _currency === "EUR" ? "€" : _currency === "GBP" ? "£" : "$";
  return n >= 1000 ? `${sym}${(n / 1000).toFixed(1)}k` : fmt(n);
};
export const pct = (v, max) => max > 0 ? Math.min((v / max) * 100, 100) : 0;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function getStatusColor(spent, limit) {
  const ratio = spent / limit;
  if (ratio >= 1) return { bg: "var(--red-bg)", fg: "var(--red)", label: "Over Budget" };
  if (ratio >= 0.85) return { bg: "var(--amber-bg)", fg: "var(--amber)", label: "Warning" };
  return { bg: "var(--green-bg)", fg: "var(--green)", label: "On Track" };
}

let _nextId = 100;
export const nextId = () => _nextId++;
export function seedNextId(state) {
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

