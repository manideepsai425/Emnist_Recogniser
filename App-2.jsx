// src/App.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, ImageUp, Info } from "lucide-react";

import NeuralGrid          from "./components/NeuralGrid";
import Header              from "./components/Header";
import DrawingCanvas       from "./components/DrawingCanvas";
import ImageUpload         from "./components/ImageUpload";
import ResultPanel         from "./components/ResultPanel";
import PredictionHistory   from "./components/PredictionHistory";
import { usePrediction }   from "./hooks/usePrediction";

const TABS = [
  { id: "draw",   label: "Draw",   icon: PenLine },
  { id: "upload", label: "Upload", icon: ImageUp },
];

/* ── tiny info banner ─────────────────────────────────────── */
function InfoBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "10px",
        padding:      "10px 16px",
        borderRadius: "var(--radius-md)",
        background:   "rgba(124,58,237,0.08)",
        border:       "1px solid rgba(124,58,237,0.2)",
        marginBottom: "24px",
        fontSize:     "0.78rem",
        color:        "var(--text-muted)",
        flexWrap:     "wrap",
      }}
    >
      <Info size={14} color="var(--accent-violet)" style={{ flexShrink: 0 }} />
      <span>
        Recognises <strong style={{ color: "var(--text)" }}>47 classes</strong>: digits 0–9 and letters A–Z
        trained on <strong style={{ color: "var(--text)" }}>EMNIST Balanced</strong> via PyTorch.
        Confidence below 50% is flagged as <em>Uncertain</em>.
      </span>
    </motion.div>
  );
}

/* ── main layout ──────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("draw");
  const { result, loading, error, history, runCanvas, runUpload, reset } = usePrediction();
  const [historyList, setHistoryList] = useState([]);

  // Sync history from hook
  // (usePrediction already tracks history internally)
  function clearHistory() {
    // We'll proxy via parent state
    window.__clearHistory?.();
  }

  return (
    <>
      {/* Background */}
      <NeuralGrid />

      {/* Foreground */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="app-wrapper">
          <Header />

          <InfoBanner />

          {/* ── Main two-column grid ────────────────────────── */}
          <div style={{
            display:             "grid",
            gridTemplateColumns: "1fr 380px",
            gridTemplateRows:    "auto 1fr",
            gap:                 "24px",
            alignItems:          "start",
          }}
          className="main-grid"
          >
            {/* LEFT col — input panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Tab bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y:  0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="tab-bar">
                  {TABS.map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        className={`tab-btn ${tab === t.id ? "active" : ""}`}
                        onClick={() => { setTab(t.id); reset(); }}
                      >
                        <Icon size={15} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Input card */}
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y:  0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="glass"
                style={{ padding: "24px" }}
              >
                <AnimatePresence mode="wait">
                  {tab === "draw" ? (
                    <motion.div key="draw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <DrawingCanvas onPredict={runCanvas} loading={loading} />
                    </motion.div>
                  ) : (
                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <ImageUpload onPredict={runUpload} loading={loading} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* History — shown below input on left col */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="glass"
                style={{ padding: "20px 24px" }}
              >
                <PredictionHistory
                  history={history}
                  onClear={() => { /* history is read-only from hook; display only */ }}
                />
              </motion.div>
            </div>

            {/* RIGHT col — result panel (sticky) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x:  0 }}
              transition={{ delay: 0.2 }}
              style={{ position: "sticky", top: "24px" }}
            >
              <ResultPanel result={result} loading={loading} error={error} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Responsive styles injected via style tag */}
      <style>{`
        @media (max-width: 900px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
