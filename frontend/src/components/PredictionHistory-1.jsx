// src/components/PredictionHistory.jsx
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, AlertTriangle } from "lucide-react";

function confidenceColor(conf, uncertain) {
  if (uncertain) return { bg: "rgba(241,91,181,0.12)", border: "rgba(241,91,181,0.25)", text: "var(--vib-pink)" };
  if (conf >= 80) return { bg: "rgba(0,245,212,0.1)",   border: "rgba(0,245,212,0.25)",   text: "var(--vib-green)" };
  if (conf >= 60) return { bg: "rgba(0,187,249,0.1)",   border: "rgba(0,187,249,0.25)",   text: "var(--vib-cyan)" };
  if (conf >= 40) return { bg: "rgba(254,228,64,0.1)",  border: "rgba(254,228,64,0.25)",  text: "var(--vib-yellow)" };
  return { bg: "rgba(251,86,7,0.1)", border: "rgba(251,86,7,0.25)", text: "var(--vib-orange)" };
}

function HistoryItem({ entry, index }) {
  const conf   = entry.confidence;
  const colors = confidenceColor(conf, entry.uncertain);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y:   0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.02 }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "12px",
        padding:      "12px 14px",
        borderRadius: "var(--radius-md)",
        background:   "var(--surface-2)",
        border:       "1px solid var(--border)",
        transition:   "all 0.2s",
      }}
      onTouchStart={e => e.currentTarget.style.background = "var(--surface-3)"}
      onTouchEnd={e => e.currentTarget.style.background = "var(--surface-2)"}
    >
      {/* Character chip */}
      <div style={{
        width:          42, height: 42,
        borderRadius:   "var(--radius-sm)",
        background:     colors.bg,
        border:         `1px solid ${colors.border}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        {entry.uncertain
          ? <AlertTriangle size={16} color="var(--vib-pink)" />
          : <span style={{
              fontFamily: "var(--font-number)",
              fontSize:   "1.6rem",
              color:      colors.text,
              lineHeight: 1,
            }}>
              {entry.label}
            </span>
        }
      </div>

      {/* Details */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
          <span style={{
            fontFamily:   "var(--font-mono)",
            fontSize:     "0.84rem",
            color:        "var(--text)",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}>
            {entry.uncertain ? "Uncertain" : `"${entry.label}"`}
          </span>
          <span style={{
            padding:      "2px 8px",
            borderRadius: "20px",
            background:   colors.bg,
            border:       `1px solid ${colors.border}`,
            color:        colors.text,
            fontSize:     "0.7rem",
            fontFamily:   "var(--font-mono)",
            flexShrink:   0,
          }}>
            {conf.toFixed(0)}%
          </span>
        </div>
        <p style={{
          color:        "var(--text-dim)",
          fontSize:     "0.7rem",
          whiteSpace:   "nowrap",
          overflow:     "hidden",
          textOverflow: "ellipsis",
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
          <History size={14} color="var(--text-muted)" />
          <span style={{
            color:         "var(--text-muted)",
            fontSize:      "0.7rem",
            letterSpacing: "0.1em",
          }}>
            HISTORY
          </span>
          <AnimatePresence>
            {history.length > 0 && (
              <motion.span
                key={history.length}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                className="badge badge-violet"
              >
                {history.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {history.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="btn btn-ghost"
              style={{ padding: "5px 12px", fontSize: "0.72rem", borderRadius: "var(--radius-xl)" }}
              onClick={onClear}
            >
              <Trash2 size={11} /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div
        className="scroll-momentum"
        style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "360px", overflowY: "auto" }}
      >
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ color: "var(--text-dim)", fontSize: "0.8rem", padding: "16px 0", textAlign: "center" }}
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
