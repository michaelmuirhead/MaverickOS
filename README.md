# 💰 MaverickOS

A comprehensive personal finance dashboard built with React.

## Features

- **Dashboard** — Net worth banner, income/expense overview, top spending, upcoming bills, savings goals, debt summary
- **Budget Tracker** — Income-aware budgeting with category limits, transaction tracking, over/under indicators
- **Bill Calendar** — Monthly calendar view with bill indicators, click-to-pay toggling
- **Recurring Bills** — Manage recurring bills (weekly, biweekly, monthly, quarterly, yearly)
- **Savings Goals** — Track goals with contributions, deadlines, progress, and on-track indicators
- **Paycheck Planner** — EveryDollar-style waterfall showing how each paycheck gets allocated, with month-to-month rollover
- **Income Management** — Multiple income streams with categories and frequencies
- **Debt Payoff** — Track debts with payment history and payoff progress
- **Net Worth** — Assets vs liabilities with category breakdowns
- **Debt Strategy** — Dave Ramsey's Snowball vs Avalanche with full month-by-month simulation
- **Financial Calculators** — Compound interest, mortgage, 401(k), loan payoff, savings goal
- **Transactions** — Searchable, sortable, filterable transaction log
- **Monthly Summary** — Cash flow analysis with spending breakdown
- **Settings** — Export/import data (JSON), reset to defaults

## Quick Start

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Vercel auto-detects Vite — click Deploy
4. Done. Add to home screen for the full PWA experience.

## Generate PWA Icons

```bash
npm install canvas --save-dev
npm run generate-icons
```

## Tech Stack

- React 18
- Vite 6
- localStorage persistence
- Zero external UI libraries
- PWA-ready with manifest + icons

## License

MIT
