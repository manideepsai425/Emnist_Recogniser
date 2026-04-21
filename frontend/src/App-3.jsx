// src/App.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, ImageUp, Info, X, ChevronDown } from "lucide-react";

import NeuralGrid          from "./components/NeuralGrid";
import Header              from "./components/Header";
import DrawingCanvas       from "./components/DrawingCanvas";
import ImageUpload         from "./components/ImageUpload";
import ResultPanel         from "./components/ResultPanel";
import PredictionHistory   from "./components/PredictionHistory";
import { usePrediction }   from "./hooks/usePrediction";

// ─── Tab config ───────────────────────────────────────────────
const TABS = [
  { id: "draw",   label: "Draw",   icon: PenLine },
  { id: "upload", label: "Upload", icon: ImageUp },
];

// ─── Haptic helper ────────────────────────────────────────────
function haptic(ms = 10) {
  if (navigator?.vibrate) navigator.vibrate(ms);
}

// ─── Info Banner ──────────────────────────────────────────────
function InfoBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y:  0, scale: 1    }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      style={{
        display:      "flex",
        alignItems:   "flex-start",
        gap:          "10px",
        padding:      "12px 14px",
        borderRadius: "var(--radius-lg)",
        background:   "rgba(155,93,229,0.07)",
        border:       "1px solid rgba(155,93,229,0.2)",
        marginBottom: "20px",
        position:     "relative",
      }}
    >
      <Info size={14} color="var(--vib-purple)" style={{ flexShrink: 0, marginTop: "2px" }} />
      <span style={{ color: "var(--text-muted)", fontSize: "0.77rem", lineHeight: 1.6, flex: 1 }}>
        Recognises{" "}
        <strong style={{ color: "var(--vib-cyan)" }}>47 classes</strong>: digits 0–9 and
        letters A–Z trained on{" "}
        <strong style={{ color: "var(--vib-purple)" }}>EMNIST Balanced</strong> via PyTorch.
        Confidence below 50% is flagged as{" "}
        <em style={{ color: "var(--vib-pink)" }}>Uncertain</em>.
      </span>
      <button
        onClick={() => { haptic(8); setVisible(false); }}
        style={{
          background:   "transparent",
          border:       "none",
          cursor:       "pointer",
          color:        "var(--text-dim)",
          padding:      "2px",
          borderRadius: "50%",
          flexShrink:   0,
          display:      "flex",
          alignItems:   "center",
        }}
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}

// ─── Scroll-to-result arrow ───────────────────────────────────
function ScrollArrow({ show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="arrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y:  0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={onClick}
          style={{
            position:       "fixed",
            bottom:         `calc(28px + var(--safe-bottom))`,
            left:           "50%",
            transform:      "translateX(-50%)",
            zIndex:         100,
            background:     "linear-gradient(135deg, var(--vib-purple), var(--vib-cyan))",
            border:         "none",
            borderRadius:   "var(--radius-xl)",
            padding:        "10px 22px",
            color:          "#fff",
            fontFamily:     "var(--font-mono)",
            fontSize:       "0.8rem",
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            gap:            "6px",
            boxShadow:      "0 4px 24px rgba(155,93,229,0.5)",
          }}
        >
          View Result
          <motion.div
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Section header ───────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p style={{
      color:         "var(--text-dim)",
      fontSize:      "0.68rem",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginBottom:  "10px",
      paddingLeft:   "2px",
    }}>
      {children}
    </p>
  );
}

