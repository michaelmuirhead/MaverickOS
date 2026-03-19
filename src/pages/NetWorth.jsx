import { useState, useMemo } from "react";
import { Card, CardHeader, MetricBox, ProgressBar, Overlay, SwipeToDelete } from "../components/ui.jsx";
import { fmt, fmtCompact, pct, nextId, INPUT_STYLE } from "../engine.js";

export function NetWorthPage({ assets, setAssets, debts, setDebts, showUndo, networthHistory = [], setNetworthHistory }) {
  const [modal, setModal] = useState(null);
  const [justRecorded, setJustRecorded] = useState(false);

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  const totalDebts = debts.reduce((s, d) => s + d.balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Check if today is already recorded
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecorded = networthHistory.some((h) => h.date === todayStr);

  // Record a snapshot of today's net worth into history
  const recordSnapshot = () => {
    const entry = { date: todayStr, netWorth, assets: totalAssets, liabilities: totalDebts };
    if (todayRecorded) {
      setNetworthHistory((prev) => prev.map((h) => h.date === todayStr ? entry : h));
    } else {
      setNetworthHistory((prev) => [...prev, entry].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setJustRecorded(true);
    setTimeout(() => setJustRecorded(false), 2500);
    if (showUndo) showUndo(`Net worth snapshot recorded — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  };

  // Net worth history chart — multi-line SVG
  const historyWithToday = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const hasToday = networthHistory.some((h) => h.date === today);
    const base = hasToday
      ? networthHistory
      : [...networthHistory, { date: today, netWorth, assets: totalAssets, liabilities: totalDebts }];
    return base.sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  }, [networthHistory, netWorth, totalAssets, totalDebts]);

  const nwChartW = 560;
  const nwChartH = 180;
  const nwPad = { top: 16, right: 20, bottom: 28, left: 64 };
  const nwInnerW = nwChartW - nwPad.left - nwPad.right;
  const nwInnerH = nwChartH - nwPad.top - nwPad.bottom;

  const nwVals = historyWithToday.map((h) => h.netWorth);
  const assetVals = historyWithToday.map((h) => h.assets);
  const liabVals = historyWithToday.map((h) => h.liabilities);
  const allVals = [...nwVals, ...assetVals, ...liabVals];
  const nwMax = Math.max(...allVals, 1);
  const nwMin = Math.min(...allVals, 0);
  const nwRange = nwMax - nwMin || 1;

  const nwScaleX = (i) => nwPad.left + (i / Math.max(historyWithToday.length - 1, 1)) * nwInnerW;
  const nwScaleY = (v) => nwPad.top + nwInnerH - ((v - nwMin) / nwRange) * nwInnerH;

  const buildPath = (vals) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${nwScaleX(i)},${nwScaleY(v)}`).join(" ");
  const nwPath = buildPath(nwVals);
  const assetPath = buildPath(assetVals);
  const liabPath = buildPath(liabVals);

  // Zero line
  const zeroY = nwMin < 0 ? nwScaleY(0) : null;

  const nwYTicks = [0, 1, 2, 3].map((i) => {
    const v = nwMin + (nwRange * i) / 3;
    return { v, y: nwScaleY(v) };
  });

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
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: "28px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
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
            </div>

            {/* Donut chart — assets vs liabilities */}
            {(() => {
              const total = totalAssets + totalDebts;
              const assetPct = total > 0 ? totalAssets / total : 0;
              const r = 44;
              const cx = 60;
              const cy = 60;
              const circ = 2 * Math.PI * r;
              const assetArc = circ * assetPct;
              const liabArc = circ * (1 - assetPct);
              // Asset segments by category
              const catArcs = assetCatTotals.map((cat) => ({
                ...cat,
                arc: total > 0 ? circ * (cat.total / total) : 0,
              }));
              let offset = 0;
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width={120} height={120} viewBox="0 0 120 120">
                    {/* Background ring */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--track)" strokeWidth={14} />
                    {/* Liabilities arc (red base) */}
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--red)" strokeWidth={14}
                      strokeDasharray={`${liabArc} ${circ}`}
                      strokeDashoffset={-(circ * assetPct)}
                      strokeLinecap="round"
                      style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                    {/* Asset category arcs */}
                    {catArcs.map((cat) => {
                      const dash = cat.arc;
                      const off = -offset;
                      offset += cat.arc;
                      return (
                        <circle key={cat.key} cx={cx} cy={cy} r={r} fill="none"
                          stroke={cat.color} strokeWidth={14}
                          strokeDasharray={`${dash} ${circ}`}
                          strokeDashoffset={off}
                          style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
                      );
                    })}
                    {/* Center label */}
                    <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="700" fontFamily="DM Sans, sans-serif">
                      {total > 0 ? `${(assetPct * 100).toFixed(0)}%` : "—"}
                    </text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="DM Sans, sans-serif">assets</text>
                  </svg>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />Assets</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", display: "inline-block" }} />Debt</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ marginTop: 20, maxWidth: 400, margin: "20px auto 0" }}>
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

      {/* Net worth history chart */}
      {historyWithToday.length >= 2 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader
            title="Net Worth History"
            action={
              <button onClick={recordSnapshot}
                style={{
                  padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${justRecorded ? "var(--green)" : todayRecorded ? "var(--accent)" : "var(--border)"}`,
                  background: justRecorded ? "var(--green-bg)" : todayRecorded ? "var(--accent)18" : "transparent",
                  color: justRecorded ? "var(--green)" : todayRecorded ? "var(--accent)" : "var(--text-muted)",
                  transition: "all 0.3s",
                }}>
                {justRecorded ? "✓ Recorded!" : todayRecorded ? "Update Today" : "Record Today"}
              </button>
            }
          />
          <div style={{ padding: "0 12px 16px", overflowX: "auto" }}>
            <svg viewBox={`0 0 ${nwChartW} ${nwChartH}`} style={{ width: "100%", maxHeight: 200 }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {/* Grid lines + Y labels */}
              {nwYTicks.map((t, i) => (
                <g key={i}>
                  <line x1={nwPad.left} y1={t.y} x2={nwChartW - nwPad.right} y2={t.y} stroke="var(--border)" strokeWidth="0.5" />
                  <text x={nwPad.left - 8} y={t.y + 3.5} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                    {t.v >= 1000 ? `$${(t.v / 1000).toFixed(0)}k` : t.v < 0 ? `-$${Math.abs(Math.round(t.v / 1000))}k` : `$${Math.round(t.v)}`}
                  </text>
                </g>
              ))}
              {/* Zero line if chart goes negative */}
              {zeroY && <line x1={nwPad.left} y1={zeroY} x2={nwChartW - nwPad.right} y2={zeroY} stroke="var(--red)" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />}
              {/* X date labels */}
              {historyWithToday.map((h, i) => {
                if (i % Math.max(Math.floor(historyWithToday.length / 5), 1) !== 0 && i !== historyWithToday.length - 1) return null;
                const d = new Date(h.date + "T00:00:00");
                return (
                  <text key={i} x={nwScaleX(i)} y={nwChartH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="DM Sans, sans-serif">
                    {d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                  </text>
                );
              })}
              {/* Assets line (faint) */}
              <path d={assetPath} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
              {/* Liabilities line (faint) */}
              <path d={liabPath} fill="none" stroke="var(--red)" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
              {/* Net worth area fill */}
              <path d={`${nwPath} L${nwScaleX(historyWithToday.length - 1)},${nwScaleY(nwMin)} L${nwScaleX(0)},${nwScaleY(nwMin)} Z`} fill="url(#nwGrad)" />
              {/* Net worth line */}
              <path d={nwPath} fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Data point dots */}
              {historyWithToday.map((h, i) => (
                <circle key={i} cx={nwScaleX(i)} cy={nwScaleY(h.netWorth)} r={i === historyWithToday.length - 1 ? 4.5 : 3}
                  fill={i === historyWithToday.length - 1 ? "var(--green)" : "var(--card)"}
                  stroke="var(--green)" strokeWidth="2" />
              ))}
            </svg>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
              {[
                { color: "var(--green)", label: "Net Worth", solid: true },
                { color: "var(--green)", label: "Assets", solid: false },
                { color: "var(--red)", label: "Liabilities", solid: false },
              ].map((l) => (
                <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)" }}>
                  <svg width="20" height="6">
                    <line x1="0" y1="3" x2="20" y2="3" stroke={l.color} strokeWidth={l.solid ? 2.5 : 1.5} strokeDasharray={l.solid ? "0" : "4,3"} opacity={l.solid ? 1 : 0.6} />
                  </svg>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
      {historyWithToday.length < 2 && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader title="Net Worth History" action={
            <button onClick={recordSnapshot} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${justRecorded ? "var(--green)" : "var(--border)"}`,
              background: justRecorded ? "var(--green-bg)" : "transparent",
              color: justRecorded ? "var(--green)" : "var(--text-muted)",
              transition: "all 0.3s",
            }}>{justRecorded ? "✓ Recorded!" : "Record Today"}</button>
          } />
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Hit <strong style={{ color: "var(--text-primary)" }}>Record Today</strong> each month to build your net worth history chart.
          </div>
        </Card>
      )}

      {/* Net Worth Milestones */}
      {(() => {
        const milestones = [
          { value: 0, label: "Break Even", icon: "🏁", desc: "Net worth hits zero" },
          { value: 1000, label: "$1K", icon: "🌱", desc: "First thousand" },
          { value: 5000, label: "$5K", icon: "💵", desc: "Five thousand" },
          { value: 10000, label: "$10K", icon: "🔟", desc: "Five figures" },
          { value: 25000, label: "$25K", icon: "📈", desc: "Quarter way to six figures" },
          { value: 50000, label: "$50K", icon: "🥈", desc: "Halfway to six figures" },
          { value: 100000, label: "$100K", icon: "💯", desc: "Six figures" },
          { value: 250000, label: "$250K", icon: "🏆", desc: "Quarter million" },
          { value: 500000, label: "$500K", icon: "🦅", desc: "Half million" },
          { value: 1000000, label: "$1M", icon: "💎", desc: "Millionaire" },
        ];
        const achieved = milestones.filter((m) => netWorth >= m.value);
        const next = milestones.find((m) => netWorth < m.value);
        const latest = achieved[achieved.length - 1];
        if (!latest && !next) return null;
        return (
          <Card style={{ marginBottom: 24 }}>
            <CardHeader title="Milestones" />
            <div style={{ padding: "0 20px 16px" }}>
              {latest && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--green-bg, var(--surface))", border: "1px solid var(--green)44", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{latest.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--green)" }}>✓ {latest.label} — {latest.desc}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>Most recent milestone achieved</div>
                  </div>
                </div>
              )}
              {next && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24, opacity: 0.4 }}>{next.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Next: {next.label} — {next.desc}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {fmt(next.value - netWorth)} to go · {next.value > 0 ? `${((netWorth / next.value) * 100).toFixed(0)}% there` : ""}
                    </div>
                    <ProgressBar value={Math.max(netWorth, 0)} max={next.value} height={5} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {milestones.map((m) => (
                  <div key={m.value} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1px solid ${netWorth >= m.value ? "var(--green)44" : "var(--border)"}`, background: netWorth >= m.value ? "var(--green)18" : "transparent", color: netWorth >= m.value ? "var(--green)" : "var(--text-muted)", fontWeight: 600 }}>
                    {netWorth >= m.value ? "✓ " : ""}{m.label}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })()}

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
            <SwipeToDelete key={debt.id} onDelete={() => {
              if (showUndo) showUndo(`Deleted "${debt.name}"`);
              setDebts((prev) => prev.filter((d) => d.id !== debt.id));
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: idx < debts.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{debt.icon}</span>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{debt.name}</span>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{debt.lender || ""}{debt.lender ? " · " : ""}{debt.apr}% APR</div>
                  </div>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", fontVariantNumeric: "tabular-nums" }}>{fmt(debt.balance)}</span>
              </div>
            </SwipeToDelete>
          ))}
          ))}
          {debts.length === 0 && <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No debts — debt free! 🎉</div>}
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

export function AssetForm({ existing, onSave, onClose, title }) {
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

