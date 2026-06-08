// ═══════════════════════════════════════════════════════════════════════════════
//  Neural Ink · EMNIST Recogniser · App.jsx
//  v7 — GitHub / Grok Light Theme
//  Design: Bright white, crisp gray borders, cyan/yellow/red vibrant accents
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, ImageUp, X, Upload, ImageIcon,
  AlertTriangle, History, Trash2,
} from "lucide-react";
import { predictCanvas, predictUpload, getHealth } from "./lib/api";

// ───────────────────────────────────────────────────────────────────────────────
//  DESIGN TOKENS — GitHub-inspired light palette
// ───────────────────────────────────────────────────────────────────────────────
const T = {
  // Surfaces
  bg:            "#f6f8fa",
  surface:       "#ffffff",
  surface2:      "#f6f8fa",
  border:        "#d0d7de",
  borderLight:   "#e4e9ef",

  // Accents
  cyan:          "#06b6d4",
  cyanDark:      "#0891b2",
  cyanDeep:      "#164e63",
  cyanBg:        "#ecfeff",
  cyanBorder:    "#a5f3fc",

  yellow:        "#eab308",
  yellowDark:    "#a16207",
  yellowDeep:    "#713f12",
  yellowBg:      "#fefce8",
  yellowBorder:  "#fde047",

  red:           "#ef4444",
  redDark:       "#dc2626",
  redBg:         "#fef2f2",
  redBorder:     "#fecaca",

  green:         "#22c55e",
  greenDark:     "#16a34a",
  greenBg:       "#f0fdf4",
  greenBorder:   "#bbf7d0",

  amber:         "#f59e0b",
  amberDark:     "#b45309",
  amberBg:       "#fffbeb",
  amberBorder:   "#fde68a",

  orange:        "#f97316",
  orangeDark:    "#c2410c",
  orangeBg:      "#fff7ed",
  orangeBorder:  "#fed7aa",

  // Typography
  text:          "#1f2328",
  textSecond:    "#374151",
  textMuted:     "#656d76",
  textDim:       "#9ca3af",
};

