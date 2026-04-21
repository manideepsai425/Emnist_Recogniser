// src/components/PredictionHistory.jsx
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, AlertTriangle } from "lucide-react";

function HistoryItem({ entry, index }) {
  const conf     = entry.confidence;
  const isGood   = !entry.uncertain && conf >= 70;
  const isMedium = !entry.uncertain && conf >= 50 && conf < 70;
  const isUncertain = entry.uncertain;

  const badgeClass = isGood
    ? "badge-green"
    : isMedium
    ? "badge-amber"
    : "badge-red";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16, scale: 0.95 }}
      animate={{ opacity: 1, x:   0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.03 }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "12px",
        padding:      "10px 14px",
        borderRadius: "var(--radius-md)",
        background:   "var(--surface-2)",
        border:       "1px solid var(--border)",
        transition:   "border-color 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-light)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
    >
      {/* Character chip */}
      <div style={{
        width:          40, height: 40,
        borderRadius:   "var(--radius-sm)",
        background:     "var(--surface)",
        border:         "1px solid var(--border)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        {isUncertain
          ? <AlertTriangle size={16} color="var(--accent-rose)" />
          : <span style={{ fontFamily: "var(--font-number)", fontSize: "1.5rem", color: "var(--text)", lineHeight: 1 }}>
              {entry.label}
            </span>
        }
      </div>

      {/* Details */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize:   "0.82rem",
            color:      "var(--text)",
            overflow:   "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {isUncertain ? "Uncertain" : `"${entry.label}"`}
          </span>
          <span className={`badge ${badgeClass}`} style={{ flexShrink: 0 }}>
            {conf.toFixed(0)}%
          </span>
        </div>
        <p style={{
          color:       "var(--text-dim)",
          fontSize:    "0.72rem",
          whiteSpace:  "nowrap",
          overflow:    "hidden",
          textOverflow:"ellipsis",
        }}>
          {entry.source === "draw" ? "✏️ drawn" : `📎 ${entry.source}`}
          {entry.latency_ms ? ` · ${entry.latency_ms}ms` : ""}
        </p>
      </div>
    </motion.div>
  );
}

export default function PredictionHistory({ history, onClear }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={15} color="var(--text-muted)" />
          <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", letterSpacing: "0.08em" }}>
            HISTORY
          </span>
          {history.length > 0 && (
            <span className="badge badge-violet">{history.length}</span>
          )}
        </div>
        {history.length > 0 && (
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: "0.75rem", gap: "5px" }}
            onClick={onClear}
          >
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "420px", overflowY: "auto" }}>
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ color: "var(--text-dim)", fontSize: "0.8rem", padding: "16px 0" }}
            >
              No predictions yet.
            </motion.p>
          ) : (
            history.map((entry, i) => (
              <HistoryItem key={entry.id} entry={entry} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
