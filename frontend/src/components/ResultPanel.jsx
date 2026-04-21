// src/components/ResultPanel.jsx
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Top5Bars } from "./ConfidenceBar";

function EmptyState() {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "16px",
      padding:        "48px 24px",
      color:          "var(--text-dim)",
      textAlign:      "center",
      minHeight:      "260px",
    }}>
      {/* Animated rings */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity }}
            style={{
              position:     "absolute",
              inset:        `${i * -10}px`,
              borderRadius: "50%",
              border:       "1px solid var(--border-light)",
            }}
          />
        ))}
        <div style={{
          position:       "absolute",
          inset:          0,
          borderRadius:   "50%",
          background:     "var(--surface-2)",
          border:         "1px solid var(--border)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "1.8rem",
        }}>
          ?
        </div>
      </div>
      <p style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
        Awaiting prediction…<br />
        <span style={{ fontSize: "0.75rem" }}>Draw or upload an image</span>
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "20px",
      padding:        "48px 24px",
      minHeight:      "260px",
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        style={{
          width:        60, height: 60,
          borderRadius: "50%",
          border:       "3px solid var(--border)",
          borderTopColor: "var(--accent-violet)",
          borderRightColor: "var(--accent-cyan)",
        }}
      />
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        Running inference…
      </p>
    </div>
  );
}

function ResultContent({ result }) {
  const isUncertain = result.uncertain;
  const conf        = result.confidence;

  // Ring colour based on confidence
  const ringColor = isUncertain
    ? "var(--accent-rose)"
    : conf >= 80 ? "var(--accent-emerald)"
    : conf >= 55 ? "var(--accent-cyan)"
    : "var(--accent-amber)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{ display: "flex", flexDirection: "column", gap: "28px" }}
    >
      {/* Big character display */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ position: "relative" }}>
          {/* Glow ring */}
          <motion.div
            animate={{ boxShadow: `0 0 40px ${ringColor}66` }}
            transition={{ duration: 0.5 }}
            style={{
              width:        120, height: 120,
              borderRadius: "50%",
              border:       `2px solid ${ringColor}`,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              background:   "var(--surface-2)",
            }}
          >
            <span style={{
              fontFamily: "var(--font-number)",
              fontSize:   isUncertain ? "1.6rem" : "4.5rem",
              color:      isUncertain ? "var(--accent-rose)" : "var(--text)",
              lineHeight: 1,
            }}>
              {isUncertain ? "?" : result.label}
            </span>
          </motion.div>
        </div>

        {/* Label and confidence */}
        <div style={{ textAlign: "center" }}>
          {isUncertain ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <AlertTriangle size={16} color="var(--accent-rose)" />
              <span style={{ color: "var(--accent-rose)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                Uncertain ({conf.toFixed(1)}%)
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <CheckCircle size={16} color="var(--accent-emerald)" />
              <span style={{ color: "var(--accent-emerald)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                {conf.toFixed(1)}% confidence
              </span>
            </div>
          )}

          <p style={{
            color:      "var(--text-muted)",
            fontSize:   "0.78rem",
            marginTop:  "6px",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            gap:        "4px",
          }}>
            <Clock size={11} />
            {result.latency_ms ? `${result.latency_ms} ms` : "—"}
            {result.source && result.source !== "draw"
              ? ` · ${result.source}`
              : ""}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", margin: "0 -24px" }} />

      {/* Top-5 bars */}
      <div style={{ paddingBottom: "4px" }}>
        <Top5Bars top5={result.top5} />
      </div>
    </motion.div>
  );
}

export default function ResultPanel({ result, loading, error }) {
  return (
    <div
      className="glass"
      style={{
        padding:  "24px",
        height:   "100%",
        minHeight: "400px",
        display:   "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "20px",
      }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize:   "1.1rem",
          color:      "var(--text-muted)",
        }}>
          Result
        </h2>
        {result && !loading && (
          <span className="badge badge-green">
            <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
            Predicted
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingState />
          </motion.div>
        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              gap:            "12px",
              padding:        "40px 24px",
              textAlign:      "center",
            }}>
              <AlertTriangle size={32} color="var(--accent-rose)" />
              <p style={{ color: "var(--accent-rose)", fontSize: "0.85rem" }}>{error}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Check your backend is running and CORS is configured.
              </p>
            </div>
          </motion.div>
        ) : result ? (
          <motion.div key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultContent result={result} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
