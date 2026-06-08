// ═══════════════════════════════════════════════════════════════════════════════
//  Neural Ink · EMNIST Recogniser · Consolidated App.jsx
//  All components + hooks inlined. Only lib/api.js stays external.
//  Design: Citrus Green + Bright Blue + White · No Glassmorphism · Zero-Lag Apple Feel
// ═══════════════════════════════════════════════════════════════════════════════

import {
  useState, useRef, useEffect, useCallback, useReducer,
} from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  PenLine, ImageUp, Info, X, ChevronDown,
  Sparkles, Brain, Cpu, Zap, Eraser, Upload, ImageIcon,
  AlertTriangle, CheckCircle, Clock, History, Trash2,
} from "lucide-react";
import { predictCanvas, predictUpload, getHealth } from "./lib/api";

// ───────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS  — Citrus Green + Bright Blue + White on Deep Navy-Black
// ───────────────────────────────────────────────────────────────────────────────
const T = {
  // ── Backgrounds ───────────────────────────────────────────
  bg:           "#070C14",   // deep navy-black (AMOLED friendly)
  surface:      "#0D1320",   // card base
  surface2:     "#111928",   // elevated card
  surface3:     "#1A2535",   // input / active area

  // ── Borders ───────────────────────────────────────────────
  border:       "rgba(163,230,53,0.10)",   // citrus tint
  borderBright: "rgba(163,230,53,0.22)",

  // ── Citrus Green (PRIMARY accent) ─────────────────────────
  green:        "#A3E635",   // lime-400 — main CTA, active states
  greenLight:   "#D9F99D",   // lime-200 — text on dark, badges
  greenDark:    "#65A30D",   // lime-700 — pressed states
  greenGlow:    "#84CC16",   // lime-500 — glow shadows

  // ── Bright Blue (SECONDARY accent) ────────────────────────
  blue:         "#3B82F6",   // blue-500 — secondary CTA, links
  blueLight:    "#93C5FD",   // blue-300 — text, icons
  blueDark:     "#1D4ED8",   // blue-700 — pressed
  blueGlow:     "#60A5FA",   // blue-400 — glows

  // ── White / Neutrals ──────────────────────────────────────
  white:        "#FFFFFF",
  offWhite:     "#F0F9FF",   // faint blue-white
  paleGreen:    "#ECFCCB",   // uncertain / warning text
  muted:        "#94A3B8",   // secondary text
  dim:          "#475569",   // tertiary text / labels

  // ── Semantic ─────────────────────────────────────────────
  error:        "#EF4444",   // red — errors only, no orange
  errorBg:      "rgba(239,68,68,0.12)",
  errorBorder:  "rgba(239,68,68,0.28)",
  errorLight:   "#FCA5A5",   // light red text

  // ── Confidence tier colours (NO ORANGE) ──────────────────
  conf80:       "#D9F99D",   // ≥ 80% — pale citrus
  conf60:       "#93C5FD",   // ≥ 60% — pale blue
  conf40:       "#FDE68A",   // ≥ 40% — pale yellow (not orange)
  confLow:      "#60A5FA",   // < 40% — blue (replaces orange/pink)
};

