import { useState, useMemo } from "react";
import { Card, Overlay, FrequencyBadge, MetricBox } from "../components/ui.jsx";
import { fmt, nextId, INPUT_STYLE, FREQUENCY_LABELS, generateBillInstances } from "../engine.js";

export function CalendarPage({ billTemplates, setBillTemplates, paidDates, setPaidDates }) {
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

export function AddBillForm({ onAdd, onClose }) {
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

