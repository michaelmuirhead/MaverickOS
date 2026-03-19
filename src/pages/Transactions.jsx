import { useState, useMemo } from "react";
import { Card, SwipeToDelete, Overlay } from "../components/ui.jsx";
import { fmt, nextId, INPUT_STYLE } from "../engine.js";
import { AddTransactionFields, ModalForm } from "../components/forms.jsx"

export function TransactionsPage({ transactions, setTransactions, categories, showUndo }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const catMap = {};
  categories.forEach((c) => { catMap[c.id] = c; });

  // Build available months from transaction data
  const availableMonths = useMemo(() => {
    const months = [...new Set(transactions.map((t) => t.date.substring(0, 7)))].sort().reverse();
    return months;
  }, [transactions]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterMonth !== "all") list = list.filter((t) => t.date.startsWith(filterMonth));
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
  }, [transactions, search, filterCat, filterMonth, sortField, sortDir]);

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
        <select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setSelected(new Set()); }} style={{ ...INPUT_STYLE, width: "auto", minWidth: 140, cursor: "pointer" }}>
          <option value="all">All Months</option>
          {availableMonths.map((mk) => {
            const d = new Date(mk + "-01T00:00:00");
            return <option key={mk} value={mk}>{d.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>;
          })}
        </select>
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
              style={{
                display: "grid", gridTemplateColumns: "40px 1fr auto",
                padding: "12px 16px", alignItems: "center",
                borderBottom: "1px solid var(--border-subtle)",
                background: isSelected ? "var(--accent)" + "0c" : "transparent",
                transition: "background 0.15s",
                userSelect: "none", position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.background = "var(--nav-hover)";
                const btn = e.currentTarget.querySelector(".tx-edit-btn");
                if (btn) btn.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSelected ? "var(--accent)" + "0c" : "transparent";
                const btn = e.currentTarget.querySelector(".tx-edit-btn");
                if (btn) btn.style.opacity = "0";
              }}
            >
              {/* Checkbox — clicking this area toggles selection */}
              <div onClick={() => toggleSelect(t.id)} style={{
                width: 22, height: 22, borderRadius: 6, cursor: "pointer",
                border: isSelected ? "none" : "2px solid var(--border-hover)",
                background: isSelected ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0,
              }}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>

              {/* Info — clicking main body opens edit */}
              <div onClick={() => setEditTx(t)} style={{ minWidth: 0, paddingRight: 12, cursor: "pointer" }}>
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

              {/* Amount + edit button */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button className="tx-edit-btn" onClick={(e) => { e.stopPropagation(); setEditTx(t); }}
                  style={{
                    opacity: 0, transition: "opacity 0.15s",
                    padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)",
                    background: "var(--surface)", color: "var(--text-muted)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                  Edit
                </button>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--red)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  -{fmt(t.amount)}
                </span>
              </div>
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
            <AddTransactionFields categories={categories} onSubmit={(tx, isSplit) => { setTransactions((p) => isSplit ? [...p, ...tx] : [...p, tx]); setShowAdd(false); }} onClose={() => setShowAdd(false)} />
          </ModalForm>
        </Overlay>
      )}

      {editTx && (
        <Overlay onClose={() => setEditTx(null)}>
          <ModalForm title="Edit Transaction">
            <AddTransactionFields
              categories={categories}
              existing={editTx}
              onSubmit={(updated) => {
                if (showUndo) showUndo(`Edited "${editTx.description}"`);
                setTransactions((p) => p.map((t) => t.id === updated.id ? updated : t));
                setEditTx(null);
              }}
              onClose={() => setEditTx(null)}
            />
          </ModalForm>
        </Overlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CASH FLOW FORECAST PAGE
// ─────────────────────────────────────────────

