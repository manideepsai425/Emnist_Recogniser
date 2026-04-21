// src/components/ResultPanel.jsx
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, Sparkles } from "lucide-react";
import { Top5Bars } from "./ConfidenceBar";

function ringColor(conf, uncertain) {
  if (uncertain)  return { stroke: "var(--vib-pink)",   glow: "rgba(241,91,181,0.5)",  bg: "rgba(241,91,181,0.08)"  };
  if (conf >= 80) return { stroke: "var(--vib-green)",  glow: "rgba(0,245,212,0.5)",   bg: "rgba(0,245,212,0.08)"   };
  if (conf >= 60) return { stroke: "var(--vib-cyan)",   glow: "rgba(0,187,249,0.5)",   bg: "rgba(0,187,249,0.08)"   };
  if (conf >= 40) return { stroke: "var(--vib-yellow)", glow: "rgba(254,228,64,0.45)", bg: "rgba(254,228,64,0.06)"  };
  return              { stroke: "var(--vib-orange)",  glow: "rgba(251,86,7,0.45)",   bg: "rgba(251,86,7,0.08)"    };
}

function EmptyState() {
  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "20px",
      padding:        "52px 24px",
      color:          "var(--text-dim)",
      textAlign:      "center",
    }}>
      <div style={{ position: "relative", width: 90, height: 90 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0, 0.2] }}
            transition={{ duration: 3, delay: i * 1, repeat: Infinity }}
            style={{
              position:     "absolute",
              inset:        `${i * -12}px`,
              borderRadius: "50%",
              border:       `1px solid var(--vib-purple)`,
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
          fontSize:       "2rem",
        }}>
          ?
        </div>
      </div>
      <div>
        <p style={{ fontSize: "0.88rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          Awaiting prediction…
        </p>
        <p style={{ fontSize: "0.72rem", marginTop: "4px", color: "var(--text-dim)" }}>
          Draw or upload an image
        </p>
      </div>
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
      padding:        "52px 24px",
    }}>
      {/* Triple ring spinner */}
      <div style={{ position: "relative", width: 70, height: 70 }}>
        {[
          { size: 70, color: "var(--vib-purple)", duration: 1.0 },
          { size: 50, color: "var(--vib-cyan)",   duration: 0.8 },
          { size: 30, color: "var(--vib-green)",  duration: 0.6 },
        ].map((r, i) => (
          <motion.div
            key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ repeat: Infinity, duration: r.duration, ease: "linear" }}
            style={{
              position:     "absolute",
              top:          `${(70 - r.size) / 2}px`,
              left:         `${(70 - r.size) / 2}px`,
              width:        r.size,
              height:       r.size,
              borderRadius: "50%",
              border:       "2px solid transparent",
              borderTopColor: r.color,
              boxShadow:    `0 0 8px ${r.color}66`,
            }}
          />
        ))}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
        Running inference…
      </p>
    </div>
  );
}

function ResultContent({ result }) {
  const conf      = result.confidence;
  const uncertain = result.uncertain;
  const colors    = ringColor(conf, uncertain);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Big character ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0px ${colors.glow}`,
              `0 0 50px ${colors.glow}, 0 0 80px ${colors.glow}40`,
              `0 0 20px ${colors.glow}`,
            ]
          }}
          transition={{ duration: 1.2, times: [0, 0.4, 1] }}
          style={{
            width:          130, height: 130,
            borderRadius:   "50%",
            border:         `2px solid ${colors.stroke}`,
            background:     colors.bg,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}
        >
          {uncertain ? (
            <AlertTriangle size={40} color="var(--vib-pink)" />
          ) : (
            <motion.span
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              style={{
                fontFamily: "var(--font-number)",
                fontSize:   "5rem",
                color:      colors.stroke,
                lineHeight: 1,
                textShadow: `0 0 20px ${colors.glow}`,
              }}
            >
              {result.label}
            </motion.span>
          )}
        </motion.div>

        {/* Confidence + latency */}
        <div style={{ textAlign: "center" }}>
          {uncertain ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
              <AlertTriangle size={14} color="var(--vib-pink)" />
              <span style={{
                color:      "var(--vib-pink)",
                fontFamily: "var(--font-mono)",
                fontSize:   "0.9rem",
              }}>
                Uncertain ({conf.toFixed(1)}%)
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}
            >
              <Sparkles size={14} color={colors.stroke} />
              <span style={{
                color:      colors.stroke,
                fontFamily: "var(--font-mono)",
                fontSize:   "0.9rem",
                fontWeight: 600,
              }}>
                {conf.toFixed(1)}% confidence
              </span>
            </motion.div>
          )}

          {result.latency_ms && (
            <p style={{
              color:          "var(--text-dim)",
              fontSize:       "0.72rem",
              marginTop:      "6px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "4px",
            }}>
              <Clock size={11} />
              {result.latency_ms} ms
              {result.source && result.source !== "draw" ? ` · ${result.source}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height:     "1px",
        background: `linear-gradient(90deg, transparent, ${colors.stroke}44, transparent)`,
        margin:     "0 -24px",
      }} />

      {/* Top-5 */}
      <Top5Bars top5={result.top5} />
    </motion.div>
  );
}

export default function ResultPanel({ result, loading, error }) {
  const panelRef = useRef(null);

  // Auto-scroll to result when prediction arrives
  useEffect(() => {
    if (result && !loading && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({
          behavior: "smooth",
          block:    "nearest",
        });
      }, 100);
    }
  }, [result, loading]);

  return (
    <div
      id="result-anchor"
      ref={panelRef}
      className="glass"
      style={{ padding: "24px", minHeight: "380px", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "20px",
      }}>
        <h2 style={{
          fontFamily:    "var(--font-display)",
          fontSize:      "1.05rem",
          color:         "var(--text-muted)",
          letterSpacing: "0.01em",
        }}>
          Result
        </h2>

        <AnimatePresence>
          {result && !loading && (
            <motion.span
              key="predicted"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="badge badge-green"
            >
              <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
              Predicted
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
              <LoadingState />
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{
                display:       "flex",
                flexDirection: "column",
                alignItems:    "center",
                gap:           "12px",
                padding:       "32px 24px",
                textAlign:     "center",
              }}>
                <div style={{
                  width:          56, height: 56,
                  borderRadius:   "50%",
                  background:     "rgba(241,91,181,0.1)",
                  border:         "1px solid rgba(241,91,181,0.3)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                }}>
                  <AlertTriangle size={24} color="var(--vib-pink)" />
                </div>
                <p style={{ color: "var(--vib-pink)", fontSize: "0.85rem" }}>{error}</p>
                <p style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                  Check your backend is running and CORS is configured.
                </p>
              </div>
            </motion.div>
          ) : result ? (
            <motion.div key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
              <ResultContent result={result} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
