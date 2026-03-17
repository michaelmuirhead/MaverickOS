# MaverickOS

Personal finance dashboard built with React + Vite, designed for Vercel deployment.

## Project Structure

```
MaverickOS/
├── public/              # Static assets (icons, manifest)
│   ├── manifest.json    # PWA manifest
│   ├── icon.svg         # Favicon (SVG)
│   ├── icon-192.png     # PWA icon (generate with npm run generate-icons)
│   ├── icon-512.png     # PWA icon (generate with npm run generate-icons)
│   └── apple-touch-icon.png
├── scripts/
│   └── generate-icons.js  # Run once to create PNG icons
├── src/
│   ├── App.jsx          # Main app — single-file architecture (~4700 lines)
│   └── main.jsx         # React entry point
├── index.html           # HTML shell with PWA meta tags
├── package.json
├── vite.config.js
├── vercel.json          # SPA rewrite rules
└── CLAUDE.md            # This file
```

## Architecture

The entire app lives in `src/App.jsx` as a single React component file. This is intentional — it keeps everything portable and easy to review. The file is organized in clearly marked sections:

1. **Data Layer** — Initial state constants (categories, transactions, bills, etc.)
2. **Recurrence Engine** — Bill instance generation for recurring bills
3. **Utility Functions** — Formatting, color logic, ID generation
4. **Shared UI Components** — Card, MetricBox, ProgressBar, SwipeToDelete, etc.
5. **Sidebar Navigation** — NAV_ITEMS config + Sidebar component
6. **Page Components** — Each page is its own function component:
   - Dashboard, Calendar, Recurring Bills, Savings Goals
   - Paycheck Planner, Income, Debt, Net Worth, Debt Strategy
   - Calculators, Transactions, Monthly Summary, Settings
7. **Modal Forms** — Reusable form components for add/edit flows
8. **PWA Head** — Dynamic icon/manifest injection
9. **Root App** — State management, persistence, routing

## Key Patterns

- **State lives at the root** — `BudgetApp()` holds all state and passes it down via props
- **localStorage persistence** — Auto-saves on every state change, loads on mount
- **Export/Import** — JSON backup/restore via Settings page
- **No router library** — Simple `page` state with conditional rendering
- **CSS-in-JS** — All styles are inline via `style={{}}` objects
- **CSS Variables** — Theme defined once on the root div
- **SwipeToDelete** — Reusable touch/mouse swipe wrapper for deletable rows

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build to /dist
npm run preview      # Preview production build
npm run generate-icons  # Generate PNG icons (requires: npm install canvas --save-dev)
```

## Deployment

Push to GitHub → Import in Vercel → Auto-detects Vite → Deploy.
Vercel config handles SPA routing via `vercel.json`.
