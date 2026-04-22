// src/App.jsx  ─── Peddapalli Road Risk · Neural Ink · Polished UI v3
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { PenLine, ImageUp, Info, X, ChevronDown, Zap, Shield, Brain } from "lucide-react";

import NeuralGrid        from "./components/NeuralGrid";
import Header            from "./components/Header";
import DrawingCanvas     from "./components/DrawingCanvas";
import ImageUpload       from "./components/ImageUpload";
import ResultPanel       from "./components/ResultPanel";
import PredictionHistory from "./components/PredictionHistory";
import { usePrediction } from "./hooks/usePrediction";

// ─────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS  (mirrors the road-risk app palette from screenshots)
// ─────────────────────────────────────────────────────────────────────────────
const TOKEN = {
  navyDeep:    "#050D1A",
  navyCard:    "#0A1628",
  navyMid:     "#0F2040",
  navyLight:   "#16305A",
  royalBlue:   "#1D4ED8",
  skyBlue:     "#3B82F6",
  cyanAcc:     "#06B6D4",
  safeGreen:   "#16A34A",
  safeLight:   "#DCFCE7",
  warnAmber:   "#D97706",
  warnLight:   "#FEF3C7",
  dangerRed:   "#DC2626",
  dangerLight: "#FEE2E2",
  white:       "#FFFFFF",
  offWhite:    "#F8FAFC",
  textDark:    "#1E293B",
  textMid:     "#475569",
  textLight:   "#94A3B8",
  glassBg:     "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.12)",
};

