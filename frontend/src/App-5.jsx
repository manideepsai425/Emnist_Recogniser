// src/App.jsx  ─── Neural Ink · EMNIST Recogniser · Polished UI v4
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { PenLine, ImageUp, Info, X, ChevronDown, Sparkles, Brain, Cpu } from "lucide-react";

import NeuralGrid        from "./components/NeuralGrid";
import Header            from "./components/Header";
import DrawingCanvas     from "./components/DrawingCanvas";
import ImageUpload       from "./components/ImageUpload";
import ResultPanel       from "./components/ResultPanel";
import PredictionHistory from "./components/PredictionHistory";
import { usePrediction } from "./hooks/usePrediction";

// ─────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS  — dark neural / ink palette
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:          "#06080F",
  surface:     "#0C1120",
  surfaceUp:   "#121929",
  border:      "rgba(255,255,255,0.09)",
  borderBright:"rgba(255,255,255,0.16)",
  purple:      "#7C3AED",
  purpleLight: "#A78BFA",
  cyan:        "#06B6D4",
  cyanLight:   "#67E8F9",
  pink:        "#EC4899",
  pinkLight:   "#F9A8D4",
  green:       "#10B981",
  amber:       "#F59E0B",
  red:         "#EF4444",
  white:       "#FFFFFF",
  offWhite:    "#F1F5F9",
  muted:       "#94A3B8",
  dim:         "#475569",
};

// ─────────────────────────────────────────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "draw",   label: "Draw",   icon: PenLine },
  { id: "upload", label: "Upload", icon: ImageUp  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  HAPTIC
// ─────────────────────────────────────────────────────────────────────────────
function haptic(ms = 10) {
  navigator?.vibrate?.(ms);
}

// ─────────────────────────────────────────────────────────────────────────────
//  AMBIENT BACKGROUND ORBS
// ─────────────────────────────────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <motion.div
        animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "-140px", left: "-100px",
          width: "380px", height: "380px", borderRadius: "50%",
          background: `radial-gradient(circle, ${T.purple}28 0%, transparent 68%)`,
        }}
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 22, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{
          position: "absolute", bottom: "-100px", right: "-80px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: `radial-gradient(circle, ${T.cyan}1E 0%, transparent 68%)`,
        }}
      />
      <motion.div
        animate={{ x: [0, 14, -10, 0], y: [0, 20, -8, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        style={{
          position: "absolute", top: "45%", left: "20%",
          width: "220px", height: "220px", borderRadius: "50%",
          background: `radial-gradient(circle, ${T.pink}12 0%, transparent 68%)`,
        }}
      />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, ${T.purpleLight}14 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(ellipse 75% 75% at 50% 40%, black, transparent)",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  NEURAL INK HERO
// ─────────────────────────────────────────────────────────────────────────────
function NeuralInkHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1,   y: 0  }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      style={{ textAlign: "center", marginBottom: "22px" }}
    >
      <motion.div
        animate={{ y: [0, -7, 0], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: "2.6rem", marginBottom: "10px", display: "inline-block" }}
      >
        ✍️
      </motion.div>

      <h1 style={{
        margin: 0,
        fontSize: "clamp(1.8rem, 8vw, 2.6rem)",
        fontWeight: 900,
        letterSpacing: "-0.03em",
        lineHeight: 1.1,
      }}>
        <span style={{ color: T.white }}>Neural </span>
        <motion.span
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            background: `linear-gradient(90deg, ${T.purpleLight}, ${T.cyan}, ${T.pink}, ${T.purpleLight})`,
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Ink
        </motion.span>
      </h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          margin: "8px 0 0", color: T.muted,
          fontSize: "0.82rem", letterSpacing: "0.01em", lineHeight: 1.6,
        }}
      >
        Handwritten digit &amp; letter recognition —<br />
        powered by PyTorch
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45 }}
        style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "14px" }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 13px", borderRadius: "99px",
          background: `${T.purple}22`, border: `1px solid ${T.purple}44`,
          fontSize: "0.7rem", fontWeight: 600, color: T.purpleLight, letterSpacing: "0.06em",
        }}>
          ✦ EMNIST · 47 classes
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 13px", borderRadius: "99px",
          background: `${T.green}18`, border: `1px solid ${T.green}44`,
          fontSize: "0.7rem", fontWeight: 600, color: T.green,
        }}>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.green }}
          />
          Model online
        </span>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MODEL CHIPS
