import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardHeader, Overlay, FrequencyBadge, DragHandle, useDragToReorder, MetricBox, ProgressBar } from "../components/ui.jsx";
import { fmt, nextId, INPUT_STYLE, FREQUENCY_LABELS, generateBillInstances } from "../engine.js";
import { FieldLabel } from "../components/forms.jsx"

export function generatePaycheckDates(stream, year, month) {
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

export function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatShortDate(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return { month: months[date.getMonth()], day: date.getDate() };
}

export function WaterfallRow({ line, paycheckKey, onDragStart, onRemove, onTogglePaid }) {
  // Divider lines (virtual mid-month split) render as a simple separator
  if (line.isDivider) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 16px", background: "var(--surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        <DragHandle onPointerDown={onDragStart} />
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", whiteSpace: "nowrap" }}>15th</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
    );
  }

  const isIncome = line.isIncome;
  const canRemove = line.customId != null;
  const isBill = line.type === "bill";
  const isSavings = line.type === "savings";
  const canSwipePaid = isBill && line.instanceKey;
  const canSwipe = canSwipePaid || canRemove;

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
    swipeStartX.current = clientX; swipeCurrentX.current = clientX;
    didSwipe.current = false; swipingRef.current = true; setDragging(true);
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
    swipingRef.current = false; setDragging(false);
    const dx = swipeCurrentX.current - swipeStartX.current;
    if (dx > SWIPE_THRESHOLD && canSwipePaid) {
      onTogglePaid && onTogglePaid(line.instanceKey); setSwipeOffset(0);
    } else if (dx < -SWIPE_THRESHOLD && canRemove) {
      setSwipeOffset(-140); setShowDeleteConfirm(true);
    } else { setSwipeOffset(0); setShowDeleteConfirm(false); }
  };
  const onTouchStart = (e) => handleSwipeStart(e.touches[0].clientX);
  const onTouchMove = (e) => handleSwipeMove(e.touches[0].clientX);
  const onTouchEnd = () => handleSwipeEnd();
  const onMouseDown = (e) => {
    if (!canSwipe) return;
    handleSwipeStart(e.clientX);
    const onMM = (ev) => handleSwipeMove(ev.clientX);
    const onMU = () => { document.removeEventListener("mousemove", onMM); document.removeEventListener("mouseup", onMU); handleSwipeEnd(); };
    document.addEventListener("mousemove", onMM); document.addEventListener("mouseup", onMU);
  };
  const onClickCapture = (e) => {
    if (didSwipe.current) { e.stopPropagation(); e.preventDefault(); didSwipe.current = false; }
  };
  const revealPct = canSwipePaid && swipeOffset > 0 ? Math.min(swipeOffset / SWIPE_THRESHOLD, 1) : 0;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {canSwipePaid && swipeOffset > 0 && (
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 120, background: line.isPaid ? "var(--amber)" : "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, zIndex: 1, opacity: Math.max(revealPct, 0.6) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {line.isPaid ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <polyline points="20 6 9 17 4 12"/>}
          </svg>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{line.isPaid ? "Unpay" : "Paid"}</span>
        </div>
      )}
      {canRemove && (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 140, background: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, zIndex: 1 }}>
          <button onClick={() => { onRemove && onRemove(paycheckKey, line.customId); setSwipeOffset(0); setShowDeleteConfirm(false); }}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, padding: "8px 16px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            Delete
          </button>
        </div>
      )}
      <div
        onTouchStart={canSwipe ? onTouchStart : undefined} onTouchMove={canSwipe ? onTouchMove : undefined} onTouchEnd={canSwipe ? onTouchEnd : undefined}
        onMouseDown={canSwipe ? onMouseDown : undefined} onClickCapture={canSwipe ? onClickCapture : undefined}
        style={{ display: "grid", gridTemplateColumns: "28px 48px 1fr auto", alignItems: "center", padding: "10px 16px 10px 4px", borderBottom: "1px solid var(--border-subtle)", background: isIncome ? "var(--green-bg)" : line.isPaid ? "var(--surface)" : "var(--card)", transform: `translateX(${swipeOffset}px)`, transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.22,1,0.36,1)", position: "relative", zIndex: 2, userSelect: "none", cursor: canSwipe ? "grab" : "default" }}
      >
        <DragHandle onPointerDown={onDragStart} />
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{line.dateInfo.month}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>{line.dateInfo.day}</div>
        </div>
        <div style={{ paddingLeft: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isIncome && <span style={{ width: 8, height: 8, borderRadius: 2, background: line.color || "var(--green)" }} />}
            {isSavings && <span style={{ width: 8, height: 8, borderRadius: 2, background: line.color || "var(--accent)" }} />}
            {isBill && <span style={{ width: 8, height: 8, borderRadius: "50%", background: line.isPaid ? "var(--green)" : "var(--border-hover)", transition: "background 0.2s" }} />}
            <span style={{ fontSize: 15, fontWeight: 600, color: line.isPaid ? "var(--text-muted)" : "var(--text-primary)", textDecoration: line.isPaid ? "line-through" : "none" }}>{line.name}</span>
            {isBill && line.recurring && line.frequency && <FrequencyBadge frequency={line.frequency} />}
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 100 }}>
          <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: isIncome ? "var(--green)" : line.isPaid ? "var(--text-muted)" : "var(--red)" }}>
            {isIncome ? "+" : "-"}{fmt(line.amount)}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: line.balance < 0 ? "var(--red)" : "var(--text-primary)" }}>
            {fmt(line.balance)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WaterfallSchedule({ paycheckSchedules, year, month, customItems, setCustomItems, monthlyRollovers, setShowAddItem, setShowAddIncome, setShowAddSavings, allPaychecks, onRemove, onTogglePaid }) {
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const startBuffer = monthlyRollovers[monthKey] || 0;
  const orderKey = `order-${monthKey}`;

  // Build flat ordered list of all lines
  const allLines = useMemo(() => {
    const lines = [];
    let lineIdx = 0;
    paycheckSchedules.forEach((pc) => {
      pc.lines.forEach((line) => {
        lines.push({ ...line, paycheckKey: pc.key, streamColor: pc.streamColor, streamName: pc.streamName, lineId: lineIdx++ });
      });
    });
    const savedOrder = customItems[orderKey];
    if (savedOrder && Array.isArray(savedOrder)) {
      const idxMap = {};
      savedOrder.forEach((id, i) => { idxMap[id] = i; });
      lines.sort((a, b) => {
        const posA = idxMap[a.lineId] !== undefined ? idxMap[a.lineId] : 9999;
        const posB = idxMap[b.lineId] !== undefined ? idxMap[b.lineId] : 9999;
        return posA - posB;
      });
    }
    // Recalculate running balance
    let balance = startBuffer;
    lines.forEach((line) => {
      if (line.isIncome) balance += line.amount;
      else balance -= line.amount;
      line.balance = balance;
    });
    return lines;
  }, [paycheckSchedules, customItems, orderKey, startBuffer]);

  const finalBalance = allLines.length > 0 ? allLines[allLines.length - 1].balance : startBuffer;
  const hasCustomOrder = !!customItems[orderKey];

  // Drag-to-reorder — saves new lineId order to customItems[orderKey]
  const reorderLines = useCallback((newLines) => {
    const newOrder = newLines.map((l) => l.lineId);
    setCustomItems((prev) => ({ ...prev, [orderKey]: newOrder }));
  }, [orderKey, setCustomItems]);

  const { dragIndex, overIndex, startDrag, listId } = useDragToReorder(allLines, reorderLines);

  const resetOrder = () => {
    setCustomItems((prev) => { const next = { ...prev }; delete next[orderKey]; return next; });
  };

  return (
    <Card>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Spending Schedule</span>
          {hasCustomOrder && (
            <button onClick={resetOrder} style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Reset Order</button>
          )}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Balance</span>
      </div>

      {/* Starting buffer */}
      {startBuffer !== 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "28px 48px 1fr auto", alignItems: "center", padding: "10px 16px 10px 4px", borderBottom: "1px solid var(--border-subtle)", background: startBuffer > 0 ? "var(--green-bg)" : "var(--red-bg)" }}>
          <div />
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{new Date(year, month, 1).toLocaleDateString("en-US", { month: "short" }).toUpperCase().slice(0, 3)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)" }}>1</div>
          </div>
          <div style={{ paddingLeft: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Starting Buffer</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>rolled over</span>
          </div>
          <div style={{ textAlign: "right", minWidth: 100 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: startBuffer > 0 ? "var(--green)" : "var(--red)" }}>{fmt(startBuffer)}</div>
          </div>
        </div>
      )}

      {/* Waterfall rows with drag */}
      {allLines.map((line, i) => (
        <div key={`${line.paycheckKey}-${line.lineId}`}
          data-drag-list={listId} data-drag-item={i}
          style={{ opacity: dragIndex === i ? 0.4 : 1, outline: overIndex === i && dragIndex !== null && dragIndex !== i ? "2px solid var(--accent)" : "none", transition: "opacity 0.15s, outline 0.1s" }}>
      <WaterfallRow line={line} paycheckKey={line.paycheckKey} onDragStart={(e) => startDrag(e, i)} onRemove={onRemove} onTogglePaid={onTogglePaid} />
        </div>
      ))}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)", background: finalBalance < 0 ? "var(--red-bg)" : "var(--surface)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowAddItem(allPaychecks[allPaychecks.length - 1]?.key)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Expense</button>
          <button onClick={() => setShowAddSavings(allPaychecks[allPaychecks.length - 1]?.key)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Savings</button>
          <button onClick={() => setShowAddIncome(allPaychecks[allPaychecks.length - 1]?.key)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--green)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Income</button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>End of Month</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: finalBalance < 0 ? "var(--red)" : "var(--green)" }}>{fmt(finalBalance)}</div>
        </div>
      </div>
    </Card>
  );
}

