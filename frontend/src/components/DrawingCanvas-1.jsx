// src/components/DrawingCanvas.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eraser, Zap } from "lucide-react";
import { useCanvas } from "../hooks/useCanvas";

const BRUSH_SIZES = [
  { label: "S", size: 10 },
  { label: "M", size: 20 },
  { label: "L", size: 32 },
];

function haptic(type = "light") {
  if (navigator?.vibrate) {
    navigator.vibrate(type === "light" ? 10 : type === "medium" ? 25 : 50);
  }
}

export default function DrawingCanvas({ onPredict, loading }) {
  const [brush,  setBrush]  = useState(20);
  const [flash,  setFlash]  = useState(false);
  const { canvasRef, clear, getBase64, isEmpty } = useCanvas({ brushSize: brush });

  async function handlePredict() {
    const b64 = getBase64();
    if (!b64 || isEmpty) return;
    haptic("medium");
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
    await onPredict(b64);
  }

  function handleClear() {
    haptic("light");
    clear();
  }

  function handleBrush(size) {
    haptic("light");
    setBrush(size);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Brush picker */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          color:         "var(--text-muted)",
          fontSize:      "0.7rem",
          letterSpacing: "0.1em",
          marginRight:   "4px",
        }}>
          BRUSH
        </span>
        {BRUSH_SIZES.map(b => (
          <motion.button
            key={b.label}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleBrush(b.size)}
            style={{
              padding:      "8px 16px",
              borderRadius: "var(--radius-xl)",
              border:       `1px solid ${brush === b.size ? "var(--vib-purple)" : "var(--border)"}`,
              background:   brush === b.size ? "rgba(155,93,229,0.18)" : "var(--surface-2)",
              color:        brush === b.size ? "var(--vib-cyan)" : "var(--text-muted)",
              fontFamily:   "var(--font-mono)",
              fontSize:     "0.78rem",
              cursor:       "pointer",
              transition:   "all 0.2s",
              boxShadow:    brush === b.size ? "0 0 12px rgba(155,93,229,0.3)" : "none",
            }}
          >
            {b.label}
          </motion.button>
        ))}
      </div>

      {/* Canvas container */}
      <div style={{ position: "relative" }}>
        <motion.div
          animate={flash
            ? { boxShadow: "0 0 0 2px var(--vib-purple), 0 0 60px rgba(155,93,229,0.7), 0 0 100px rgba(0,187,249,0.3)" }
            : { boxShadow: "0 0 0 1px var(--border)" }
          }
          transition={{ duration: 0.4 }}
          style={{
            borderRadius: "var(--radius-lg)",
            overflow:     "hidden",
            background:   "#000",
            touchAction:  "none",
            cursor:       "crosshair",
          }}
        >
          <canvas
            ref={canvasRef}
            width={420}
            height={420}
            style={{ display: "block", width: "100%", aspectRatio: "1/1" }}
          />
        </motion.div>

        {/* Empty hint overlay */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position:       "absolute",
                inset:          0,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                pointerEvents:  "none",
                gap:            "8px",
              }}
            >
              {/* Animated circle rings */}
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0, 0.15] }}
                  transition={{ duration: 3, delay: i * 1, repeat: Infinity }}
                  style={{
                    position:     "absolute",
                    width:        80 + i * 40,
                    height:       80 + i * 40,
                    borderRadius: "50%",
                    border:       "1px solid var(--vib-purple)",
                  }}
                />
              ))}
              <p style={{
                color:      "rgba(88,88,122,0.7)",
                fontSize:   "0.82rem",
                fontFamily: "var(--font-mono)",
                textAlign:  "center",
                lineHeight: 1.8,
                position:   "relative",
              }}>
                Draw a digit or letter<br />
                <span style={{ fontSize: "0.7rem", color: "rgba(88,88,122,0.5)" }}>0–9 · A–Z</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn btn-primary"
          style={{ flex: 2, borderRadius: "var(--radius-lg)" }}
          onClick={handlePredict}
          disabled={loading || isEmpty}
        >
          {loading
            ? <><SpinIcon /> Predicting…</>
            : <><Zap size={15} /> Predict</>
          }
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn btn-danger"
          style={{ flex: 1, borderRadius: "var(--radius-lg)" }}
          onClick={handleClear}
          disabled={loading || isEmpty}
        >
          <Eraser size={15} />
          Clear
        </motion.button>
      </div>
    </div>
  );
}

function SpinIcon() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width:        15, height: 15,
        border:       "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        flexShrink:   0,
      }}
    />
  );
}
