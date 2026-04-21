// src/components/DrawingCanvas.jsx
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eraser, Zap, RotateCcw } from "lucide-react";
import { useCanvas } from "../hooks/useCanvas";

const BRUSH_SIZES = [
  { label: "S", size: 12 },
  { label: "M", size: 20 },
  { label: "L", size: 30 },
];

export default function DrawingCanvas({ onPredict, loading }) {
  const [brush, setBrush]   = useState(20);
  const [flash,  setFlash]  = useState(false);
  const { canvasRef, clear, getBase64, isEmpty } = useCanvas({ brushSize: brush });

  async function handlePredict() {
    const b64 = getBase64();
    if (!b64) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
    await onPredict(b64);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Brush size picker */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>BRUSH</span>
        {BRUSH_SIZES.map(b => (
          <button
            key={b.label}
            onClick={() => setBrush(b.size)}
            className="btn btn-ghost"
            style={{
              padding:     "6px 14px",
              fontSize:    "0.78rem",
              borderColor: brush === b.size ? "var(--accent-violet)" : undefined,
              color:       brush === b.size ? "var(--accent-cyan)"   : undefined,
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <motion.div
          animate={flash ? { boxShadow: "0 0 40px rgba(124,58,237,0.9)" } : { boxShadow: "0 0 0px rgba(124,58,237,0)" }}
          transition={{ duration: 0.3 }}
          style={{
            borderRadius: "var(--radius-lg)",
            overflow:     "hidden",
            border:       "1px solid var(--border-light)",
            background:   "#000",
            cursor:       "crosshair",
            touchAction:  "none",
          }}
        >
          <canvas
            ref={canvasRef}
            width={420}
            height={420}
            style={{ display: "block", width: "100%", aspectRatio: "1/1" }}
          />
        </motion.div>

        {/* Empty state hint */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position:   "absolute",
                inset:      0,
                display:    "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents:  "none",
              }}
            >
              <p style={{
                color:      "rgba(96,96,160,0.6)",
                fontSize:   "0.85rem",
                fontFamily: "var(--font-mono)",
                textAlign:  "center",
                lineHeight: 1.7,
              }}>
                Draw a digit or letter<br />
                <span style={{ fontSize: "0.75rem" }}>0–9 · A–Z</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={handlePredict}
          disabled={loading || isEmpty}
        >
          {loading
            ? <><SpinIcon /> Predicting…</>
            : <><Zap size={15} /> Predict</>
          }
        </button>
        <button
          className="btn btn-danger"
          style={{ flex: 1 }}
          onClick={clear}
          disabled={loading || isEmpty}
        >
          <Eraser size={15} /> Clear
        </button>
      </div>
    </div>
  );
}

function SpinIcon() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}
    />
  );
}
