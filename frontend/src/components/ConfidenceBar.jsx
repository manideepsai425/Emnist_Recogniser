// src/components/ConfidenceBar.jsx
import { motion } from "framer-motion";

function barColor(prob) {
  if (prob >= 70) return "var(--accent-emerald)";
  if (prob >= 45) return "var(--accent-cyan)";
  if (prob >= 25) return "var(--accent-amber)";
  return "var(--accent-rose)";
}

export function MiniBar({ label, prob, highlight = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{
        width:      "28px",
        textAlign:  "center",
        fontFamily: "var(--font-number)",
        fontSize:   "1.1rem",
        color:      highlight ? "var(--accent-cyan)" : "var(--text-muted)",
        flexShrink: 0,
      }}>
        {label}
      </span>

      <div className="conf-track" style={{ flex: 1 }}>
        <motion.div
          className="conf-fill"
          initial={{ width: 0 }}
          animate={{ width: `${prob}%` }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ background: barColor(prob) }}
        />
      </div>

      <span style={{
        width:      "48px",
        textAlign:  "right",
        fontFamily: "var(--font-mono)",
        fontSize:   "0.78rem",
        color:      highlight ? "var(--text)" : "var(--text-muted)",
        flexShrink: 0,
      }}>
        {prob.toFixed(1)}%
      </span>
    </div>
  );
}

export function Top5Bars({ top5 }) {
  if (!top5?.length) return null;
  const best = top5[0] ? top5[0].prob * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "4px" }}>
        TOP-5 PREDICTIONS
      </p>
      {top5.map((item, i) => (
        <MiniBar
          key={item.label}
          label={item.label}
          prob={item.prob * 100}
          highlight={i === 0}
        />
      ))}
    </div>
  );
}