export function PaycheckPlannerPage({ paycheckStreams, setPaycheckStreams, billTemplates, savingsGoals, setSavingsGoals, paidDates, setPaidDates, customItems, setCustomItems, monthlyRollovers, setMonthlyRollovers, income, settings, setSettings, showUndo }) {
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

  // Assign bills to the paycheck on or before their due date.
  // For semimonthly bills: if no paycheck falls on/after the 15th,
  // inject a virtual split at the 15th so those instances display correctly.
  const assignBillsToPaychecks = useMemo(() => {
    const assignments = {};
    allPaychecks.forEach((pc) => { assignments[pc.key] = []; });

    // Check if any paycheck lands on or after the 15th of the month
    const hasLatePaycheck = allPaychecks.some((pc) => pc.date.getDate() >= 15);

    // If no paycheck is on/after the 15th but we have semimonthly bills,
    // create a virtual split key for mid-month bills
    const midMonthKey = `virtual-15-${year}-${String(month + 1).padStart(2, "0")}`;
    const needsMidSplit = !hasLatePaycheck && monthBills.some((b) => {
      const d = new Date(b.instanceDate + "T00:00:00");
      return d.getDate() >= 15;
    });
    if (needsMidSplit) assignments[midMonthKey] = [];

    monthBills.forEach((bill) => {
      const billDate = new Date(bill.instanceDate + "T00:00:00");
      const billDay = billDate.getDate();

      // If this is a mid-month bill and we have a virtual split, use it
      if (needsMidSplit && billDay >= 15) {
        assignments[midMonthKey].push(bill);
        return;
      }

      let assignedKey = null;
      for (let i = allPaychecks.length - 1; i >= 0; i--) {
        if (allPaychecks[i].date <= billDate) { assignedKey = allPaychecks[i].key; break; }
      }
      if (!assignedKey && allPaychecks.length > 0) assignedKey = allPaychecks[0].key;
      if (assignedKey) assignments[assignedKey].push(bill);
    });
    return assignments;
  }, [allPaychecks, monthBills, year, month]);

  // Build the waterfall schedule for each paycheck
  const paycheckSchedules = useMemo(() => {
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const midMonthKey = `virtual-15-${monthKey}`;
    const hasMidSplit = midMonthKey in assignBillsToPaychecks;

    let carryOver = monthlyRollovers[monthKey] || 0;

    // Build a list of schedule entries: real paychecks + optional virtual mid-month marker
    const scheduleEntries = [...allPaychecks];
    if (hasMidSplit) {
      // Insert a virtual entry at the 15th position
      const midDate = new Date(year, month, 15);
      const midEntry = {
        streamId: "virtual", streamName: "Mid-Month",
        streamColor: "var(--text-muted)", amount: 0,
        date: midDate, dateStr: formatDateKey(midDate),
        key: midMonthKey, fromIncome: false, isVirtual: true,
      };
      // Insert after all paychecks before the 15th
      const insertIdx = scheduleEntries.findIndex((pc) => pc.date > midDate);
      if (insertIdx === -1) scheduleEntries.push(midEntry);
      else scheduleEntries.splice(insertIdx, 0, midEntry);
    }

    return scheduleEntries.map((pc) => {
      const startingBuffer = carryOver;
      const bills = (assignBillsToPaychecks[pc.key] || []).sort((a, b) => a.amount - b.amount);
      const custom = pc.isVirtual ? [] : (customItems[pc.key] || []);
      const customExpenses = custom.filter((i) => i.type === "expense");
      const customIncome = custom.filter((i) => i.type === "income");
      const customSavings = custom.filter((i) => i.type === "savings");

      const lines = [];
      const extraIncome = customIncome.reduce((s, i) => s + i.amount, 0);

      // Income line — skip for virtual mid-month entries
      if (!pc.isVirtual) {
        lines.push({ type: "income", name: pc.streamName, amount: pc.amount, dateInfo: formatShortDate(pc.date), color: pc.streamColor, isIncome: true, rawDate: pc.date });
        customIncome.forEach((ci) => {
          lines.push({ type: "income", name: ci.name, amount: ci.amount, dateInfo: formatShortDate(pc.date), color: "var(--green)", isIncome: true, customId: ci.id, rawDate: pc.date });
        });
      } else {
        // Virtual separator line — just a divider, no income
        lines.push({ type: "divider", name: "— 15th —", amount: 0, dateInfo: formatShortDate(pc.date), isIncome: false, isDivider: true, rawDate: pc.date });
      }

      // Bills
      bills.forEach((bill) => {
        const isPaid = paidDates.has(bill.instanceKey);
        const billDate = new Date(bill.instanceDate + "T00:00:00");
        lines.push({ type: "bill", name: bill.name, amount: bill.amount, dateInfo: formatShortDate(billDate), isPaid, recurring: bill.recurring, frequency: bill.frequency, rawDate: billDate, instanceKey: bill.instanceKey });
      });
      // Savings
      customSavings.forEach((cs) => {
        lines.push({ type: "savings", name: cs.name, amount: cs.amount, dateInfo: formatShortDate(pc.date), color: cs.color || "var(--accent)", customId: cs.id, rawDate: pc.date });
      });
      // Custom expenses
      customExpenses.forEach((ci) => {
        lines.push({ type: "custom", name: ci.name, amount: ci.amount, dateInfo: formatShortDate(pc.date), customId: ci.id, rawDate: pc.date });
      });

      // Running balance
      let balance = startingBuffer;
      lines.forEach((line) => {
        if (line.isIncome) balance += line.amount;
        else if (!line.isDivider) balance -= line.amount;
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
    if (showUndo && item) showUndo(`Removed "${item.name}" from paycheck`);
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

      {paycheckSchedules.length > 0 && (
        <WaterfallSchedule
          paycheckSchedules={paycheckSchedules}
          year={year} month={month}
          customItems={customItems} setCustomItems={setCustomItems}
          monthlyRollovers={monthlyRollovers}
          setShowAddItem={setShowAddItem}
          setShowAddIncome={setShowAddIncome}
          setShowAddSavings={setShowAddSavings}
          allPaychecks={allPaychecks}
          onRemove={removeCustomItem}
          onTogglePaid={toggleBillPaid}
        />
      )}

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

export function AddStreamForm({ onAdd, onClose }) {
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

export function AddCustomItemForm({ type, paycheckKey, onAdd, onClose }) {
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

export function AddSavingsContributionForm({ savingsGoals, paycheckKey, onAdd, onClose }) {
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