// ─────────────────────────────────────────────────────────────────────────────
//  TAB CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "draw",   label: "Draw",   icon: PenLine },
  { id: "upload", label: "Upload", icon: ImageUp  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  HAPTIC HELPER
// ─────────────────────────────────────────────────────────────────────────────
function haptic(ms = 10) {
  if (navigator?.vibrate) navigator.vibrate(ms);
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANIMATED BACKGROUND PARTICLES
// ─────────────────────────────────────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Large deep-navy orb – top left */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position:     "absolute",
          top:          "-120px",
          left:         "-120px",
          width:        "420px",
          height:       "420px",
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${TOKEN.royalBlue}22 0%, transparent 70%)`,
        }}
      />
      {/* Cyan orb – bottom right */}
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 20, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{
          position:     "absolute",
          bottom:       "-80px",
          right:        "-80px",
          width:        "320px",
          height:       "320px",
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${TOKEN.cyanAcc}1A 0%, transparent 70%)`,
        }}
      />
      {/* Green orb – centre */}
      <motion.div
        animate={{ x: [0, 15, -10, 0], y: [0, 25, -10, 0], scale: [1, 1.05, 0.95, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{
          position:     "absolute",
          top:          "40%",
          left:         "30%",
          width:        "260px",
          height:       "260px",
          borderRadius: "50%",
          background:   `radial-gradient(circle, ${TOKEN.safeGreen}12 0%, transparent 70%)`,
        }}
      />
      {/* Subtle grid overlay */}
      <div style={{
        position:   "absolute",
        inset:      0,
        backgroundImage: `
          linear-gradient(${TOKEN.skyBlue}08 1px, transparent 1px),
          linear-gradient(90deg, ${TOKEN.skyBlue}08 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        maskImage:      "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  BRAND BADGE  (top of header area)
// ─────────────────────────────────────────────────────────────────────────────
function BrandBadges() {
  const badges = [
    { label: "Random Forest",    icon: "🌲", col: TOKEN.safeGreen  },
    { label: "Gradient Boost",   icon: "⚡", col: TOKEN.warnAmber  },
    { label: "Dijkstra Routing", icon: "🗺️", col: TOKEN.skyBlue    },
    { label: "14-Factor Model",  icon: "🧠", col: TOKEN.cyanAcc    },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1,  y: 0   }}
      transition={{ delay: 0.25, duration: 0.5 }}
      style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "18px" }}
    >
      {badges.map((b, i) => (
        <motion.span
          key={b.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1   }}
          transition={{ delay: 0.3 + i * 0.08 }}
          whileTap={{ scale: 0.94 }}
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          "5px",
            padding:      "5px 11px",
            borderRadius: "99px",
            border:       `1px solid ${b.col}44`,
            background:   `${b.col}14`,
            fontSize:     "0.7rem",
            fontWeight:   600,
            color:        b.col,
            letterSpacing:"0.03em",
          }}
        >
          <span style={{ fontSize: "0.78rem" }}>{b.icon}</span>
          {b.label}
        </motion.span>
      ))}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATS ROW  (decorative, shows model meta-stats)
// ─────────────────────────────────────────────────────────────────────────────
function StatsRow() {
  const stats = [
    { val: "117",   label: "Road Segments", icon: "🛣️"  },
    { val: "47",    label: "Classes",       icon: "🔢"  },
    { val: "NCRB",  label: "Dataset",       icon: "📊"  },
    { val: "2023",  label: "Data Year",     icon: "📅"  },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ delay: 0.45, duration: 0.5 }}
      style={{
        display:       "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap:           "8px",
        marginBottom:  "20px",
      }}
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1    }}
          transition={{ delay: 0.5 + i * 0.07 }}
          style={{
            background:   TOKEN.glassBg,
            border:       `1px solid ${TOKEN.glassBorder}`,
            borderRadius: "12px",
            padding:      "10px 6px",
            textAlign:    "center",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontSize: "1.1rem", marginBottom: "3px" }}>{s.icon}</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: TOKEN.skyBlue }}>{s.val}</div>
          <div style={{ fontSize: "0.58rem", color: TOKEN.textLight, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
        </motion.div>
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
    <AnimatePresence>
      <motion.div
        key="info-banner"
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1,  y: 0,  scale: 1    }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        style={{
          display:      "flex",
          alignItems:   "flex-start",
          gap:          "10px",
          padding:      "13px 15px",
          borderRadius: "14px",
          background:   `linear-gradient(135deg, ${TOKEN.royalBlue}18, ${TOKEN.cyanAcc}0D)`,
          border:       `1px solid ${TOKEN.skyBlue}33`,
          marginBottom: "20px",
          position:     "relative",
          boxShadow:    `0 2px 18px ${TOKEN.royalBlue}1A`,
        }}
      >
        {/* Animated left accent bar */}
        <motion.div
          animate={{ scaleY: [0.6, 1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position:     "absolute",
            left:         0,
            top:          "20%",
            bottom:       "20%",
            width:        "3px",
            borderRadius: "99px",
            background:   `linear-gradient(180deg, ${TOKEN.skyBlue}, ${TOKEN.cyanAcc})`,
          }}
        />
        <Info size={14} color={TOKEN.skyBlue} style={{ flexShrink: 0, marginTop: "2px" }} />
        <span style={{ color: TOKEN.textLight, fontSize: "0.77rem", lineHeight: 1.65, flex: 1 }}>
          Recognises{" "}
          <strong style={{ color: TOKEN.cyanAcc }}>47 classes</strong>: digits 0–9 and
          letters A–Z trained on{" "}
          <strong style={{ color: TOKEN.skyBlue }}>EMNIST Balanced</strong> via PyTorch.
          Confidence below 50% is flagged as{" "}
          <em style={{ color: TOKEN.dangerRed }}>Uncertain</em>.
        </span>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => { haptic(8); setVisible(false); }}
          style={{
            background:   `${TOKEN.textLight}18`,
            border:       "none",
            cursor:       "pointer",
            color:        TOKEN.textLight,
            padding:      "4px",
            borderRadius: "50%",
            flexShrink:   0,
            display:      "flex",
            alignItems:   "center",
          }}
        >
          <X size={12} />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCROLL ARROW  (floating CTA after result appears off-screen)
// ─────────────────────────────────────────────────────────────────────────────
function ScrollArrow({ show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="scroll-arrow"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,  scale: 1   }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          onClick={onClick}
          style={{
            position:     "fixed",
            bottom:       "calc(32px + var(--safe-bottom, 0px))",
            left:         "50%",
            transform:    "translateX(-50%)",
            zIndex:       200,
            background:   `linear-gradient(135deg, ${TOKEN.royalBlue}, ${TOKEN.cyanAcc})`,
            border:       "none",
            borderRadius: "99px",
            padding:      "12px 26px",
            color:        TOKEN.white,
            fontSize:     "0.82rem",
            fontWeight:   700,
            letterSpacing:"0.04em",
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            gap:          "8px",
            boxShadow:    `0 6px 32px ${TOKEN.royalBlue}55, 0 0 0 1px ${TOKEN.cyanAcc}44`,
          }}
        >
          <Zap size={14} />
          View Result
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.1 }}
          >
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
function SectionLabel({ children, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1,  x: 0  }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "8px",
        marginBottom: "10px",
      }}
    >
      {accent && (
        <div style={{
          width:        "3px",
          height:       "14px",
          borderRadius: "2px",
          background:   `linear-gradient(180deg, ${TOKEN.skyBlue}, ${TOKEN.cyanAcc})`,
        }} />
      )}
      <p style={{
        color:         TOKEN.textLight,
        fontSize:      "0.68rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight:    600,
        margin:        0,
      }}>
        {children}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GRADIENT DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function VibDivider() {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      style={{
        height:        "1px",
        background:    `linear-gradient(90deg, transparent, ${TOKEN.royalBlue}66, ${TOKEN.cyanAcc}66, transparent)`,
        margin:        "6px 0",
        transformOrigin: "left",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB BAR  (polished pill design)
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ tab, onTabChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1,  y: 0 }}
      transition={{ delay: 0.12 }}
      style={{
        display:       "flex",
        background:    TOKEN.glassBg,
        border:        `1px solid ${TOKEN.glassBorder}`,
        borderRadius:  "14px",
        padding:       "5px",
        gap:           "4px",
        backdropFilter:"blur(10px)",
      }}
    >
      {TABS.map((t, i) => {
        const Icon   = t.icon;
        const active = tab === t.id;
        return (
          <motion.button
            key={t.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.07 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTabChange(t.id)}
            style={{
              flex:         1,
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              gap:          "7px",
              padding:      "11px 0",
              border:       "none",
              borderRadius: "10px",
              cursor:       "pointer",
              fontSize:     "0.82rem",
              fontWeight:   active ? 700 : 500,
              position:     "relative",
              overflow:     "hidden",
              transition:   "all 0.25s ease",
              background:   active
                ? `linear-gradient(135deg, ${TOKEN.royalBlue}, ${TOKEN.skyBlue}CC)`
                : "transparent",
              color:        active ? TOKEN.white : TOKEN.textLight,
              boxShadow:    active ? `0 4px 16px ${TOKEN.royalBlue}44` : "none",
            }}
          >
            {/* Active shimmer */}
            {active && (
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                style={{
                  position:   "absolute",
                  inset:      0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  pointerEvents: "none",
                }}
              />
            )}
            <Icon size={15} />
            {t.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  INPUT CARD  (wraps DrawingCanvas / ImageUpload)
// ─────────────────────────────────────────────────────────────────────────────
function InputCard({ tab, loading, onRunCanvas, onRunUpload, inputRef }) {
  return (
    <motion.div
      ref={inputRef}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ delay: 0.2 }}
    >
      <SectionLabel accent>
        {tab === "draw" ? "Draw your character" : "Upload an image"}
      </SectionLabel>

      <motion.div
        style={{
          background:    `linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))`,
          border:        `1px solid ${TOKEN.glassBorder}`,
          borderRadius:  "20px",
          padding:       "20px",
          backdropFilter:"blur(14px)",
          boxShadow:     `0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)`,
          position:      "relative",
          overflow:      "hidden",
        }}
      >
        {/* Corner accent lines */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: "40px", height: "40px",
          borderTop: `2px solid ${TOKEN.skyBlue}55`,
          borderLeft: `2px solid ${TOKEN.skyBlue}55`,
          borderRadius: "20px 0 0 0",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: "40px", height: "40px",
          borderBottom: `2px solid ${TOKEN.cyanAcc}44`,
          borderRight:  `2px solid ${TOKEN.cyanAcc}44`,
          borderRadius: "0 0 20px 0",
          pointerEvents: "none",
        }} />

        <AnimatePresence mode="wait">
          {tab === "draw" ? (
            <motion.div
              key="draw-panel"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1,  x: 0   }}
              exit={{ opacity: 0,   x:  14   }}
              transition={{ duration: 0.22 }}
            >
              <DrawingCanvas onPredict={onRunCanvas} loading={loading} />
            </motion.div>
          ) : (
            <motion.div
              key="upload-panel"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1,  x: 0  }}
              exit={{ opacity: 0,   x: -14  }}
              transition={{ duration: 0.22 }}
            >
              <ImageUpload onPredict={onRunUpload} loading={loading} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESULT WRAPPER  (adds flash + glow on new result)
// ─────────────────────────────────────────────────────────────────────────────
function ResultWrapper({ result, loading, error, resultRef }) {
  const controls = useAnimation();

  useEffect(() => {
    if (result && !loading && !error) {
      controls.start({
        boxShadow: [
          `0 0 0px ${TOKEN.safeGreen}00`,
          `0 0 40px ${TOKEN.safeGreen}55`,
          `0 0 0px ${TOKEN.safeGreen}00`,
        ],
        transition: { duration: 1.2, ease: "easeOut" },
      });
    }
  }, [result, loading, error, controls]);

  return (
    <motion.div
      ref={resultRef}
      id="result-anchor"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ delay: 0.28 }}
    >
      <SectionLabel accent>Prediction</SectionLabel>

      {/* Result flash overlay */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            key={`flash-${result?.id ?? "r"}`}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0   }}
            transition={{ duration: 0.7 }}
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "20px",
              background:   `${TOKEN.safeGreen}18`,
              pointerEvents:"none",
              zIndex:       10,
            }}
          />
        )}
      </AnimatePresence>

      {/* Glowing wrapper */}
      <motion.div animate={controls} style={{ borderRadius: "20px", position: "relative" }}>
        <ResultPanel result={result} loading={loading} error={error} />
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HISTORY WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function HistoryWrapper({ history, onClear }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ delay: 0.38 }}
      style={{
        background:    `linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
        border:        `1px solid ${TOKEN.glassBorder}`,
        borderRadius:  "20px",
        padding:       "18px 20px",
        backdropFilter:"blur(10px)",
        boxShadow:     "0 4px 24px rgba(0,0,0,0.18)",
      }}
    >
      <PredictionHistory history={history} onClear={onClear} />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOADING PULSE BAR  (visible while inference runs)