// ─────────────────────────────────────────────────────────────────────────────
function ModelChips() {
  const chips = [
    { icon: <Brain size={13} />,    label: "EMNISTNet CNN", col: T.purpleLight },
    { icon: <Cpu   size={13} />,    label: "PyTorch",       col: T.cyan        },
    { icon: <Sparkles size={13} />, label: "47 Classes",    col: T.pink        },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1,  y: 0 }}
      transition={{ delay: 0.5 }}
      style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", marginBottom: "22px" }}
    >
      {chips.map((c, i) => (
        <motion.span key={c.label}
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.52 + i * 0.08 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "5px 12px", borderRadius: "99px",
            background: `${c.col}14`, border: `1px solid ${c.col}33`,
            fontSize: "0.7rem", fontWeight: 600, color: c.col,
          }}
        >
          {c.icon}{c.label}
        </motion.span>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  INFO BANNER
// ─────────────────────────────────────────────────────────────────────────────
function InfoBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1,   y: 0  }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "13px 14px", borderRadius: "14px",
        background: `linear-gradient(135deg, ${T.purple}15, ${T.cyan}0C)`,
        border: `1px solid ${T.purple}33`,
        marginBottom: "20px", position: "relative",
        boxShadow: `0 4px 20px ${T.purple}18`,
      }}
    >
      <motion.div
        animate={{ scaleY: [0.5, 1, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity }}
        style={{
          position: "absolute", left: 0, top: "18%", bottom: "18%",
          width: "3px", borderRadius: "99px",
          background: `linear-gradient(180deg, ${T.purple}, ${T.cyan})`,
        }}
      />
      <Info size={14} color={T.purpleLight} style={{ flexShrink: 0, marginTop: "2px" }} />
      <span style={{ color: T.muted, fontSize: "0.77rem", lineHeight: 1.65, flex: 1 }}>
        Recognises{" "}
        <strong style={{ color: T.cyan }}>47 classes</strong>: digits 0–9 and letters A–Z
        trained on{" "}
        <strong style={{ color: T.purpleLight }}>EMNIST Balanced</strong> via PyTorch.
        Confidence below 50% is flagged as{" "}
        <em style={{ color: T.pink }}>Uncertain</em>.
      </span>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => { haptic(8); setVisible(false); }}
        style={{
          background: `${T.muted}18`, border: "none", cursor: "pointer",
          color: T.muted, padding: "4px", borderRadius: "50%",
          flexShrink: 0, display: "flex", alignItems: "center",
        }}
      >
        <X size={12} />
      </motion.button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TOP LOADING BAR
