// src/components/ConfidenceBar.jsx
import { motion } from "framer-motion";

function barColor(prob) {
  if (prob >= 80) return "var(--vib-green)";
  if (prob >= 60) return "var(--vib-cyan)";
  if (prob >= 40) return "var(--vib-yellow)";
  if (prob >= 20) return "var(--vib-orange)";
  return "var(--vib-pink)";
}

function barGlow(prob) {
  if (prob >= 80) return "0 0 8px rgba(0,245,212,0.6)";
  if (prob >= 60) return "0 0 8px rgba(0,187,249,0.6)";
  if (prob >= 40) return "0 0 8px rgba(254,228,64,0.5)";
  return "0 0 8px rgba(241,91,181,0.5)";
}

export function MiniBar({ label, prob, highlight = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{ display: "flex", alignItems: "center", gap: "12px" }}
    >
      {/* Label chip */}
      <div style={{
        width:          32, height: 32,
        borderRadius:   "var(--radius-sm)",
        background:     highlight ? "rgba(155,93,229,0.2)" : "var(--surface-2)",
        border:         `1px solid ${highlight ? "rgba(155,93,229,0.4)" : "var(--border)"}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}>
        <span style={{
          fontFamily: "var(--font-number)",
          fontSize:   "1.15rem",
          color:      highlight ? "var(--vib-cyan)" : "var(--text-muted)",
          lineHeight: 1,
        }}>
          {label}
        </span>
      </div>

      {/* Bar track */}
      <div className="conf-track" style={{ flex: 1, height: highlight ? "7px" : "5px" }}>
        <motion.div
          className="conf-fill"
          initial={{ width: 0 }}
          animate={{ width: `${prob}%` }}
          transition={{ duration: 0.8, delay, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            background: barColor(prob),
            boxShadow:  highlight ? barGlow(prob) : "none",
          }}
        />
      </div>

      {/* Percentage */}
      <span style={{
        width:      "44px",
        textAlign:  "right",
        fontFamily: "var(--font-mono)",
        fontSize:   highlight ? "0.82rem" : "0.75rem",
        color:      highlight ? "var(--text)" : "var(--text-muted)",
        flexShrink: 0,
        fontWeight: highlight ? 600 : 400,
      }}>
        {prob.toFixed(1)}%
      </span>
    </motion.div>
  );
}

export function Top5Bars({ top5 }) {
  if (!top5?.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{
        color:         "var(--text-muted)",
        fontSize:      "0.7rem",
        letterSpacing: "0.1em",
        marginBottom:  "4px",
      }}>
        TOP-5 PREDICTIONS
      </p>
      {top5.map((item, i) => (
        <MiniBar
          key={item.label + i}
          label={item.label}
          prob={item.prob * 100}
          highlight={i === 0}
          delay={i * 0.06}
        />
      ))}
    </div>
  );
}
