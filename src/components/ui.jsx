import { useState, useRef, useCallback, useEffect } from "react";

export function ProgressBar({ value, max, color, height = 8, animate = true }) {
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

export function StatusPill({ spent, limit }) {
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

export function Card({ children, style = {} }) {
  return (
    <div className="maverick-card" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 12px" }}>
      <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{title}</span>
      {action}
    </div>
  );
}

export function MetricBox({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent || "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Overlay({ children, onClose }) {
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

// ─────────────────────────────────────────────
// DRAG TO REORDER
// ─────────────────────────────────────────────

export function DragHandle({ onPointerDown }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{ padding: "8px 6px", cursor: "grab", color: "var(--text-muted)", touchAction: "none", display: "flex", alignItems: "center", flexShrink: 0 }}
      title="Drag to reorder"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/>
        <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
        <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
  );
}

export function useDragToReorder(items, onReorder) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const dragIndexRef = useRef(null);
  const overIndexRef = useRef(null);
  const itemsRef = useRef(items);
  const listIdRef = useRef(`dnd-${Math.random().toString(36).slice(2)}`);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const startDrag = useCallback((e, index) => {
    e.preventDefault();
    setDragIndex(index);
    dragIndexRef.current = index;
    overIndexRef.current = index;
    const listId = listIdRef.current;

    const onPointerMove = (ev) => {
      const els = Array.from(document.querySelectorAll(`[data-drag-list="${listId}"]`));
      if (els.length === 0) return;
      let closestIdx = 0;
      let closestDist = Infinity;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(ev.clientY - midY);
        const idx = parseInt(el.dataset.dragItem);
        if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
      });
      overIndexRef.current = closestIdx;
      setOverIndex(closestIdx);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      const from = dragIndexRef.current;
      const to = overIndexRef.current;
      if (from !== null && to !== null && from !== to) {
        const next = [...itemsRef.current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      }
      setDragIndex(null);
      setOverIndex(null);
      dragIndexRef.current = null;
      overIndexRef.current = null;
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [onReorder]);

  return { dragIndex, overIndex, startDrag, listId: listIdRef.current };
}

export function SwipeToDelete({ onDelete, children, disabled = false }) {
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
      {/* Delete button behind — only visible when swiped */}
      {(showDelete || offset < 0) && (
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
      )}
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

export function UndoToast({ message, onUndo, onDismiss }) {
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

export function FrequencyBadge({ frequency }) {
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