// ─────────────────────────────────────────────────────────────────────────────
function LoadingBar({ loading }) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div key="lbar"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0,
            height: "3px", zIndex: 999, background: `${T.purple}22`,
          }}
        >
          <motion.div
            animate={{ x: ["-100%", "150%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            style={{
              height: "100%", width: "55%",
              background: `linear-gradient(90deg, transparent, ${T.purple}, ${T.cyan}, transparent)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCROLL ARROW
// ─────────────────────────────────────────────────────────────────────────────
function ScrollArrow({ show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button key="arrow"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          onClick={onClick}
          style={{
            position: "fixed", bottom: "calc(30px + var(--safe-bottom, 0px))",
            left: "50%", transform: "translateX(-50%)", zIndex: 200,
            background: `linear-gradient(135deg, ${T.purple}, ${T.cyan})`,
            border: "none", borderRadius: "99px", padding: "11px 24px",
            color: T.white, fontSize: "0.82rem", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "7px",
            boxShadow: `0 6px 32px ${T.purple}55`,
          }}
        >
          View Result
          <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.1 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION LABEL
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <div style={{
        width: "3px", height: "13px", borderRadius: "2px",
        background: `linear-gradient(180deg, ${T.purple}, ${T.cyan})`,
      }} />
      <p style={{
        margin: 0, color: T.dim,
        fontSize: "0.67rem", letterSpacing: "0.14em",
        textTransform: "uppercase", fontWeight: 600,
      }}>
        {children}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function VibDivider() {
  return (
    <motion.div
      initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7 }}
      style={{
        height: "1px",
        background: `linear-gradient(90deg, transparent, ${T.purple}55, ${T.cyan}55, transparent)`,
        margin: "4px 0", transformOrigin: "left",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ tab, onTabChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      style={{
        display: "flex", background: `rgba(255,255,255,0.04)`,
        border: `1px solid ${T.border}`, borderRadius: "14px",
        padding: "5px", gap: "4px", backdropFilter: "blur(12px)",
      }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => onTabChange(t.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", gap: "7px", padding: "11px 0",
              border: "none", borderRadius: "10px", cursor: "pointer",
              fontSize: "0.82rem", fontWeight: active ? 700 : 500,
              position: "relative", overflow: "hidden",
              background: active ? `linear-gradient(135deg, ${T.purple}EE, ${T.purpleLight}BB)` : "transparent",
              color: active ? T.white : T.muted,
              boxShadow: active ? `0 4px 18px ${T.purple}44` : "none",
              transition: "all 0.22s ease",
            }}
          >
            {active && (
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: "200%" }}
                transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                }}
              />
            )}
            <Icon size={15} />{t.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  INPUT CARD
// ─────────────────────────────────────────────────────────────────────────────
function InputCard({ tab, loading, onRunCanvas, onRunUpload, inputRef }) {
  return (
    <motion.div ref={inputRef}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
    >
      <SectionLabel>
        {tab === "draw" ? "Draw your character" : "Upload an image"}
      </SectionLabel>
      <div style={{
        background: `linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))`,
        border: `1px solid ${T.border}`, borderRadius: "20px", padding: "20px",
        backdropFilter: "blur(16px)",
        boxShadow: `0 8px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, width: "36px", height: "36px",
          borderTop: `2px solid ${T.purple}50`, borderLeft: `2px solid ${T.purple}50`,
          borderRadius: "20px 0 0 0", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: 0, right: 0, width: "36px", height: "36px",
          borderBottom: `2px solid ${T.cyan}44`, borderRight: `2px solid ${T.cyan}44`,
          borderRadius: "0 0 20px 0", pointerEvents: "none",
        }} />
        <AnimatePresence mode="wait">
          {tab === "draw" ? (
            <motion.div key="draw"
              initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }}
            >
              <DrawingCanvas onPredict={onRunCanvas} loading={loading} />
            </motion.div>
          ) : (
            <motion.div key="upload"
              initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}
            >
              <ImageUpload onPredict={onRunUpload} loading={loading} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIDENCE METER
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceMeter({ value }) {
  if (!value) return null;
  const pct = Math.round(value * 100);
  const col = pct >= 75 ? T.green : pct >= 50 ? T.amber : T.red;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{
        padding: "12px 16px", background: `${col}0D`,
        border: `1px solid ${col}28`, borderRadius: "14px",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: "7px",
        fontSize: "0.68rem", color: T.muted, letterSpacing: "0.1em", fontWeight: 600,
      }}>
        <span>CONFIDENCE</span>
        <span style={{ color: col }}>{pct}%</span>
      </div>
      <div style={{ height: "6px", borderRadius: "99px", background: `rgba(255,255,255,0.08)`, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: "99px",
            background: `linear-gradient(90deg, ${col}99, ${col})`,
            boxShadow: `0 0 10px ${col}88`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESULT WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function ResultWrapper({ result, loading, error, resultRef }) {
  const controls = useAnimation();
  useEffect(() => {
    if (result && !loading && !error) {
      controls.start({
        boxShadow: [`0 0 0px ${T.purple}00`, `0 0 44px ${T.purple}50`, `0 0 0px ${T.purple}00`],
        transition: { duration: 1.3 },
      });
    }
  }, [result, loading, error]);

  return (
    <motion.div ref={resultRef} id="result-anchor"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
    >
      <SectionLabel>Prediction</SectionLabel>
      <motion.div animate={controls} style={{ borderRadius: "20px", position: "relative" }}>
        <ResultPanel result={result} loading={loading} error={error} />
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HISTORY CARD
// ─────────────────────────────────────────────────────────────────────────────
function HistoryCard({ history, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
      style={{
        background: `linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
        border: `1px solid ${T.border}`, borderRadius: "20px", padding: "18px 20px",
        backdropFilter: "blur(12px)", boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      <PredictionHistory history={history} onClear={onClear} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  const pills = [
    ["Neural Ink", T.purpleLight], ["EMNIST Balanced", T.cyan],
    ["PyTorch", T.amber],          ["47 classes", T.pink],
    ["EMNISTNet CNN", T.green],
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
      style={{ textAlign: "center", padding: "12px 0 4px" }}
    >
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", marginBottom: "10px" }}>
        {pills.map(([label, col]) => (
          <span key={label} style={{
            padding: "3px 10px", borderRadius: "99px",
            border: `1px solid ${col}33`, background: `${col}10`,
            fontSize: "0.63rem", fontWeight: 600, color: col, letterSpacing: "0.05em",
          }}>{label}</span>
        ))}
      </div>
      <p style={{ color: T.dim, fontSize: "0.6rem", opacity: 0.5, margin: 0, letterSpacing: "0.06em" }}>
        Neural Ink · EMNIST Balanced · PyTorch · v4
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,       setTab]       = useState("draw");
  const [showArrow, setShowArrow] = useState(false);
  const resultRef = useRef(null);
  const inputRef  = useRef(null);

  const { result, loading, error, history, runCanvas, runUpload, reset } = usePrediction();
  const [localHistory, setLocalHistory] = useState([]);
  useEffect(() => { setLocalHistory(history); }, [history]);

  // Auto-scroll to result
  useEffect(() => {
    if (result && !loading) {
      const panel = resultRef.current;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        if (rect.top > window.innerHeight || rect.bottom < 0) {
          setShowArrow(true);
          setTimeout(() => setShowArrow(false), 4500);
        } else {
          setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: "nearest" }), 280);
        }
      }
    }
  }, [result, loading]);

  // Haptic feedback
  useEffect(() => {
    if (result && !loading && !error) {
      result.uncertain ? haptic(40) : navigator?.vibrate?.([15, 80, 15]);
    }
  }, [result, loading, error]);

  const scrollToResult  = useCallback(() => { haptic(8); setShowArrow(false); resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const handleTabChange = useCallback((id) => { haptic(8); setTab(id); reset(); }, [reset]);
  const handleClearHist = useCallback(() => { haptic(20); setLocalHistory([]); }, []);

  const confidence = result?.confidence ?? result?.topK?.[0]?.prob ?? null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --vib-purple:  ${T.purple};
          --vib-cyan:    ${T.cyan};
          --vib-pink:    ${T.pink};
          --text-muted:  ${T.muted};
          --text-dim:    ${T.dim};
          --text-bright: ${T.white};
          --font-mono:   'JetBrains Mono', monospace;
          --radius-lg:   14px;
          --radius-xl:   20px;
          --safe-bottom: env(safe-area-inset-bottom, 0px);
        }

        *, *::before, *::after { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0; background: ${T.bg}; color: ${T.white};
          font-family: 'Outfit', system-ui, sans-serif;
          min-height: 100dvh; overflow-x: hidden;
        }

        .app-wrapper {
          max-width: 480px; margin: 0 auto;
          padding: 28px 16px calc(64px + var(--safe-bottom));
        }
        .glass {
          background: rgba(255,255,255,0.04);
          border: 1px solid ${T.border};
          border-radius: 20px; backdrop-filter: blur(12px);
        }
        .glass-bright {
          background: linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02));
          border: 1px solid ${T.border};
          border-radius: 20px; backdrop-filter: blur(14px);
          box-shadow: 0 8px 40px rgba(0,0,0,0.22);
        }
        .tab-bar {
          display: flex; background: rgba(255,255,255,0.04);
          border: 1px solid ${T.border}; border-radius: 14px;
          padding: 5px; gap: 4px; backdrop-filter: blur(12px);
        }
        .tab-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 7px; padding: 11px 0; border: none; border-radius: 10px;
          cursor: pointer; font-size: 0.82rem; font-weight: 500;
          background: transparent; color: ${T.muted}; transition: all 0.22s ease;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, ${T.purple}EE, ${T.purpleLight}BB);
          color: ${T.white}; font-weight: 700;
          box-shadow: 0 4px 18px ${T.purple}44;
        }
        @keyframes resultFlash {
          0%   { box-shadow: 0 0 0   ${T.purple}00; }
          50%  { box-shadow: 0 0 44px ${T.purple}50; }
          100% { box-shadow: 0 0 0   ${T.purple}00; }
        }
        .result-flash { animation: resultFlash 1.2s ease-out forwards; }
        button { touch-action: manipulation; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.purple}55; border-radius: 99px; }

        @media (min-width: 900px) {
          .app-wrapper { max-width: 1100px !important; }
          .desktop-grid { display: grid !important; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }
          .desktop-right { position: sticky; top: 24px; }
        }
        @supports (padding: env(safe-area-inset-bottom)) {
          .app-wrapper { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
        }
      `}</style>

      <AmbientOrbs />
      <LoadingBar loading={loading} />
      <NeuralGrid />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="app-wrapper">

          <NeuralInkHero />
          <ModelChips />
          <Header />

          <AnimatePresence><InfoBanner key="info" /></AnimatePresence>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <TabBar tab={tab} onTabChange={handleTabChange} />
            <InputCard tab={tab} loading={loading} onRunCanvas={runCanvas} onRunUpload={runUpload} inputRef={inputRef} />
            <ResultWrapper result={result} loading={loading} error={error} resultRef={resultRef} />
            {result && !loading && <ConfidenceMeter value={confidence} />}
            <VibDivider />
            <HistoryCard history={localHistory} onClear={handleClearHist} />
            <Footer />
          </div>

        </div>
      </div>

      <ScrollArrow show={showArrow} onClick={scrollToResult} />
    </>
  );
}