// ─────────────────────────────────────────────────────────────────────────────
function LoadingBar({ loading }) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="loading-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position:     "fixed",
            top:          0,
            left:         0,
            right:        0,
            height:       "3px",
            zIndex:       999,
            overflow:     "hidden",
            background:   `${TOKEN.royalBlue}22`,
          }}
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              height:     "100%",
              width:      "60%",
              background: `linear-gradient(90deg, transparent, ${TOKEN.skyBlue}, ${TOKEN.cyanAcc}, transparent)`,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  const pills = [
    { label: "Neural Ink",       col: TOKEN.skyBlue   },
    { label: "EMNIST Balanced",  col: TOKEN.cyanAcc   },
    { label: "PyTorch",         col: TOKEN.warnAmber  },
    { label: "47 classes",      col: TOKEN.safeGreen  },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55 }}
      style={{ textAlign: "center", padding: "14px 0 6px" }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "10px" }}>
        {pills.map((p, i) => (
          <motion.span
            key={p.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1   }}
            transition={{ delay: 0.6 + i * 0.06 }}
            style={{
              padding:      "3px 10px",
              borderRadius: "99px",
              border:       `1px solid ${p.col}33`,
              background:   `${p.col}12`,
              fontSize:     "0.65rem",
              fontWeight:   600,
              color:        p.col,
              letterSpacing:"0.05em",
            }}
          >
            {p.label}
          </motion.span>
        ))}
      </div>
      <p style={{ color: TOKEN.textLight, fontSize: "0.62rem", opacity: 0.55, margin: 0, letterSpacing: "0.06em" }}>
        Peddapalli District · ML Risk Analysis · NCRB 2023 · Telangana Police
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LIVE INDICATOR  (pulsing "live" dot)
// ─────────────────────────────────────────────────────────────────────────────
function LiveIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "6px",
        justifyContent:"center",
        marginBottom: "16px",
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{
          width:        "7px",
          height:       "7px",
          borderRadius: "50%",
          background:   TOKEN.safeGreen,
          boxShadow:    `0 0 8px ${TOKEN.safeGreen}`,
        }}
      />
      <span style={{ color: TOKEN.safeGreen, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.1em" }}>
        ML ENGINE LIVE
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HERO TITLE ROW  (icon + title + subtitle)
// ─────────────────────────────────────────────────────────────────────────────
function HeroTitle() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1,   y: 0  }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ textAlign: "center", marginBottom: "16px" }}
    >
      {/* Icon */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: "2.8rem", marginBottom: "8px" }}
      >
        🛣️
      </motion.div>

      <h1 style={{
        margin:       0,
        fontSize:     "clamp(1.5rem, 6vw, 2.1rem)",
        fontWeight:   800,
        letterSpacing:"-0.02em",
        background:   `linear-gradient(135deg, ${TOKEN.white} 30%, ${TOKEN.skyBlue} 70%, ${TOKEN.cyanAcc})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor:  "transparent",
        lineHeight:   1.15,
      }}>
        Peddapalli Road Risk
      </h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{
          margin:       "6px 0 0",
          color:        TOKEN.textLight,
          fontSize:     "0.78rem",
          letterSpacing:"0.04em",
        }}
      >
        Full-Stack App · ML Risk Scoring · Dijkstra Graph Routing · 117 Segments
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PULSE RING  (decorative ring around hero icon on load)
// ─────────────────────────────────────────────────────────────────────────────
function PulseRing() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0.8 }}
      animate={{ scale: 2.5, opacity: 0   }}
      transition={{ duration: 1.8, delay: 0.4, ease: "easeOut" }}
      style={{
        position:     "absolute",
        top:          "50%",
        left:         "50%",
        transform:    "translate(-50%, -50%)",
        width:        "60px",
        height:       "60px",
        borderRadius: "50%",
        border:       `2px solid ${TOKEN.skyBlue}88`,
        pointerEvents:"none",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIDENCE METER  (decorative; could wire to result later)
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceMeter({ value = 0 }) {
  if (!value) return null;
  const pct  = Math.round(value * 100);
  const col  = pct >= 75 ? TOKEN.safeGreen
             : pct >= 50 ? TOKEN.warnAmber
             : TOKEN.dangerRed;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ marginTop: "10px" }}
    >
      <div style={{
        display:       "flex",
        justifyContent:"space-between",
        marginBottom:  "4px",
        fontSize:      "0.7rem",
        color:         TOKEN.textLight,
        letterSpacing: "0.06em",
      }}>
        <span>CONFIDENCE</span>
        <span style={{ color: col, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{
        height:       "6px",
        borderRadius: "99px",
        background:   `${TOKEN.white}12`,
        overflow:     "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            height:     "100%",
            borderRadius:"99px",
            background: `linear-gradient(90deg, ${col}AA, ${col})`,
            boxShadow:  `0 0 8px ${col}88`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FEATURE HIGHLIGHTS  (decorative row of key features)
// ─────────────────────────────────────────────────────────────────────────────
function FeatureRow() {
  const features = [
    { icon: <Shield size={16} />, label: "Route Safety", col: TOKEN.safeGreen  },
    { icon: <Brain  size={16} />, label: "ML Scoring",  col: TOKEN.skyBlue    },
    { icon: <Zap    size={16} />, label: "Real-Time",   col: TOKEN.warnAmber  },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1,  y: 0  }}
      transition={{ delay: 0.62 }}
      style={{
        display:  "flex",
        gap:      "10px",
        marginBottom: "20px",
      }}
    >
      {features.map((f, i) => (
        <motion.div
          key={f.label}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1    }}
          transition={{ delay: 0.65 + i * 0.07 }}
          whileTap={{ scale: 0.93 }}
          style={{
            flex:         1,
            display:      "flex",
            flexDirection:"column",
            alignItems:   "center",
            gap:          "6px",
            padding:      "12px 8px",
            borderRadius: "14px",
            background:   `${f.col}0F`,
            border:       `1px solid ${f.col}2A`,
          }}
        >
          <div style={{ color: f.col }}>{f.icon}</div>
          <span style={{ fontSize: "0.65rem", color: TOKEN.textLight, fontWeight: 600, letterSpacing: "0.05em", textAlign: "center" }}>
            {f.label}
          </span>
        </motion.div>
      ))}
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

  const {
    result, loading, error,
    history, runCanvas, runUpload, reset,
  } = usePrediction();

  const [localHistory, setLocalHistory] = useState([]);
  useEffect(() => { setLocalHistory(history); }, [history]);

  // ── Auto-scroll to result & show floating arrow ──────────────────────────
  useEffect(() => {
    if (result && !loading) {
      const panel = resultRef.current;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const outOfView = rect.top > window.innerHeight || rect.bottom < 0;
        if (outOfView) {
          setShowArrow(true);
          setTimeout(() => setShowArrow(false), 4500);
        } else {
          // Auto-scroll smoothly to result
          setTimeout(() => {
            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 300);
        }
      }
    }
  }, [result, loading]);

  // ── Haptic on result ──────────────────────────────────────────────────────
  useEffect(() => {
    if (result && !loading && !error) {
      result.uncertain
        ? haptic(40)
        : navigator?.vibrate?.([15, 80, 15]);
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
      {/* ── CSS Custom Properties & Global Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --navy-deep:    ${TOKEN.navyDeep};
          --navy-card:    ${TOKEN.navyCard};
          --royal-blue:   ${TOKEN.royalBlue};
          --sky-blue:     ${TOKEN.skyBlue};
          --cyan-acc:     ${TOKEN.cyanAcc};
          --safe-green:   ${TOKEN.safeGreen};
          --danger-red:   ${TOKEN.dangerRed};
          --text-light:   ${TOKEN.textLight};
          --glass-bg:     ${TOKEN.glassBg};
          --glass-border: ${TOKEN.glassBorder};

          /* Legacy variables kept for child components */
          --vib-purple:   #9B5DE5;
          --vib-cyan:     ${TOKEN.cyanAcc};
          --vib-pink:     #F72585;
          --text-muted:   ${TOKEN.textLight};
          --text-dim:     #64748B;
          --text-bright:  ${TOKEN.white};
          --font-mono:    'DM Mono', monospace;
          --radius-lg:    14px;
          --radius-xl:    20px;
          --safe-bottom:  env(safe-area-inset-bottom, 0px);
        }

        *, *::before, *::after { box-sizing: border-box; }

        html {
          scroll-behavior: smooth;
          font-family: 'Space Grotesk', system-ui, sans-serif;
        }

        body {
          margin:     0;
          background: ${TOKEN.navyDeep};
          color:      ${TOKEN.white};
          min-height: 100dvh;
          overflow-x: hidden;
        }

        /* Tab bar for child components */
        .tab-bar {
          display:       flex;
          background:    ${TOKEN.glassBg};
          border:        1px solid ${TOKEN.glassBorder};
          border-radius: 14px;
          padding:       5px;
          gap:           4px;
          backdrop-filter: blur(10px);
        }
        .tab-btn {
          flex:           1;
          display:        flex;
          align-items:    center;
          justify-content:center;
          gap:            7px;
          padding:        11px 0;
          border:         none;
          border-radius:  10px;
          cursor:         pointer;
          font-size:      0.82rem;
          font-weight:    500;
          background:     transparent;
          color:          ${TOKEN.textLight};
          transition:     all 0.25s ease;
        }
        .tab-btn.active {
          background: linear-gradient(135deg, ${TOKEN.royalBlue}, ${TOKEN.skyBlue}CC);
          color:      ${TOKEN.white};
          font-weight:700;
          box-shadow: 0 4px 16px ${TOKEN.royalBlue}44;
        }

        /* Glass card helpers */
        .glass {
          background:     ${TOKEN.glassBg};
          border:         1px solid ${TOKEN.glassBorder};
          border-radius:  20px;
          backdrop-filter:blur(12px);
        }
        .glass-bright {
          background:     linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          border:         1px solid ${TOKEN.glassBorder};
          border-radius:  20px;
          backdrop-filter:blur(14px);
          box-shadow:     0 8px 40px rgba(0,0,0,0.22);
        }

        /* App wrapper */
        .app-wrapper {
          max-width:  480px;
          margin:     0 auto;
          padding:    24px 16px calc(60px + var(--safe-bottom));
        }

        /* Result flash animation */
        @keyframes resultFlash {
          0%   { box-shadow: 0 0 0   ${TOKEN.safeGreen}00; }
          50%  { box-shadow: 0 0 40px ${TOKEN.safeGreen}55; }
          100% { box-shadow: 0 0 0   ${TOKEN.safeGreen}00; }
        }
        .result-flash { animation: resultFlash 1s ease-out forwards; }

        /* Button touch fix */
        button { touch-action: manipulation; }

        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background:    ${TOKEN.skyBlue}44;
          border-radius: 99px;
        }

        /* Desktop two-column layout */
        @media (min-width: 900px) {
          .app-wrapper { max-width: 1100px !important; }
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

        /* iOS safe area */
        @supports (padding: env(safe-area-inset-bottom)) {
          .app-wrapper {
            padding-bottom: calc(60px + env(safe-area-inset-bottom));
          }
        }

        /* Entrance animation utility */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fade-up {
          animation: fadeUp 0.5s ease-out forwards;
        }
      `}</style>

      {/* ── Floating background orbs ── */}
      <FloatingOrbs />

      {/* ── Top loading bar ── */}
      <LoadingBar loading={loading} />

      {/* ── Original NeuralGrid (dot-matrix) – kept for continuity ── */}
      <NeuralGrid />

      {/* ── Foreground content ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="app-wrapper">

          {/* ── Hero Title ── */}
          <HeroTitle />

          {/* ── Live Indicator ── */}
          <LiveIndicator />

          {/* ── Brand Badges ── */}
          <BrandBadges />

          {/* ── Stats Row ── */}
          <StatsRow />

          {/* ── Header (original component) ── */}
          <Header />

          {/* ── Info Banner ── */}
          <InfoBanner />

          {/* ── Main layout column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* ── Tab Bar ── */}
            <TabBar tab={tab} onTabChange={handleTabChange} />

            {/* ── Feature Row ── */}
            <FeatureRow />

            {/* ── Input Card ── */}
            <InputCard
              tab={tab}
              loading={loading}
              onRunCanvas={runCanvas}
              onRunUpload={runUpload}
              inputRef={inputRef}
            />

            {/* ── Result Panel ── */}
            <ResultWrapper
              result={result}
              loading={loading}
              error={error}
              resultRef={resultRef}
            />

            {/* ── Confidence Meter (wired to top-1 confidence if available) ── */}
            {result && !loading && (
              <ConfidenceMeter value={result?.confidence ?? result?.topK?.[0]?.prob} />
            )}

            {/* ── Gradient Divider ── */}
            <VibDivider />

            {/* ── History ── */}
            <HistoryWrapper history={localHistory} onClear={handleClearHistory} />

            {/* ── Footer ── */}
            <Footer />

          </div>
        </div>
      </div>

      {/* ── Floating scroll-to-result button ── */}
      <ScrollArrow show={showArrow} onClick={scrollToResult} />
    </>
  );
}