// ───────────────────────────────────────────────────────────────────────────────
//  GLOBAL STYLES — injected once at mount
// ───────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  :root {
    --bg:            ${T.bg};
    --surface:       ${T.surface};
    --surface-2:     ${T.surface2};
    --border:        ${T.border};
    --border-light:  ${T.borderLight};

    --cyan:          ${T.cyan};
    --cyan-dark:     ${T.cyanDark};
    --cyan-bg:       ${T.cyanBg};

    --yellow:        ${T.yellow};
    --red:           ${T.red};
    --green:         ${T.green};

    --text:          ${T.text};
    --text-muted:    ${T.textMuted};
    --text-dim:      ${T.textDim};

    --font-display:  'DM Sans', system-ui, sans-serif;
    --font-mono:     'JetBrains Mono', 'Fira Code', monospace;

    --radius-sm:  6px;
    --radius-md:  10px;
    --radius-lg:  14px;
    --radius-xl:  18px;

    --shadow-sm:  0 1px 3px rgba(31,35,40,0.06), 0 1px 2px rgba(31,35,40,0.04);
    --shadow-md:  0 4px 12px rgba(31,35,40,0.08), 0 2px 6px rgba(31,35,40,0.04);
    --shadow-lg:  0 8px 32px rgba(31,35,40,0.10), 0 3px 10px rgba(31,35,40,0.06);

    --safe-top:    env(safe-area-inset-top,    0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    scroll-behavior: smooth;
    scroll-padding-top: 80px;
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

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--border-light); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

  button {
    touch-action: manipulation;
    font-family: var(--font-display);
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
  }
  button:disabled { cursor: not-allowed; }

  canvas { touch-action: none; display: block; }

  /* ── App shell ── */
  .app-wrapper {
    max-width: 560px;
    margin: 0 auto;
    padding: 24px 16px calc(56px + var(--safe-bottom));
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (min-width: 960px) {
    .app-wrapper {
      max-width: 1080px !important;
      padding-top: 32px;
    }
    .desktop-grid {
      display: grid !important;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      align-items: start;
    }
    .desktop-right {
      position: sticky;
      top: 80px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  }

  /* ── GitHub-style Cards ── */
  .gh-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
  .gh-card-raised {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 9px 18px;
    border-radius: var(--radius-md);
    font-size: 0.875rem; font-weight: 600; letter-spacing: -0.01em;
    transition: all 0.14s ease;
    font-family: var(--font-display);
    border: 1px solid transparent;
    white-space: nowrap;
    line-height: 1.25;
  }
  .btn:disabled { opacity: 0.42; cursor: not-allowed; transform: none !important; filter: none !important; }

  .btn-predict {
    background: linear-gradient(135deg, #06b6d4, #10b981);
    color: #fff;
    box-shadow: 0 1px 4px rgba(6,182,212,0.28);
  }
  .btn-predict:not(:disabled):hover {
    background: linear-gradient(135deg, #0891b2, #059669);
    box-shadow: 0 3px 14px rgba(6,182,212,0.42);
    transform: translateY(-1px);
  }
  .btn-predict:not(:disabled):active { transform: scale(0.975); box-shadow: none; }

  .btn-clear {
    background: ${T.redBg};
    color: ${T.red};
    border-color: ${T.redBorder};
  }
  .btn-clear:not(:disabled):hover { background: #fee2e2; border-color: #fca5a5; }
  .btn-clear:not(:disabled):active { transform: scale(0.975); }

  .btn-ghost {
    background: transparent;
    color: var(--text-muted);
    border-color: var(--border);
  }
  .btn-ghost:hover { background: var(--surface-2); color: var(--text); }

  /* ── Tab buttons ── */
  .btn-tab {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 9px 20px;
    border-radius: var(--radius-md);
    font-size: 0.875rem; font-weight: 500;
    transition: all 0.15s ease;
    font-family: var(--font-display);
    border: 1px solid transparent;
    flex: 1;
    color: var(--text-muted);
    background: transparent;
  }
  .btn-tab:hover { background: var(--surface-2); color: var(--text); }
  .btn-tab-draw-active {
    background: linear-gradient(135deg, #06b6d4, #10b981) !important;
    color: #fff !important;
    font-weight: 600 !important;
    border-color: transparent !important;
    box-shadow: 0 2px 8px rgba(6,182,212,0.32) !important;
  }
  .btn-tab-upload-active {
    background: var(--surface) !important;
    color: var(--text) !important;
    font-weight: 600 !important;
    border-color: var(--border) !important;
    box-shadow: var(--shadow-sm) !important;
  }

  /* ── Brush selector ── */
  .brush-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 4px 12px; border-radius: 6px;
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em;
    cursor: pointer; transition: all 0.12s ease;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-muted);
    font-family: var(--font-display);
  }
  .brush-btn:hover {
    background: var(--cyan-bg);
    border-color: var(--cyan);
    color: var(--cyan-dark);
  }
  .brush-active {
    background: var(--cyan-bg) !important;
    border-color: var(--cyan) !important;
    color: var(--cyan-dark) !important;
    font-weight: 800 !important;
    box-shadow: 0 0 0 2px rgba(6,182,212,0.15);
  }

  /* ── Badges ── */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 9px; border-radius: 99px;
    font-size: 0.67rem; font-weight: 600; letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .badge-gray   { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-muted); }
  .badge-cyan   { background: ${T.cyanBg};   border: 1px solid ${T.cyanBorder};   color: ${T.cyanDark};   }
  .badge-green  { background: ${T.greenBg};  border: 1px solid ${T.greenBorder};  color: ${T.greenDark};  }
  .badge-yellow { background: ${T.yellowBg}; border: 1px solid ${T.yellowBorder}; color: ${T.yellowDark}; }
  .badge-red    { background: ${T.redBg};    border: 1px solid ${T.redBorder};    color: ${T.redDark};    }
  .badge-amber  { background: ${T.amberBg};  border: 1px solid ${T.amberBorder};  color: ${T.amberDark};  }

  /* ── Pulse dots ── */
  .pulse-dot {
    display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  }
  .pulse-dot.green { background: ${T.green}; animation: pg 2s infinite; }
  .pulse-dot.amber { background: ${T.amber}; animation: pa 2s infinite; }
  .pulse-dot.red   { background: ${T.red};   animation: pr 2s infinite; }
  @keyframes pg { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.42);  } 55% { box-shadow: 0 0 0 4px rgba(34,197,94,0);  } }
  @keyframes pa { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.42); } 55% { box-shadow: 0 0 0 4px rgba(245,158,11,0); } }
  @keyframes pr { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.42);  } 55% { box-shadow: 0 0 0 4px rgba(239,68,68,0);  } }

  /* ── Confidence bars ── */
  .conf-track { flex: 1; background: var(--border-light); border-radius: 99px; overflow: hidden; height: 6px; }
  .conf-fill  { height: 100%; border-radius: 99px; }

  /* ── Header ── */
  .gh-header {
    position: sticky; top: 0; z-index: 100;
    background: rgba(255,255,255,0.90);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    padding-top: var(--safe-top);
  }
  .gh-header-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 11px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  /* ── Loading bar ── */
  .lbar-wrap {
    position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 999;
    background: rgba(6,182,212,0.12); overflow: hidden;
  }
  .lbar-fill {
    height: 100%; width: 50%;
    background: linear-gradient(90deg, transparent, ${T.cyan}, #10b981, transparent);
    animation: lbsweep 1.1s ease-in-out infinite;
  }
  @keyframes lbsweep { from { transform: translateX(-120%); } to { transform: translateX(280%); } }

  /* ── Section label ── */
  .sec-label {
    font-size: 0.65rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text-dim);
  }

  /* ── Scroll momentum ── */
  .scroll-momentum { -webkit-overflow-scrolling: touch; }

  /* ── Upload drop-zone ── */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    transition: all 0.18s ease;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 14px;
    min-height: 180px;
  }
  .drop-zone:hover,
  .drop-zone-active {
    border-color: var(--cyan);
    background: var(--cyan-bg);
  }

  /* ── Result ring flash ── */
  @keyframes resultPop {
    0%   { transform: scale(0.78); opacity: 0; }
    65%  { transform: scale(1.04);  opacity: 1; }
    100% { transform: scale(1);     opacity: 1; }
  }
  .result-pop { animation: resultPop 0.38s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* ── History ── */
  .hist-item {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 14px; border-radius: var(--radius-md);
    background: var(--surface);
    border: 1px solid var(--border-light);
    transition: border-color 0.12s ease;
  }
  .hist-item:hover { border-color: var(--border); }
`;

// ───────────────────────────────────────────────────────────────────────────────
//  HOOK: useCanvas — white-bg, dark-ink, smooth drawing
// ───────────────────────────────────────────────────────────────────────────────
function useCanvas({ brushSize = 10, brushColor = "#111827" } = {}) {
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
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  const getBase64 = useCallback(() =>
    canvasRef.current?.toDataURL("image/png") ?? null, []);

  // One-time white-fill initialisation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Event listeners — re-attached when brush settings change
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
//  COMPONENT: TopLoadingBar
// ───────────────────────────────────────────────────────────────────────────────
function TopLoadingBar({ loading }) {
  if (!loading) return null;
  return (
    <div className="lbar-wrap">
      <div className="lbar-fill" />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: SpinIcon
// ───────────────────────────────────────────────────────────────────────────────
function SpinIcon({ size = 14, color = "currentColor" }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.72, ease: "linear" }}
      style={{
        width: size, height: size, flexShrink: 0,
        border: `2px solid ${color === "currentColor" ? "rgba(255,255,255,0.3)" : color + "40"}`,
        borderTopColor: color === "currentColor" ? "#ffffff" : color,
        borderRadius: "50%",
      }}
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: Header
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

  const dotClass = status === "ok" ? "green" : status === "checking" ? "amber" : "red";
  const statusText = status === "ok" ? "Model online"
    : status === "checking" ? "Connecting…"
    : "Offline";
  const statusStyle = {
    ok:       { bg: T.greenBg,  border: T.greenBorder,  color: T.greenDark  },
    checking: { bg: T.amberBg,  border: T.amberBorder,  color: T.amberDark  },
    error:    { bg: T.redBg,    border: T.redBorder,    color: T.redDark    },
  }[status] ?? {};

  return (
    <header className="gh-header">
      <div className="gh-header-inner">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <span style={{ fontSize: "1.15rem", lineHeight: 1 }}>✍️</span>
          <h1 style={{
            fontSize: "1.15rem", fontWeight: 800,
            letterSpacing: "-0.03em", color: T.text, lineHeight: 1,
          }}>
            Neural{" "}
            <span style={{ color: T.cyan }}>Ink</span>
          </h1>
        </div>

        {/* Badges row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span className="badge badge-gray">EMNISTNet CNN</span>
          <span className="badge badge-gray">PyTorch</span>
          <span className="badge badge-gray">47 Classes</span>
          {/* Status pill */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "2px 9px", borderRadius: "99px",
            background: statusStyle.bg,
            border: `1px solid ${statusStyle.border}`,
            fontSize: "0.67rem", fontWeight: 600, color: statusStyle.color,
          }}>
            <span className={`pulse-dot ${dotClass}`} />
            {statusText}
          </span>
        </div>
      </div>
    </header>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: TabBar
// ───────────────────────────────────────────────────────────────────────────────
function TabBar({ tab, onTabChange }) {
  return (
    <div style={{
      display: "flex", gap: "8px",
      padding: "5px",
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-sm)",
    }}>
      <button
        className={`btn-tab ${tab === "draw" ? "btn-tab-draw-active" : ""}`}
        onClick={() => onTabChange("draw")}
      >
        <PenLine size={15} />
        ✍️ Draw
      </button>
      <button
        className={`btn-tab ${tab === "upload" ? "btn-tab-upload-active" : ""}`}
        onClick={() => onTabChange("upload")}
      >
        <ImageUp size={15} />
        📤 Upload
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: DrawingCanvas
// ───────────────────────────────────────────────────────────────────────────────
const BRUSH_SIZES = [
  { label: "XS", size: 6  },
  { label: "S",  size: 10 },
  { label: "M",  size: 17 },
  { label: "L",  size: 26 },
];

function DrawingCanvas({ onPredict, loading }) {
  const [brushSize, setBrushSize] = useState(10);
  const { canvasRef, clear, getBase64, isEmpty } = useCanvas({
    brushSize,
    brushColor: "#111827",
  });

  const handlePredict = useCallback(() => {
    const b64 = getBase64();
    if (!b64 || isEmpty) return;
    haptic(18);
    onPredict(b64);
  }, [getBase64, isEmpty, onPredict]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Brush selector + label row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="sec-label">Draw your character</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
            color: T.textDim, textTransform: "uppercase",
          }}>Brush</span>
          <div style={{ display: "flex", gap: "3px" }}>
            {BRUSH_SIZES.map(b => (
              <button
                key={b.label}
                className={`brush-btn${brushSize === b.size ? " brush-active" : ""}`}
                onClick={() => { haptic(6); setBrushSize(b.size); }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <div style={{
          borderRadius: "var(--radius-md)",
          border: `1px solid ${T.border}`,
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "var(--shadow-sm)",
          cursor: "crosshair",
          transition: "border-color 0.15s ease",
        }}>
          <canvas
            ref={canvasRef}
            width={280}
            height={280}
            style={{ width: "100%", aspectRatio: "1 / 1" }}
          />
        </div>

        {/* Empty-state overlay */}
        <AnimatePresence>
          {isEmpty && !loading && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                pointerEvents: "none", gap: "6px",
              }}
            >
              <span style={{
                fontSize: "5rem", fontWeight: 900, lineHeight: 1,
                color: T.borderLight, fontFamily: "var(--font-mono)",
                userSelect: "none",
              }}>A</span>
              <span style={{
                fontSize: "0.73rem", color: T.textDim,
                fontFamily: "var(--font-mono)",
              }}>
                Draw a digit or letter
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          className="btn btn-predict"
          style={{ flex: 2 }}
          onClick={handlePredict}
          disabled={loading || isEmpty}
        >
          {loading
            ? <><SpinIcon size={14} /> Predicting…</>
            : <>⚡ Predict</>
          }
        </button>
        <button
          className="btn btn-clear"
          style={{ flex: 1 }}
          onClick={() => { haptic(8); clear(); }}
          disabled={isEmpty || loading}
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ImageUpload
// ───────────────────────────────────────────────────────────────────────────────
const MAX_FILES = 5;

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
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      <span className="sec-label">Upload an image</span>

      {/* Drop zone */}
      <div
        className={`drop-zone${isDrag ? " drop-zone-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
        <motion.div
          animate={isDrag ? { scale: 1.15, rotate: 8 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 280 }}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            background: isDrag ? T.cyanBg : T.surface2,
            border: `1px solid ${isDrag ? T.cyan : T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {isDrag
            ? <ImageIcon size={20} color={T.cyan} />
            : <Upload    size={20} color={T.textMuted} />
          }
        </motion.div>
        <div>
          <p style={{ color: isDrag ? T.cyanDark : T.text, fontSize: "0.9rem", fontWeight: 600, marginBottom: "3px" }}>
            {isDrag ? "Drop to add images" : "Drag & drop images here"}
          </p>
          <p style={{ color: T.textMuted, fontSize: "0.76rem" }}>
            PNG · JPG · BMP · WEBP · up to {MAX_FILES} files
          </p>
        </div>
        <span className="badge badge-gray">or click to browse</span>
      </div>

      {/* Preview grid */}
      <AnimatePresence>
        {preview.length > 0 && (
          <motion.div
            key="previews"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
              gap: "10px",
            }}
          >
            {preview.map((p, i) => (
              <motion.div
                key={p.name + i}
                initial={{ opacity: 0, scale: 0.84 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.84 }}
                style={{ position: "relative" }}
              >
                <img
                  src={p.url}
                  alt={p.name}
                  style={{
                    width: "100%", aspectRatio: "1/1", objectFit: "cover",
                    borderRadius: "var(--radius-md)",
                    border: `2px solid ${loading && current === i ? T.cyan : T.border}`,
                    transition: "border-color 0.15s ease",
                  }}
                />
                {!loading && (
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(i); }}
                    style={{
                      position: "absolute", top: -6, right: -6,
                      width: 20, height: 20, borderRadius: "50%",
                      background: T.red, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                    }}
                  >
                    <X size={10} />
                  </button>
                )}
                {loading && current === i && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "var(--radius-md)",
                    background: "rgba(255,255,255,0.72)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <SpinIcon size={18} color={T.cyan} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Predict button */}
      <button
        className="btn btn-predict"
        style={{ width: "100%" }}
        onClick={handlePredict}
        disabled={loading || files.length === 0}
      >
        {loading
          ? <><SpinIcon size={14} /> Predicting… ({current + 1}/{files.length})</>
          : <>⚡ Predict {files.length > 0 ? `(${files.length} image${files.length > 1 ? "s" : ""})` : ""}</>
        }
      </button>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: Top-5 Prediction Bars
// ───────────────────────────────────────────────────────────────────────────────
function barColor(prob) {
  if (prob >= 80) return { fill: "#22c55e", text: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
  if (prob >= 60) return { fill: "#06b6d4", text: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" };
  if (prob >= 40) return { fill: "#f59e0b", text: "#b45309", bg: "#fffbeb", border: "#fde68a" };
  if (prob >= 20) return { fill: "#f97316", text: "#c2410c", bg: "#fff7ed", border: "#fed7aa" };
  return              { fill: "#ef4444", text: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
}

function MiniBar({ label, prob, highlight = false, delay = 0 }) {
  const col = barColor(prob);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22 }}
      style={{ display: "flex", alignItems: "center", gap: "10px" }}
    >
      {/* Label box */}
      <div style={{
        width: 34, height: 34, borderRadius: "var(--radius-sm)", flexShrink: 0,
        background: highlight ? col.bg : T.surface2,
        border: `1px solid ${highlight ? col.border : T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: "1.05rem", fontWeight: 700,
          color: highlight ? col.text : T.textMuted, lineHeight: 1,
        }}>
          {label}
        </span>
      </div>

      {/* Bar */}
      <div className="conf-track" style={{ height: highlight ? 8 : 6 }}>
        <motion.div
          className="conf-fill"
          initial={{ width: 0 }}
          animate={{ width: `${prob}%` }}
          transition={{ duration: 0.8, delay, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ background: col.fill }}
        />
      </div>

      {/* Percentage */}
      <span style={{
        width: "44px", textAlign: "right", flexShrink: 0,
        fontFamily: "var(--font-mono)",
        fontSize: highlight ? "0.8rem" : "0.73rem",
        fontWeight: highlight ? 700 : 400,
        color: highlight ? col.text : T.textMuted,
      }}>
        {prob.toFixed(1)}%
      </span>
    </motion.div>
  );
}

