import { useState, useMemo } from "react";
import { Card, CardHeader } from "../components/ui.jsx";
import { fmt, fmtCompact, pct } from "../engine.js";

export function SpendingTrendsPage({ categories, transactions }) {
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
                <line x1={pad.left} y1={t.y} x2={chartW - pad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                <text x={pad.left - 8} y={t.y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
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
                      <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">
                        {m.total >= 1000 ? `$${(m.total / 1000).toFixed(1)}k` : `$${Math.round(m.total)}`}
                      </text>
                    )}
                    {/* Month label */}
                    <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="10" fontWeight={isCurrentMonth ? "700" : "500"} fontFamily="DM Sans, sans-serif">
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
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="9" fontWeight="600" fontFamily="DM Sans, sans-serif">
                      {fmt(m.total)}
                    </text>
                  )}
                  <text x={x + barW / 2} y={chartH - 8} textAnchor="middle" fill={isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)"} fontSize="10" fontWeight={isCurrentMonth ? "700" : "500"} fontFamily="DM Sans, sans-serif">
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
// MONTHLY SUMMARY PAGE
// ─────────────────────────────────────────────