// ───────────────────────────────────────────────────────────────────────────────
//  GLOBAL STYLES — injected once
// ───────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --green:        #A3E635;
    --green-light:  #D9F99D;
    --green-dark:   #65A30D;
    --green-glow:   #84CC16;
    --blue:         #3B82F6;
    --blue-light:   #93C5FD;
    --blue-dark:    #1D4ED8;
    --blue-glow:    #60A5FA;

    --bg:           #070C14;
    --surface:      #0D1320;
    --surface-2:    #111928;
    --surface-3:    #1A2535;
    --border:       rgba(163,230,53,0.10);
    --border-bright:rgba(163,230,53,0.22);

    --text:         #FFFFFF;
    --text-muted:   #94A3B8;
    --text-dim:     #475569;

    --font-display: 'Outfit', system-ui, sans-serif;
    --font-mono:    'JetBrains Mono', 'SF Mono', monospace;
    --font-number:  'Outfit', system-ui, sans-serif;

    --radius-sm:  8px;
    --radius-md:  12px;
    --radius-lg:  16px;
    --radius-xl:  22px;
    --radius-2xl: 28px;

    --safe-top:    env(safe-area-inset-top,    0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);

    --spring-fast:   cubic-bezier(0.34, 1.0, 0.64, 1);
    --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    scroll-behavior: smooth;
    scroll-padding-top: 32px;
    -webkit-text-size-adjust: 100%;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-display);
    min-height: 100dvh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ── Scrollbar ─────────────────────────────────────────────── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #A3E63588, #3B82F688);
    border-radius: 99px;
  }

  /* ── Cards (SOLID — no glassmorphism) ──────────────────────── */
  .card {
    background: #0D1320;
    border: 1px solid rgba(163,230,53,0.10);
    border-radius: var(--radius-xl);
  }
  .card-bright {
    background: #111928;
    border: 1px solid rgba(163,230,53,0.22);
    border-radius: var(--radius-xl);
    box-shadow: 0 8px 32px rgba(0,0,0,0.40), 0 1px 0 rgba(163,230,53,0.08) inset;
  }

  /* ── Buttons ───────────────────────────────────────────────── */
  button {
    touch-action: manipulation;
    font-family: var(--font-display);
    cursor: pointer;
  }
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 8px; padding: 13px 20px; border-radius: var(--radius-lg);
    border: none; font-size: 0.9rem; font-weight: 700;
    letter-spacing: 0.01em;
    font-family: var(--font-display);
    /* transition only compositor-safe props */
    transition: opacity 0.14s ease, filter 0.14s ease;
  }
  .btn:disabled { opacity: 0.38; cursor: not-allowed; }

  /* Primary — citrus green → blue gradient */
  .btn-primary {
    background: linear-gradient(135deg, #A3E635, #3B82F6);
    color: #070C14;
    font-weight: 800;
    box-shadow: 0 4px 20px rgba(163,230,53,0.28);
  }
  .btn-primary:not(:disabled):active { filter: brightness(0.92); }
  .btn-primary:not(:disabled):hover  { filter: brightness(1.07); }

  /* Danger — uses red, no orange */
  .btn-danger {
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.28);
    color: #FCA5A5;
  }

  /* Ghost */
  .btn-ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
  }

  /* ── Badges ────────────────────────────────────────────────── */
  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 99px;
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
  }
  .badge-green {
    background: rgba(163,230,53,0.12);
    border: 1px solid rgba(163,230,53,0.28);
    color: #D9F99D;
  }
  .badge-blue {
    background: rgba(59,130,246,0.14);
    border: 1px solid rgba(59,130,246,0.30);
    color: #93C5FD;
  }
  /* Keep badge-violet name for code compat but style as green */
  .badge-violet {
    background: rgba(163,230,53,0.12);
    border: 1px solid rgba(163,230,53,0.28);
    color: #D9F99D;
  }
  .badge-cyan {
    background: rgba(59,130,246,0.14);
    border: 1px solid rgba(59,130,246,0.30);
    color: #93C5FD;
  }

  /* ── Pulse dots ─────────────────────────────────────────────── */
  .pulse-dot {
    display: inline-block; width: 7px; height: 7px; border-radius: 50%;
    animation: pulse-ring 2s ease infinite;
  }
  .pulse-dot.green  { background: #A3E635; }
  .pulse-dot.amber  { background: #FDE68A; }   /* yellow, never orange */
  .pulse-dot.red    { background: #EF4444; }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 currentColor; }
    60%  { box-shadow: 0 0 0 5px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }

  /* ── Confidence track ───────────────────────────────────────── */
  .conf-track {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border-radius: 99px;
    overflow: hidden;
  }
  .conf-fill { height: 100%; border-radius: 99px; }

  /* ── Result flash (compositor-safe: box-shadow only) ────────── */
  @keyframes resultFlash {
    0%   { box-shadow: 0 0 0   rgba(163,230,53,0); }
    40%  { box-shadow: 0 0 56px rgba(163,230,53,0.45), 0 0 100px rgba(59,130,246,0.20); }
    100% { box-shadow: 0 0 0   rgba(163,230,53,0); }
  }
  .result-flash { animation: resultFlash 1.4s ease-out forwards; }

  /* ── Gradient text ──────────────────────────────────────────── */
  .gradient-text {
    background: linear-gradient(135deg, #D9F99D, #A3E635, #60A5FA);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ── Scroll momentum (iOS) ──────────────────────────────────── */
  .scroll-momentum { -webkit-overflow-scrolling: touch; }

  /* ── App shell ──────────────────────────────────────────────── */
  .app-wrapper {
    max-width: 500px;
    margin: 0 auto;
    padding: 32px 18px calc(80px + var(--safe-bottom));
    position: relative;
    z-index: 1;
  }

  /* ── Desktop layout ─────────────────────────────────────────── */
  @media (min-width: 960px) {
    .app-wrapper { max-width: 1160px !important; }
    .desktop-grid {
      display: grid !important;
      grid-template-columns: 1fr 400px;
      gap: 28px;
      align-items: start;
    }
    .desktop-right { position: sticky; top: 28px; }
  }

  /* ── Section entrance ───────────────────────────────────────── */
  @keyframes sectionReveal {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  .section-reveal {
    animation: sectionReveal 0.50s cubic-bezier(0.19,1,0.22,1) both;
  }

  /* ── Canvas border glow (citrus) ────────────────────────────── */
  @keyframes canvasGlow {
    0%,100% { box-shadow: 0 0 0 1.5px rgba(163,230,53,0.30), 0 0 20px rgba(163,230,53,0.08); }
    50%     { box-shadow: 0 0 0 1.5px rgba(59,130,246,0.40),  0 0 32px rgba(59,130,246,0.14); }
  }
  .canvas-idle { animation: canvasGlow 4s ease-in-out infinite; }

  /* ── Dynamic Island pill (SOLID — no glass) ─────────────────── */
  .dyn-island {
    position: fixed;
    top: calc(var(--safe-top) + 10px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 900;
    background: #0D1320;
    border-radius: 22px;
    padding: 7px 20px;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.60);
    font-size: 0.72rem; font-weight: 600;
    color: rgba(255,255,255,0.85);
    pointer-events: none; white-space: nowrap;
    border: 1px solid rgba(163,230,53,0.18);
    font-family: var(--font-mono);
  }

  /* ── Button hover (no transform, compositor-safe) ───────────── */
  .btn-primary:not(:disabled):hover {
    box-shadow: 0 6px 28px rgba(163,230,53,0.38), 0 2px 8px rgba(59,130,246,0.20);
  }

  /* ── Solid header bar ───────────────────────────────────────── */
  .header-solid {
    background: #070C14;
    border-bottom: 1px solid rgba(163,230,53,0.10);
  }

  /* ── Mobile snap ────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .snap-section { scroll-snap-align: start; }
  }
`;

// ───────────────────────────────────────────────────────────────────────────────
//  HOOK: useCanvas
// ───────────────────────────────────────────────────────────────────────────────
function useCanvas({ brushSize = 18, brushColor = "#ffffff" } = {}) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef({ x: 0, y: 0 });
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = useCallback((e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    drawing.current = true;
    lastPos.current = pos;
    setIsEmpty(false);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = brushColor;
    ctx.fill();
  }, [brushSize, brushColor, getPos]);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth   = brushSize;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, [brushSize, brushColor, getPos]);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const getBase64 = useCallback(() =>
    canvasRef.current?.toDataURL("image/png") ?? null, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("mousedown",  startDraw);
    canvas.addEventListener("mousemove",  draw);
    canvas.addEventListener("mouseup",    stopDraw);
    canvas.addEventListener("mouseleave", stopDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove",  draw,      { passive: false });
    canvas.addEventListener("touchend",   stopDraw);
    return () => {
      canvas.removeEventListener("mousedown",  startDraw);
      canvas.removeEventListener("mousemove",  draw);
      canvas.removeEventListener("mouseup",    stopDraw);
      canvas.removeEventListener("mouseleave", stopDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove",  draw);
      canvas.removeEventListener("touchend",   stopDraw);
    };
  }, [startDraw, draw, stopDraw]);

  return { canvasRef, clear, getBase64, isEmpty };
}

// ───────────────────────────────────────────────────────────────────────────────
//  HOOK: usePrediction
// ───────────────────────────────────────────────────────────────────────────────
const MAX_HISTORY = 14;

function usePrediction() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [history, setHistory] = useState([]);

  const _push = useCallback((res, source) => {
    const entry = { ...res, source, id: Date.now() };
    setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
    return entry;
  }, []);

  const runCanvas = useCallback(async (base64) => {
    setLoading(true); setError(null);
    try {
      const res   = await predictCanvas(base64);
      const entry = _push(res, "draw");
      setResult(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [_push]);

  const runUpload = useCallback(async (file) => {
    setLoading(true); setError(null);
    try {
      const res   = await predictUpload(file);
      const entry = _push(res, `📎 ${file.name}`);
      setResult(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [_push]);

  const reset = useCallback(() => { setResult(null); setError(null); }, []);

  return { result, loading, error, history, runCanvas, runUpload, reset };
}

// ───────────────────────────────────────────────────────────────────────────────
//  UTILITY
// ───────────────────────────────────────────────────────────────────────────────
function haptic(ms = 10) { navigator?.vibrate?.(ms); }

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: NeuralGrid (animated canvas background)
// ───────────────────────────────────────────────────────────────────────────────
const VIB_COLORS = [
  [163, 230,  53],  // citrus green  #A3E635
  [ 59, 130, 246],  // bright blue   #3B82F6
  [132, 204,  22],  // lime-500      #84CC16
  [ 96, 165, 250],  // blue-400      #60A5FA
  [217, 249, 157],  // pale citrus   #D9F99D
  [ 29,  78, 216],  // blue-700      #1D4ED8
];

function NeuralGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let raf;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const SPACING = 50;
    const dots = [];
    for (let x = SPACING / 2; x < window.innerWidth + SPACING; x += SPACING) {
      for (let y = SPACING / 2; y < window.innerHeight + SPACING; y += SPACING) {
        dots.push({
          x, y,
          phase:    Math.random() * Math.PI * 2,
          speed:    0.0015 + Math.random() * 0.003,
          base:     0.03 + Math.random() * 0.07,
          colorIdx: Math.floor(Math.random() * VIB_COLORS.length),
          r:        0.9 + Math.random() * 0.6,
        });
      }
    }

    let t = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;
      for (const d of dots) {
        const alpha = d.base + Math.sin(t * d.speed + d.phase) * 0.045;
        const [r, g, b] = VIB_COLORS[d.colorIdx];
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    }
    render();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 0,
      pointerEvents: "none", opacity: 0.55,
    }} />
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: AmbientOrbs
// ───────────────────────────────────────────────────────────────────────────────
function AmbientOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Top-left citrus orb */}
      <motion.div
        animate={{ x: [0, 28, 0], y: [0, -18, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "-140px", left: "-100px",
          width: "380px", height: "380px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(163,230,53,0.22) 0%, transparent 68%)",
        }}
      />
      {/* Bottom-right blue orb */}
      <motion.div
        animate={{ x: [0, -22, 0], y: [0, 26, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        style={{
          position: "absolute", bottom: "-100px", right: "-70px",
          width: "340px", height: "340px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.20) 0%, transparent 68%)",
        }}
      />
      {/* Mid citrus-blue orb */}
      <motion.div
        animate={{ x: [0, 16, -10, 0], y: [0, 22, -8, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut", delay: 10 }}
        style={{
          position: "absolute", top: "40%", left: "20%",
          width: "240px", height: "240px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(132,204,22,0.14) 0%, transparent 68%)",
        }}
      />
      {/* Top-right blue orb */}
      <motion.div
        animate={{ x: [0, -14, 0], y: [0, 16, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute", top: "6%", right: "-50px",
          width: "260px", height: "260px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 68%)",
        }}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: TopLoadingBar
// ───────────────────────────────────────────────────────────────────────────────
function TopLoadingBar({ loading }) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div key="lbar"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0,
            height: "3px", zIndex: 999,
            background: `${T.green}18`,
          }}
        >
          <motion.div
            animate={{ x: ["-100%", "160%"] }}
            transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
            style={{
              height: "100%", width: "52%",
              background: `linear-gradient(90deg, transparent, ${T.green}, ${T.blue}, ${T.greenLight}, transparent)`,
              willChange: "transform",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: DynamicIsland
// ───────────────────────────────────────────────────────────────────────────────
function DynamicIsland({ loading, result }) {
  const show = loading || (result && !loading);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={loading ? "inf" : result?.id}
          initial={{ opacity: 0, scale: 0.75, y: -12 }}
          animate={{ opacity: 1, scale: 1,    y: 0    }}
          exit={   { opacity: 0, scale: 0.75, y: -12  }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="dyn-island"
        >
          {loading ? (
            <>
              <SpinIcon size={10} />
              Running inference…
            </>
          ) : (
            <>
              <span style={{ color: result.uncertain ? T.paleGreen : T.greenLight }}>
                {result.uncertain ? "⚠" : "✓"}
              </span>
              {result.uncertain
                ? `Uncertain (${result.confidence.toFixed(0)}%)`
                : `"${result.label}" — ${result.confidence.toFixed(1)}%`
              }
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: Header (with live API health badge)
// ───────────────────────────────────────────────────────────────────────────────
function Header() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const h = await getHealth();
        if (!cancelled) setStatus(h.status === "ok" ? "ok" : "degraded");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    check();
    const id = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const dotClass   = status === "ok" ? "green" : status === "checking" ? "amber" : "red";
  const label      = status === "ok" ? "Model online" : status === "checking" ? "Connecting…" : "Model offline";
  const labelColor = status === "ok" ? T.greenLight : status === "checking" ? "#FDE68A" : T.errorLight;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      style={{ paddingTop: "calc(var(--safe-top) + 12px)", marginBottom: "28px" }}
    >
      {/* Badge row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: "18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <motion.span
            animate={{ rotate: [0, -12, 12, -6, 0] }}
            transition={{ duration: 2.2, delay: 1.2, repeat: Infinity, repeatDelay: 5 }}
            style={{ fontSize: "1.3rem" }}
          >🖊️</motion.span>
          <span className="badge badge-green">EMNIST · 47 classes</span>
        </div>
        {/* Status pill — solid, no backdrop-filter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "6px 14px", borderRadius: "99px",
            background: T.surface2,
            border: "1px solid var(--border)",
          }}
        >
          <span className={`pulse-dot ${dotClass}`} />
          <span style={{ color: labelColor, fontSize: "0.74rem", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
            {label}
          </span>
        </motion.div>
      </div>

      {/* Hero title */}
      <h1 style={{
        fontSize: "clamp(2.4rem, 9vw, 3.8rem)",
        fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.04em",
      }}>
        Neural{" "}
        <motion.span
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{
            background: `linear-gradient(90deg, ${T.greenLight}, ${T.green}, ${T.blueLight}, ${T.blue}, ${T.greenLight})`,
            backgroundSize: "220% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Ink
        </motion.span>
      </h1>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        style={{ color: T.muted, fontSize: "0.85rem", marginTop: "9px", lineHeight: 1.65 }}
      >
        Handwritten digit &amp; letter recognition — powered by PyTorch
      </motion.p>

      {/* Model chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}
      >
        {[
          { icon: <Brain size={12} />,    label: "EMNISTNet CNN", col: T.greenLight },
          { icon: <Cpu size={12} />,      label: "PyTorch",       col: T.blueLight  },
          { icon: <Sparkles size={12} />, label: "47 Classes",    col: T.green      },
        ].map((c, i) => (
          <motion.span key={c.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.52 + i * 0.08 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "5px 12px", borderRadius: "99px",
              background: `${c.col}14`, border: `1px solid ${c.col}30`,
              fontSize: "0.68rem", fontWeight: 600, color: c.col,
            }}
          >
            {c.icon}{c.label}
          </motion.span>
        ))}
      </motion.div>
    </motion.header>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: InfoBanner
// ───────────────────────────────────────────────────────────────────────────────
function InfoBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }} transition={{ delay: 0.6, duration: 0.4 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "14px 16px", borderRadius: "var(--radius-lg)",
        background: `linear-gradient(135deg, ${T.surface2}, ${T.surface3})`,
        border: `1px solid ${T.borderBright}`,
        marginBottom: "22px", position: "relative",
      }}
    >
      {/* Animated left accent bar */}
      <motion.div
        animate={{ scaleY: [0.5, 1, 0.5] }}
        transition={{ duration: 2.8, repeat: Infinity }}
        style={{
          position: "absolute", left: 0, top: "15%", bottom: "15%",
          width: "3px", borderRadius: "99px",
          background: `linear-gradient(180deg, ${T.green}, ${T.blue})`,
        }}
      />
      <Info size={14} color={T.greenLight} style={{ flexShrink: 0, marginTop: "2px" }} />
      <span style={{ color: T.muted, fontSize: "0.78rem", lineHeight: 1.7, flex: 1 }}>
        Recognises <strong style={{ color: T.greenLight }}>47 classes</strong>: digits 0–9 and letters A–Z, trained on{" "}
        <strong style={{ color: T.blueLight }}>EMNIST Balanced</strong> via PyTorch.
        Confidence below 50% is flagged as <em style={{ color: T.paleGreen }}>Uncertain</em>.
      </span>
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onClick={() => { haptic(8); setVisible(false); }}
        style={{
          background: "rgba(255,255,255,0.07)", border: "none", cursor: "pointer",
          color: T.muted, padding: "5px", borderRadius: "50%",
          flexShrink: 0, display: "flex", alignItems: "center",
        }}
      >
        <X size={12} />
      </motion.button>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: TabBar
// ───────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "draw",   label: "Draw",   icon: PenLine },
  { id: "upload", label: "Upload", icon: ImageUp  },
];

function TabBar({ tab, onTabChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{
        display: "flex",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: "var(--radius-lg)", padding: "5px", gap: "5px",
      }}
    >
      {TABS.map((t) => {
        const Icon   = t.icon;
        const active = tab === t.id;
        return (
          <motion.button key={t.id}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => onTabChange(t.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center",
              justifyContent: "center", gap: "7px", padding: "12px 0",
              border: "none", borderRadius: "var(--radius-md)", cursor: "pointer",
              fontSize: "0.84rem", fontWeight: active ? 700 : 500,
              position: "relative", overflow: "hidden",
              background: active
                ? `linear-gradient(135deg, ${T.green}F0, ${T.blue}CC)`
                : "transparent",
              color: active ? "#070C14" : T.muted,
              boxShadow: active ? `0 4px 20px ${T.green}40` : "none",
              transition: "all 0.22s ease",
            }}
          >
            {active && (
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: "220%" }}
                transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
                style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
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

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: SectionLabel
// ───────────────────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "11px" }}>
      <div style={{
        width: "3px", height: "14px", borderRadius: "2px",
        background: `linear-gradient(180deg, ${T.green}, ${T.blue})`,
      }} />
      <p style={{
        margin: 0, color: T.dim,
        fontSize: "0.66rem", letterSpacing: "0.16em",
        textTransform: "uppercase", fontWeight: 700,
      }}>
        {children}
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: SpinIcon
// ───────────────────────────────────────────────────────────────────────────────
function SpinIcon({ size = 15 }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.75, ease: "linear" }}
      style={{
        width: size, height: size,
        border: "2px solid rgba(255,255,255,0.22)",
        borderTopColor: "#fff",
        borderRadius: "50%", flexShrink: 0,
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: DrawingCanvas
// ───────────────────────────────────────────────────────────────────────────────
const BRUSH_SIZES = [
  { label: "XS", size: 6  },
  { label: "S",  size: 10 },
  { label: "M",  size: 16 },
  { label: "L",  size: 24 },
];

function DrawingCanvas({ onPredict, loading }) {
  const [brush, setBrush] = useState(10);
  const [flash, setFlash] = useState(false);
  const { canvasRef, clear, getBase64, isEmpty } = useCanvas({ brushSize: brush });

  async function handlePredict() {
    const b64 = getBase64();
    if (!b64 || isEmpty) return;
    haptic(25);
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
    await onPredict(b64);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Brush picker */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: T.dim, fontSize: "0.66rem", letterSpacing: "0.14em", fontWeight: 700 }}>BRUSH</span>
        {BRUSH_SIZES.map(b => (
          <motion.button key={b.label}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => { haptic(8); setBrush(b.size); }}
            style={{
              padding: "8px 17px", borderRadius: "99px",
              border: `1px solid ${brush === b.size ? T.green : T.border}`,
              background: brush === b.size
                ? `linear-gradient(135deg, ${T.green}20, ${T.blue}14)`
                : "rgba(255,255,255,0.04)",
              color: brush === b.size ? T.greenLight : T.muted,
              fontFamily: "var(--font-mono)", fontSize: "0.78rem", fontWeight: 600,
              boxShadow: brush === b.size ? `0 0 14px ${T.green}28` : "none",
              transition: "all 0.18s ease",
            }}
          >
            {b.label}
          </motion.button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <motion.div
          animate={flash
            ? { boxShadow: `0 0 0 2px ${T.green}, 0 0 48px ${T.green}55, 0 0 80px ${T.blue}22` }
            : { boxShadow: `0 0 0 1px ${T.border}` }
          }
          transition={{ duration: 0.35 }}
          style={{
            borderRadius: "var(--radius-lg)", overflow: "hidden",
            background: "#000", touchAction: "none", cursor: "crosshair",
            willChange: "transform",
          }}
          className={isEmpty ? "canvas-idle" : ""}
        >
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            style={{
              display: "block",
              width: "100%",
              aspectRatio: "1/1",
              imageRendering: "pixelated",
            }}
          />
        </motion.div>

        {/* Empty hint overlay */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div key="hint"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                pointerEvents: "none", gap: "8px",
              }}
            >
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0, 0.15] }}
                  transition={{ duration: 3.2, delay: i * 1.05, repeat: Infinity }}
                  style={{
                    position: "absolute",
                    width: 80 + i * 44, height: 80 + i * 44,
                    borderRadius: "50%",
                    border: `1px solid ${T.green}`,
                  }}
                />
              ))}
              <div style={{ position: "relative", textAlign: "center" }}>
                <motion.p
                  animate={{ opacity: [0.28, 0.52, 0.28] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                  style={{
                    fontFamily: "var(--font-number)", fontSize: "2.2rem",
                    color: "rgba(163,230,53,0.40)", letterSpacing: "0.18em",
                    lineHeight: 1.4, fontWeight: 900, userSelect: "none",
                  }}
                >
                  0 1 2
                </motion.p>
                <p style={{
                  color: "rgba(100,100,140,0.55)", fontSize: "0.74rem",
                  fontFamily: "var(--font-mono)", marginTop: "4px",
                }}>
                  Draw a digit or letter
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="btn btn-primary"
          style={{ flex: 2, borderRadius: "var(--radius-lg)" }}
          onClick={handlePredict}
          disabled={loading || isEmpty}
        >
          {loading ? <><SpinIcon /> Predicting…</> : <><Zap size={15} /> Predict</>}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="btn btn-danger"
          style={{ flex: 1, borderRadius: "var(--radius-lg)" }}
          onClick={() => { haptic(8); clear(); }}
          disabled={loading || isEmpty}
        >
          <Eraser size={15} /> Clear
        </motion.button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ImageUpload
// ───────────────────────────────────────────────────────────────────────────────
const MAX_FILES = 5;
const ACCEPT    = { "image/*": [".png", ".jpg", ".jpeg", ".bmp", ".webp"] };

function ImageUpload({ onPredict, loading }) {
  const [files,   setFiles]   = useState([]);
  const [preview, setPreview] = useState([]);
  const [current, setCurrent] = useState(0);
  const [isDrag,  setIsDrag]  = useState(false);
  const inputRef = useRef(null);

  function onDrop(accepted) {
    const sliced = accepted.slice(0, MAX_FILES);
    setFiles(sliced);
    setPreview(sliced.map(f => ({ name: f.name, url: URL.createObjectURL(f) })));
    setCurrent(0);
  }

  function handleDragOver(e) { e.preventDefault(); setIsDrag(true); }
  function handleDragLeave()  { setIsDrag(false); }
  function handleDrop(e) {
    e.preventDefault(); setIsDrag(false);
    const dropped = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/"));
    if (dropped.length) onDrop(dropped);
  }
  function handleFileInput(e) {
    const chosen = [...e.target.files];
    if (chosen.length) onDrop(chosen);
  }
  function remove(idx) {
    setFiles(p  => p.filter((_, i) => i !== idx));
    setPreview(p => p.filter((_, i) => i !== idx));
  }
  async function handlePredict() {
    for (let i = 0; i < files.length; i++) {
      setCurrent(i);
      await onPredict(files[i]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDrag ? T.blue : T.borderBright}`,
          borderRadius: "var(--radius-lg)",
          background: isDrag ? `${T.blue}08` : "rgba(255,255,255,0.015)",
          padding: "44px 24px", textAlign: "center", cursor: "pointer",
          transition: "all 0.2s", minHeight: "200px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "13px",
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple
          style={{ display: "none" }} onChange={handleFileInput} />

        <motion.div
          animate={isDrag ? { scale: 1.18, rotate: 8 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${isDrag ? T.blue : T.borderBright}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {isDrag
            ? <ImageIcon size={24} color={T.blueLight} />
            : <Upload    size={24} color={T.muted} />
          }
        </motion.div>

        <div>
          <p style={{ color: isDrag ? T.blueLight : T.white, fontSize: "0.92rem", fontWeight: 600 }}>
            {isDrag ? "Drop to add images" : "Drag & drop images here"}
          </p>
          <p style={{ color: T.muted, fontSize: "0.77rem", marginTop: "4px" }}>
            PNG · JPG · BMP · WEBP — up to {MAX_FILES} files
          </p>
        </div>
        <span className="badge badge-green" style={{ marginTop: "2px" }}>or click to browse</span>
      </div>

      {/* Preview grid */}
      <AnimatePresence>
        {preview.length > 0 && (
          <motion.div key="previews"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))",
              gap: "10px",
            }}
          >
            {preview.map((p, i) => (
              <motion.div key={p.name + i}
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.82 }}
                style={{ position: "relative" }}
              >
                <img src={p.url} alt={p.name} style={{
                  width: "100%", aspectRatio: "1/1", objectFit: "cover",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${loading && current === i ? T.green : T.border}`,
                  filter: "grayscale(0.15)", transition: "border 0.2s",
                }} />
                {!loading && (
                  <button onClick={() => remove(i)} style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    border: "none", background: T.error, color: "#fff",
                    cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", padding: 0,
                  }}>
                    <X size={11} />
                  </button>
                )}
                {loading && current === i && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "var(--radius-md)",
                    background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <SpinIcon size={18} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Predict button */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="btn btn-primary"
        style={{ width: "100%", borderRadius: "var(--radius-lg)" }}
        onClick={handlePredict}
        disabled={loading || files.length === 0}
      >
        <Zap size={15} />
        {loading
          ? `Predicting… (${current + 1}/${files.length})`
          : `Predict ${files.length > 0 ? `(${files.length} image${files.length > 1 ? "s" : ""})` : ""}`
        }
      </motion.button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ConfidenceBar (MiniBar + Top5Bars)
// ───────────────────────────────────────────────────────────────────────────────
function barColor(prob) {
  if (prob >= 80) return T.conf80;   // pale citrus
  if (prob >= 60) return T.conf60;   // pale blue
  if (prob >= 40) return T.conf40;   // pale yellow
  return T.confLow;                   // blue (not orange, not pink)
}

function MiniBar({ label, prob, highlight = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{ display: "flex", alignItems: "center", gap: "12px" }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: "var(--radius-sm)",
        background: highlight ? `${T.green}20` : "rgba(255,255,255,0.04)",
        border: `1px solid ${highlight ? `${T.green}44` : T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "var(--font-number)", fontSize: "1.15rem",
          color: highlight ? T.greenLight : T.muted, lineHeight: 1, fontWeight: 700,
        }}>
          {label}
        </span>
      </div>
      <div className="conf-track" style={{ flex: 1, height: highlight ? "7px" : "5px" }}>
        <motion.div
          className="conf-fill"
          initial={{ width: 0 }}
          animate={{ width: `${prob}%` }}
          transition={{ duration: 0.85, delay, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            background: barColor(prob),
            boxShadow: highlight ? `0 0 10px ${barColor(prob)}88` : "none",
          }}
        />
      </div>
      <span style={{
        width: "46px", textAlign: "right",
        fontFamily: "var(--font-mono)", fontSize: highlight ? "0.82rem" : "0.75rem",
        color: highlight ? T.white : T.muted, flexShrink: 0,
        fontWeight: highlight ? 700 : 400,
      }}>
        {prob.toFixed(1)}%
      </span>
    </motion.div>
  );
}

function Top5Bars({ top5 }) {
  if (!top5?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ color: T.dim, fontSize: "0.66rem", letterSpacing: "0.14em", fontWeight: 700, marginBottom: "4px" }}>
        TOP-5 PREDICTIONS
      </p>
      {top5.map((item, i) => (
        <MiniBar key={item.label + i}
          label={item.label} prob={item.prob * 100}
          highlight={i === 0} delay={i * 0.06}
        />
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ResultPanel
// ───────────────────────────────────────────────────────────────────────────────
function ringColor(conf, uncertain) {
  if (uncertain)  return { stroke: T.blueLight,  glow: `${T.blue}80`,       bg: `${T.blue}14`                        };
  if (conf >= 80) return { stroke: T.greenLight,  glow: `${T.greenGlow}80`, bg: `${T.green}12`                        };
  if (conf >= 60) return { stroke: T.blueLight,   glow: `${T.blue}80`,      bg: `${T.blue}12`                         };
  if (conf >= 40) return { stroke: "#FDE68A",     glow: "rgba(253,230,138,0.60)", bg: "rgba(253,230,138,0.08)"         };
  return               { stroke: T.blueLight,   glow: `${T.blue}70`,       bg: `${T.blue}10`                        };
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "22px", padding: "56px 24px",
      color: T.dim, textAlign: "center",
    }}>
      <div style={{ position: "relative", width: 96, height: 96 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ scale: [1, 1.38, 1], opacity: [0.18, 0, 0.18] }}
            transition={{ duration: 3.2, delay: i * 1.05, repeat: Infinity }}
            style={{
              position: "absolute", inset: `${i * -13}px`,
              borderRadius: "50%", border: `1px solid ${T.green}`,
            }}
          />
        ))}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: T.surface2, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.4rem",
        }}>
          <span style={{ color: T.muted }}>?</span>
        </div>
      </div>
      <div>
        <p style={{ fontSize: "0.9rem", fontFamily: "var(--font-mono)", color: T.muted }}>
          Awaiting prediction…
        </p>
        <p style={{ fontSize: "0.74rem", marginTop: "5px", color: T.dim }}>
          Draw or upload an image to begin
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "22px", padding: "56px 24px",
    }}>
      <div style={{ position: "relative", width: 74, height: 74 }}>
        {[
          { size: 74, color: T.green,      dur: 1.0  },
          { size: 52, color: T.blue,       dur: 0.78 },
          { size: 30, color: T.greenLight, dur: 0.58 },
        ].map((r, i) => (
          <motion.div key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ repeat: Infinity, duration: r.dur, ease: "linear" }}
            style={{
              position: "absolute",
              top:  `${(74 - r.size) / 2}px`,
              left: `${(74 - r.size) / 2}px`,
              width: r.size, height: r.size, borderRadius: "50%",
              border: "2.5px solid transparent",
              borderTopColor: r.color,
              boxShadow: `0 0 10px ${r.color}55`,
              willChange: "transform",
            }}
          />
        ))}
      </div>
      <p style={{ color: T.muted, fontSize: "0.86rem", fontFamily: "var(--font-mono)" }}>
        Running inference…
      </p>
    </div>
  );
}

function ResultContent({ result }) {
  const conf    = result.confidence;
  const uncert  = result.uncertain;
  const colors  = ringColor(conf, uncert);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.86, y: 14 }}
      animate={{ opacity: 1, scale: 1,    y: 0   }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{ display: "flex", flexDirection: "column", gap: "26px" }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0px   ${colors.glow}`,
              `0 0 56px  ${colors.glow}, 0 0 90px ${colors.glow}40`,
              `0 0 24px  ${colors.glow}`,
            ],
          }}
          transition={{ duration: 1.3, times: [0, 0.4, 1] }}
          style={{
            width: 138, height: 138, borderRadius: "50%",
            border: `2.5px solid ${colors.stroke}`,
            background: colors.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            willChange: "transform",
          }}
        >
          {uncert ? (
            <AlertTriangle size={42} color={T.blueLight} />
          ) : (
            <motion.span
              initial={{ scale: 0, rotate: -18 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 290, damping: 18, delay: 0.1 }}
              style={{
                fontFamily: "var(--font-number)", fontSize: "5.2rem",
                color: T.greenLight, lineHeight: 1, fontWeight: 900,
                textShadow: `0 0 24px ${colors.glow}`,
              }}
            >
              {result.label}
            </motion.span>
          )}
        </motion.div>

        <div style={{ textAlign: "center" }}>
          {uncert ? (
            <div style={{ display: "flex", alignItems: "center", gap: "7px", justifyContent: "center" }}>
              <AlertTriangle size={14} color={T.blueLight} />
              <span style={{ color: T.blueLight, fontFamily: "var(--font-mono)", fontSize: "0.92rem" }}>
                Uncertain ({conf.toFixed(1)}%)
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: "flex", alignItems: "center", gap: "7px", justifyContent: "center" }}
            >
              <Sparkles size={14} color={colors.stroke} />
              <span style={{ color: colors.stroke, fontFamily: "var(--font-mono)", fontSize: "0.92rem", fontWeight: 700 }}>
                {conf.toFixed(1)}% confidence
              </span>
            </motion.div>
          )}
          {result.latency_ms && (
            <p style={{
              color: T.dim, fontSize: "0.72rem", marginTop: "7px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            }}>
              <Clock size={11} />{result.latency_ms} ms
              {result.source && result.source !== "draw" ? ` · ${result.source}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: "1px", margin: "0 -24px",
        background: `linear-gradient(90deg, transparent, ${colors.stroke}44, transparent)`,
      }} />

      <Top5Bars top5={result.top5} />
    </motion.div>
  );
}

function ResultPanel({ result, loading, error }) {
  const panelRef = useRef(null);
  const controls = useAnimation();

  useEffect(() => {
    if (result && !loading && !error) {
      controls.start({
        boxShadow: [
          `0 0 0px   ${T.green}00`,
          `0 0 56px  ${T.green}44, 0 0 100px ${T.blue}18`,
          `0 0 0px   ${T.green}00`,
        ],
        transition: { duration: 1.4 },
      });
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 120);
    }
  }, [result, loading, error]);

  return (
    <motion.div animate={controls} ref={panelRef}
      style={{ borderRadius: "var(--radius-xl)", position: "relative" }}
    >
      <div className="card" style={{ padding: "24px", minHeight: "390px", display: "flex", flexDirection: "column" }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "22px",
        }}>
          <h2 style={{ color: T.muted, fontSize: "1.05rem", fontWeight: 600, letterSpacing: "0.01em" }}>
            Result
          </h2>
          <AnimatePresence>
            {result && !loading && (
              <motion.span key="predicted"
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "13px", padding: "36px 24px", textAlign: "center" }}>
                  <div style={{
                    width: 58, height: 58, borderRadius: "50%",
                    background: T.errorBg, border: `1px solid ${T.errorBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <AlertTriangle size={26} color={T.errorLight} />
                  </div>
                  <p style={{ color: T.errorLight, fontSize: "0.87rem" }}>{error}</p>
                  <p style={{ color: T.dim, fontSize: "0.72rem" }}>
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
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ConfidenceMeter (inline global bar)
// ───────────────────────────────────────────────────────────────────────────────
function ConfidenceMeter({ value }) {
  if (!value) return null;
  const pct = Math.round(value * 100);
  const col = pct >= 75 ? T.greenLight : pct >= 50 ? T.blueLight : "#FDE68A";  // yellow for low, not orange
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ padding: "13px 16px", background: `${col}0C`, border: `1px solid ${col}25`, borderRadius: "var(--radius-lg)" }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: "8px",
        fontSize: "0.66rem", color: T.dim, letterSpacing: "0.14em", fontWeight: 700,
      }}>
        <span>CONFIDENCE</span>
        <span style={{ color: col, fontFamily: "var(--font-mono)" }}>{pct}%</span>
      </div>
      <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.95, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: "99px",
            background: `linear-gradient(90deg, ${col}99, ${col})`,
            boxShadow: `0 0 12px ${col}88`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: PredictionHistory
// ───────────────────────────────────────────────────────────────────────────────
function histColors(conf, uncertain) {
  if (uncertain)  return { bg:`${T.blue}18`,             border:`${T.blue}30`,             text:T.blueLight   };
  if (conf >= 80) return { bg:`${T.green}12`,            border:`${T.green}28`,            text:T.greenLight  };
  if (conf >= 60) return { bg:`${T.blue}12`,             border:`${T.blue}28`,             text:T.blueLight   };
  if (conf >= 40) return { bg:"rgba(253,230,138,0.10)",  border:"rgba(253,230,138,0.24)",  text:"#FDE68A"     };
  return               { bg:`${T.blue}10`,             border:`${T.blue}24`,             text:T.blueLight   };
}

function HistoryItem({ entry, index }) {
  const conf   = entry.confidence;
  const colors = histColors(conf, entry.uncertain);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.93 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay: index * 0.02 }}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "12px 14px", borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`,
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "var(--radius-sm)",
        background: colors.bg, border: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {entry.uncertain
          ? <AlertTriangle size={16} color={T.blueLight} />
          : <span style={{ fontFamily: "var(--font-number)", fontSize: "1.7rem", color: colors.text, lineHeight: 1, fontWeight: 800 }}>
              {entry.label}
            </span>
        }
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.84rem", color: T.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.uncertain ? "Uncertain" : `"${entry.label}"`}
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: "20px",
            background: colors.bg, border: `1px solid ${colors.border}`,
            color: colors.text, fontSize: "0.7rem",
            fontFamily: "var(--font-mono)", flexShrink: 0,
          }}>
            {conf.toFixed(0)}%
          </span>
        </div>
        <p style={{ color: T.dim, fontSize: "0.7rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {entry.source === "draw" ? "✏️ drawn" : `📎 ${entry.source}`}
          {entry.latency_ms ? ` · ${entry.latency_ms}ms` : ""}
        </p>
      </div>
    </motion.div>
  );
}

function PredictionHistory({ history, onClear }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={13} color={T.muted} />
          <span style={{ color: T.dim, fontSize: "0.66rem", letterSpacing: "0.16em", fontWeight: 700 }}>HISTORY</span>
          <AnimatePresence>
            {history.length > 0 && (
              <motion.span key={history.length}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="badge badge-green"
              >
                {history.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {history.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              className="btn btn-ghost"
              style={{ padding: "5px 12px", fontSize: "0.72rem", borderRadius: "99px" }}
              onClick={onClear}
            >
              <Trash2 size={11} /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {/* List */}
      <div className="scroll-momentum" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "370px", overflowY: "auto" }}>
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ color: T.dim, fontSize: "0.8rem", padding: "18px 0", textAlign: "center" }}
            >
              No predictions yet.
            </motion.p>
          ) : (
            history.map((entry, i) => <HistoryItem key={entry.id} entry={entry} index={i} />)
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ScrollArrow
// ───────────────────────────────────────────────────────────────────────────────
function ScrollArrow({ show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button key="arrow"
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 22 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          onClick={onClick}
          style={{
            position: "fixed",
            bottom: "calc(32px + var(--safe-bottom, 0px))",
            left: "50%", transform: "translateX(-50%)", zIndex: 200,
            background: `linear-gradient(135deg, ${T.green}, ${T.blue})`,
            border: "none", borderRadius: "99px",
            padding: "12px 26px", color: "#070C14",
            fontSize: "0.84rem", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
            boxShadow: `0 6px 32px ${T.green}44`,
          }}
        >
          View Result
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.1 }}>
            <ChevronDown size={14} />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: VibDivider
// ───────────────────────────────────────────────────────────────────────────────
function VibDivider() {
  return (
    <motion.div
      initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.75 }}
      style={{
        height: "1px",
        background: `linear-gradient(90deg, transparent, ${T.green}44, ${T.blue}38, transparent)`,
        margin: "6px 0", transformOrigin: "left",
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: Footer
// ───────────────────────────────────────────────────────────────────────────────
function Footer() {
  const pills = [
    ["Neural Ink",      T.greenLight],
    ["EMNIST Balanced", T.blueLight ],
    ["PyTorch",         "#FDE68A"   ],   // yellow, not amber/orange
    ["47 classes",      T.green     ],
    ["EMNISTNet CNN",   T.greenLight],
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
      style={{ textAlign: "center", padding: "14px 0 6px" }}
    >
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", marginBottom: "11px" }}>
        {pills.map(([label, col]) => (
          <span key={label} style={{
            padding: "3px 11px", borderRadius: "99px",
            border: `1px solid ${col}30`, background: `${col}0C`,
            fontSize: "0.62rem", fontWeight: 700, color: col, letterSpacing: "0.06em",
          }}>
            {label}
          </span>
        ))}
      </div>
      <p style={{ color: T.dim, fontSize: "0.58rem", opacity: 0.45, letterSpacing: "0.08em" }}>
        Neural Ink · EMNIST Balanced · PyTorch · v7
      </p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT: App
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,       setTab]       = useState("draw");
  const [showArrow, setShowArrow] = useState(false);
  const resultRef = useRef(null);

  const { result, loading, error, history, runCanvas, runUpload, reset } = usePrediction();
  const [localHistory, setLocalHistory] = useState([]);
  useEffect(() => { setLocalHistory(history); }, [history]);

  // Auto-scroll to result
  useEffect(() => {
    if (result && !loading) {
      const panel = resultRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inView) {
        // Always scroll into view — show arrow as fallback for very long pages
        setTimeout(() => {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 280);
        setShowArrow(true);
        setTimeout(() => setShowArrow(false), 3200);
      } else {
        // Already in view: subtle scroll nudge to start of result
        setTimeout(() => {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 280);
      }
    }
  }, [result, loading]);

  // Haptic on result
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
      <style>{GLOBAL_CSS}</style>

      {/* Fixed background layers */}
      <AmbientOrbs />
      <NeuralGrid />

      {/* Top loading bar */}
      <TopLoadingBar loading={loading} />
      <DynamicIsland loading={loading} result={result} />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="app-wrapper">

          <Header />

          <AnimatePresence><InfoBanner key="info" /></AnimatePresence>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Tab switcher */}
            <TabBar tab={tab} onTabChange={handleTabChange} />

            {/* Input card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              <SectionLabel>
                {tab === "draw" ? "Draw your character" : "Upload an image"}
              </SectionLabel>
              <div className="card-bright" style={{
                padding: "22px", position: "relative", overflow: "hidden",
              }}>
                {/* Corner accents — citrus green top-left, blue bottom-right */}
                <div style={{
                  position: "absolute", top: 0, left: 0, width: "36px", height: "36px",
                  borderTop: `2px solid ${T.green}44`, borderLeft: `2px solid ${T.green}44`,
                  borderRadius: "var(--radius-xl) 0 0 0", pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", bottom: 0, right: 0, width: "36px", height: "36px",
                  borderBottom: `2px solid ${T.blue}38`, borderRight: `2px solid ${T.blue}38`,
                  borderRadius: "0 0 var(--radius-xl) 0", pointerEvents: "none",
                }} />
                <AnimatePresence mode="wait">
                  {tab === "draw" ? (
                    <motion.div key="draw"
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}
                    >
                      <DrawingCanvas onPredict={runCanvas} loading={loading} />
                    </motion.div>
                  ) : (
                    <motion.div key="upload"
                      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
                    >
                      <ImageUpload onPredict={runUpload} loading={loading} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Result panel */}
            <motion.div ref={resultRef}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SectionLabel>Prediction</SectionLabel>
              <ResultPanel result={result} loading={loading} error={error} />
            </motion.div>

            {/* Confidence meter */}
            {result && !loading && <ConfidenceMeter value={confidence} />}

            <VibDivider />

            {/* History */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card"
              style={{ padding: "20px 22px" }}
            >
              <PredictionHistory history={localHistory} onClear={handleClearHist} />
            </motion.div>

            <Footer />
          </div>

        </div>
      </div>

      <ScrollArrow show={showArrow} onClick={scrollToResult} />
    </>
  );
}