function Top5Bars({ top5 }) {
  if (!top5?.length) return null;
  return (
    <div>
      <p className="sec-label" style={{ marginBottom: "12px" }}>Top-5 predictions</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
        {top5.map((item, i) => (
          <MiniBar
            key={item.label + i}
            label={item.label}
            prob={item.prob * 100}
            highlight={i === 0}
            delay={i * 0.055}
          />
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: ResultCard
// ───────────────────────────────────────────────────────────────────────────────
function ringColors(conf, uncertain) {
  if (uncertain)  return { stroke: T.red,    bg: T.redBg,    textColor: T.redDark,    glow: "rgba(239,68,68,0.18)"   };
  if (conf >= 80) return { stroke: T.yellow, bg: T.yellowBg, textColor: T.yellowDark, glow: "rgba(234,179,8,0.18)"   };
  if (conf >= 60) return { stroke: T.cyan,   bg: T.cyanBg,   textColor: T.cyanDark,   glow: "rgba(6,182,212,0.18)"   };
  if (conf >= 40) return { stroke: T.amber,  bg: T.amberBg,  textColor: T.amberDark,  glow: "rgba(245,158,11,0.18)"  };
  return              { stroke: T.orange, bg: T.orangeBg, textColor: T.orangeDark, glow: "rgba(249,115,22,0.18)"  };
}

function confidenceStars(conf) {
  if (conf >= 85) return "⭐⭐⭐";
  if (conf >= 65) return "⭐⭐";
  if (conf >= 45) return "⭐";
  return "";
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "14px", padding: "44px 20px",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: T.surface2,
        border: `2px dashed ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "2rem", color: T.textDim }}>?</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: T.textMuted, fontSize: "0.88rem", fontWeight: 500, marginBottom: "4px" }}>
          Awaiting prediction
        </p>
        <p style={{ color: T.textDim, fontSize: "0.74rem" }}>
          Draw or upload an image to begin
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "16px", padding: "44px 20px",
    }}>
      <div style={{ position: "relative", width: 52, height: 52 }}>
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.0, ease: "linear" }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `2px solid ${T.borderLight}`,
            borderTopColor: T.cyan,
          }}
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 0.65, ease: "linear" }}
          style={{
            position: "absolute", inset: 10, borderRadius: "50%",
            border: `2px solid ${T.borderLight}`,
            borderTopColor: "#10b981",
          }}
        />
      </div>
      <p style={{
        color: T.textMuted, fontSize: "0.84rem",
        fontFamily: "var(--font-mono)",
      }}>
        Running inference…
      </p>
    </div>
  );
}

function ResultContent({ result }) {
  const conf   = result.confidence;
  const uncert = result.uncertain;
  const col    = ringColors(conf, uncert);
  const stars  = confidenceStars(conf);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Circular character display */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "14px",
      }}>
        <div className="result-pop" style={{
          width: 120, height: 120, borderRadius: "50%",
          border: `2.5px solid ${col.stroke}`,
          background: col.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 0 6px ${col.glow}, 0 4px 20px ${col.glow}`,
        }}>
          {uncert ? (
            <AlertTriangle size={36} color={col.textColor} />
          ) : (
            <span style={{
              fontSize: "3.4rem", fontWeight: 900, lineHeight: 1,
              color: col.textColor,
              fontFamily: "var(--font-mono)",
            }}>
              {result.label}
            </span>
          )}
        </div>

        {/* Confidence text */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: T.text, marginBottom: "4px" }}>
            {uncert ? "Low confidence" : `"${result.label}" detected`}
          </p>
          <p style={{ fontSize: "0.84rem", color: T.textMuted }}>
            {stars && <>{stars}&nbsp;</>}
            {conf.toFixed(1)}% confidence
          </p>
          {result.latency_ms != null && (
            <p style={{
              fontSize: "0.72rem", color: T.textDim, marginTop: "4px",
              fontFamily: "var(--font-mono)",
            }}>
              ⚡ {result.latency_ms}ms inference
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: T.borderLight }} />

      {/* Top-5 bars */}
      {result.topK?.length > 0 && <Top5Bars top5={result.topK} />}
    </motion.div>
  );
}

function ResultCard({ result, loading, error }) {
  return (
    <div>
      <p className="sec-label" style={{ marginBottom: "14px" }}>Prediction</p>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingState />
          </motion.div>

        ) : error ? (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "12px",
              padding: "36px 20px", textAlign: "center",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: T.redBg, border: `1px solid ${T.redBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertTriangle size={22} color={T.red} />
              </div>
              <p style={{ color: T.red, fontSize: "0.87rem", fontWeight: 500 }}>
                {error}
              </p>
              <p style={{ color: T.textDim, fontSize: "0.72rem" }}>
                Check your backend is running and CORS is configured correctly.
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

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: PredictionHistory
// ───────────────────────────────────────────────────────────────────────────────
function histColors(conf, uncertain) {
  if (uncertain)  return { bg: T.redBg,    border: T.redBorder,    text: T.redDark,    accent: T.red    };
  if (conf >= 80) return { bg: T.greenBg,  border: T.greenBorder,  text: T.greenDark,  accent: T.green  };
  if (conf >= 60) return { bg: T.cyanBg,   border: T.cyanBorder,   text: T.cyanDark,   accent: T.cyan   };
  if (conf >= 40) return { bg: T.amberBg,  border: T.amberBorder,  text: T.amberDark,  accent: T.amber  };
  return              { bg: T.orangeBg, border: T.orangeBorder, text: T.orangeDark, accent: T.orange };
}

function HistoryItem({ entry, index }) {
  const conf   = entry.confidence;
  const col    = histColors(conf, entry.uncertain);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1,  y: 0,  scale: 1    }}
      exit={{    opacity: 0,  x: 16, scale: 0.95  }}
      transition={{ type: "spring", stiffness: 340, damping: 28, delay: index * 0.018 }}
      className="hist-item"
    >
      {/* Left accent stripe */}
      <div style={{
        width: 3, alignSelf: "stretch", borderRadius: "2px",
        background: col.accent, flexShrink: 0,
      }} />

      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: "var(--radius-sm)", flexShrink: 0,
        background: col.bg, border: `1px solid ${col.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {entry.uncertain
          ? <AlertTriangle size={16} color={col.text} />
          : <span style={{
              fontFamily: "var(--font-mono)", fontSize: "1.5rem",
              fontWeight: 800, color: col.text, lineHeight: 1,
            }}>
              {entry.label}
            </span>
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.82rem",
            fontWeight: 600, color: T.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {entry.uncertain ? "Uncertain" : `"${entry.label}"`}
          </span>
          <span style={{
            padding: "1px 7px", borderRadius: "20px",
            background: col.bg, border: `1px solid ${col.border}`,
            color: col.text, fontSize: "0.67rem",
            fontFamily: "var(--font-mono)", fontWeight: 600, flexShrink: 0,
          }}>
            {conf.toFixed(0)}%
          </span>
        </div>
        <p style={{
          color: T.textDim, fontSize: "0.69rem",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          fontFamily: "var(--font-mono)",
        }}>
          {entry.source === "draw" ? "✏️ drawn" : entry.source}
          {entry.latency_ms != null ? ` · ${entry.latency_ms}ms` : ""}
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
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <History size={13} color={T.textMuted} />
          <span className="sec-label">History</span>
          <AnimatePresence>
            {history.length > 0 && (
              <motion.span
                key={history.length}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                className="badge badge-cyan"
              >
                {history.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {history.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1,  x: 0 }}
              exit={{    opacity: 0,  x: 8 }}
              className="btn btn-ghost"
              style={{ padding: "4px 12px", fontSize: "0.72rem", borderRadius: "99px" }}
              onClick={onClear}
            >
              <Trash2 size={11} /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div
        className="scroll-momentum"
        style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "340px", overflowY: "auto" }}
      >
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ color: T.textDim, fontSize: "0.8rem", padding: "14px 0", textAlign: "center" }}
            >
              No predictions yet.
            </motion.p>
          ) : (
            history.map((entry, i) => (
              <HistoryItem key={entry.id} entry={entry} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
//  COMPONENT: Footer
// ───────────────────────────────────────────────────────────────────────────────
function Footer() {
  const pills = [
    ["Neural Ink",      T.cyanDark   ],
    ["EMNIST Balanced", T.cyanDeep   ],
    ["PyTorch",         T.yellowDark ],
    ["47 classes",      T.textMuted  ],
    ["EMNISTNet CNN",   T.greenDark  ],
  ];
  return (
    <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
      <div style={{
        display: "flex", gap: "6px", justifyContent: "center",
        flexWrap: "wrap", marginBottom: "10px",
      }}>
        {pills.map(([label, color]) => (
          <span key={label} style={{
            padding: "2px 10px", borderRadius: "99px",
            border: `1px solid ${T.border}`,
            background: T.surface2,
            fontSize: "0.61rem", fontWeight: 600,
            color, letterSpacing: "0.04em",
          }}>
            {label}
          </span>
        ))}
      </div>
      <p style={{ color: T.textDim, fontSize: "0.57rem", letterSpacing: "0.08em" }}>
        Neural Ink · EMNIST Balanced · PyTorch · v7
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROOT: App
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab,          setTab]          = useState("draw");
  const resultRef                       = useRef(null);
  const { result, loading, error, history, runCanvas, runUpload, reset } = usePrediction();
  const [localHistory, setLocalHistory] = useState([]);

  // Sync history
  useEffect(() => { setLocalHistory(history); }, [history]);

  // Auto-scroll to result when it arrives
  useEffect(() => {
    if (result && !loading) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [result, loading]);

  // Haptic feedback on result
  useEffect(() => {
    if (result && !loading && !error) {
      result.uncertain
        ? haptic(40)
        : navigator?.vibrate?.([12, 60, 12]);
    }
  }, [result, loading, error]);

  const handleTabChange = useCallback((id) => { haptic(8); setTab(id); reset(); }, [reset]);
  const handleClearHist = useCallback(() => { haptic(20); setLocalHistory([]); }, []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <TopLoadingBar loading={loading} />
      <Header />

      <div className="app-wrapper">
        {/* Two-column grid on desktop, single column on mobile */}
        <div
          className="desktop-grid"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* ── Left: Input column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Tab switcher */}
            <TabBar tab={tab} onTabChange={handleTabChange} />

            {/* Input card */}
            <div className="gh-card-raised" style={{ padding: "22px" }}>
              <AnimatePresence mode="wait">
                {tab === "draw" ? (
                  <motion.div
                    key="draw"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1,  x:   0 }}
                    exit={{    opacity: 0,  x:  10 }}
                    transition={{ duration: 0.18 }}
                  >
                    <DrawingCanvas onPredict={runCanvas} loading={loading} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x:  10 }}
                    animate={{ opacity: 1,  x:   0 }}
                    exit={{    opacity: 0,  x: -10 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ImageUpload onPredict={runUpload} loading={loading} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right: Result + History column ── */}
          <div className="desktop-right" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Result card */}
            <div ref={resultRef} className="gh-card-raised" style={{ padding: "22px" }}>
              <ResultCard result={result} loading={loading} error={error} />
            </div>

            {/* History card */}
            <div className="gh-card" style={{ padding: "22px" }}>
              <PredictionHistory history={localHistory} onClear={handleClearHist} />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