// ─── Divider ──────────────────────────────────────────────────
function VibDivider() {
  return (
    <div style={{
      height:     "1px",
      background: "linear-gradient(90deg, transparent, var(--vib-purple)44, var(--vib-cyan)44, transparent)",
      margin:     "4px 0",
    }} />
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("draw");
  const [showArrow, setShowArrow] = useState(false);
  const resultRef   = useRef(null);
  const inputRef    = useRef(null);

  const {
    result, loading, error,
    history, runCanvas, runUpload, reset,
  } = usePrediction();

  // Clear history state via ref
  const [localHistory, setLocalHistory] = useState([]);
  useEffect(() => { setLocalHistory(history); }, [history]);

  // Show scroll arrow when result appears (mobile only)
  useEffect(() => {
    if (result && !loading) {
      // Check if result panel is out of view
      const panel = resultRef.current;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        if (rect.top > window.innerHeight || rect.bottom < 0) {
          setShowArrow(true);
          setTimeout(() => setShowArrow(false), 4000);
        }
      }
    }
  }, [result, loading]);

  // Vibrate on successful prediction
  useEffect(() => {
    if (result && !loading && !error) {
      if (result.uncertain) {
        haptic(40); // single medium pulse for uncertain
      } else {
        // Double pulse for confident result
        navigator?.vibrate?.([15, 80, 15]);
      }
    }
  }, [result, loading, error]);

  const scrollToResult = useCallback(() => {
    haptic(8);
    setShowArrow(false);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleTabChange = useCallback((id) => {
    haptic(8);
    setTab(id);
    reset();
  }, [reset]);

  const handleClearHistory = useCallback(() => {
    haptic(20);
    setLocalHistory([]);
  }, []);

  return (
    <>
      {/* ── Animated dot-grid background ── */}
      <NeuralGrid />

      {/* ── Foreground content ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="app-wrapper">

          {/* ── Header ── */}
          <Header />

          {/* ── Info banner ── */}
          <AnimatePresence>
            <InfoBanner key="info" />
          </AnimatePresence>

          {/* ══════════════════════════════════════════════════
              SINGLE-COLUMN MOBILE LAYOUT
              Order: Tab → Input → Result → History
          ══════════════════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* ── Tab bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="tab-bar">
                {TABS.map(t => {
                  const Icon   = t.icon;
                  const active = tab === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.96 }}
                      className={`tab-btn ${active ? "active" : ""}`}
                      onClick={() => handleTabChange(t.id)}
                    >
                      <motion.div
                        animate={{ color: active ? "var(--vib-cyan)" : "var(--text-muted)" }}
                        transition={{ duration: 0.2 }}
                      >
                        <Icon size={15} />
                      </motion.div>
                      <motion.span
                        animate={{ color: active ? "var(--text-bright)" : "var(--text-muted)" }}
                        transition={{ duration: 0.2 }}
                      >
                        {t.label}
                      </motion.span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Input card ── */}
            <motion.div
              ref={inputRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y:  0 }}
              transition={{ delay: 0.18 }}
            >
              <SectionLabel>
                {tab === "draw" ? "Draw your character" : "Upload an image"}
              </SectionLabel>
              <div className="glass-bright" style={{ padding: "20px" }}>
                <AnimatePresence mode="wait">
                  {tab === "draw" ? (
                    <motion.div
                      key="draw"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x:   0 }}
                      exit={{ opacity: 0, x:  12 }}
                      transition={{ duration: 0.22 }}
                    >
                      <DrawingCanvas onPredict={runCanvas} loading={loading} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x:  0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.22 }}
                    >
                      <ImageUpload onPredict={runUpload} loading={loading} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ── Result panel ── */}
            <motion.div
              ref={resultRef}
              id="result-anchor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y:  0 }}
              transition={{ delay: 0.26 }}
            >
              <SectionLabel>Prediction</SectionLabel>
              <AnimatePresence>
                {result && !loading && (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="result-flash"
                  />
                )}
              </AnimatePresence>
              <ResultPanel result={result} loading={loading} error={error} />
            </motion.div>

            <VibDivider />

            {/* ── History ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <div className="glass" style={{ padding: "18px 20px" }}>
                <PredictionHistory
                  history={localHistory}
                  onClear={handleClearHistory}
                />
              </div>
            </motion.div>

            {/* ── Footer ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                textAlign:  "center",
                padding:    "8px 0 4px",
                color:      "var(--text-dim)",
                fontSize:   "0.68rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              Neural Ink · EMNIST Balanced · PyTorch
              <br />
              <span style={{ fontSize: "0.62rem", opacity: 0.6 }}>
                47 classes · EMNISTNet CNN
              </span>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ── Scroll-to-result floating button (mobile) ── */}
      <ScrollArrow show={showArrow} onClick={scrollToResult} />

      {/* ── Desktop two-column override ── */}
      <style>{`
        @media (min-width: 900px) {
          .app-wrapper {
            max-width: 1100px !important;
          }
          .desktop-grid {
            display: grid !important;
            grid-template-columns: 1fr 380px;
            gap: 24px;
            align-items: start;
          }
          .desktop-right {
            position: sticky;
            top: 24px;
          }
        }
        /* iOS safe area support */
        @supports (padding: env(safe-area-inset-bottom)) {
          .app-wrapper {
            padding-bottom: calc(40px + env(safe-area-inset-bottom));
          }
        }
        /* Prevent double-tap zoom on buttons (iOS) */
        button { touch-action: manipulation; }
        /* Smooth scrolling everywhere */
        html { scroll-behavior: smooth; }
      `}</style>
    </>
  );
}
