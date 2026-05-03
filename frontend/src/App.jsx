import {
  useState, useRef, useEffect, useCallback, useReducer,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PenLine, ImageUp, X, Zap, Eraser, Upload, ImageIcon,
  AlertTriangle, History, Trash2, Brain, Cpu, Sparkles, ChevronDown,
} from "lucide-react";
import { predictCanvas, predictUpload, getHealth } from "./lib/api";
 
// ── GLOBAL CSS ─────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Bebas+Neue&display=swap');
 
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
 
  :root {
    --ink:        #0C0C0E;
    --ink-2:      #111114;
    --ink-3:      #18181C;
    --ink-4:      #222228;
    --border:     rgba(255,255,255,0.07);
    --border-hi:  rgba(255,255,255,0.13);
    --amber:      #F59E0B;
    --amber-dim:  #B45309;
    --amber-glow: rgba(245,158,11,0.18);
    --amber-glow2:rgba(245,158,11,0.08);
    --teal:       #2DD4BF;
    --teal-dim:   #0D9488;
    --rose:       #FB7185;
    --green:      #34D399;
    --muted:      #6B7280;
    --dim:        #374151;
    --white:      #F9FAFB;
    --off:        #D1D5DB;
    --font-head:  'Bebas Neue', sans-serif;
    --font-body:  'Space Grotesk', sans-serif;
    --font-mono:  'DM Mono', monospace;
    --r-sm:       6px;
    --r-md:       10px;
    --r-lg:       14px;
    --r-xl:       20px;
    --safe-top:   env(safe-area-inset-top, 0px);
    --safe-bot:   env(safe-area-inset-bottom, 0px);
  }
 
  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
 
  body {
    background: var(--ink);
    color: var(--white);
    font-family: var(--font-body);
    min-height: 100dvh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }
 
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--amber-dim); border-radius: 99px; }
 
  button { font-family: var(--font-body); cursor: pointer; touch-action: manipulation; }
 
  .shell {
    max-width: 480px;
    margin: 0 auto;
    padding: calc(var(--safe-top) + 28px) 20px calc(var(--safe-bot) + 72px);
  }
 
  @media (min-width: 900px) {
    .shell { max-width: 1100px; }
    .desktop-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 32px;
      align-items: start;
    }
    .desktop-sticky { position: sticky; top: 32px; }
  }
 
  /* Noise texture overlay */
  .noise::after {
    content: '';
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
    opacity: 0.4;
  }
 
  /* Corner scan line decorations */
  .corner-tl::before, .corner-br::after {
    content: '';
    position: absolute;
    width: 28px; height: 28px;
    pointer-events: none;
  }
  .corner-tl::before {
    top: 0; left: 0;
    border-top: 1.5px solid var(--amber);
    border-left: 1.5px solid var(--amber);
    border-radius: var(--r-lg) 0 0 0;
  }
  .corner-br::after {
    bottom: 0; right: 0;
    border-bottom: 1.5px solid var(--amber);
    border-right: 1.5px solid var(--amber);
    border-radius: 0 0 var(--r-lg) 0;
  }
 
  /* Card base */
  .card {
    background: var(--ink-2);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    position: relative;
    overflow: hidden;
  }
  .card-hi {
    background: var(--ink-3);
    border: 1px solid var(--border-hi);
    border-radius: var(--r-xl);
    position: relative;
    overflow: hidden;
  }
 
  /* Scan line horizontal */
  @keyframes scan {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }
  .scan-shimmer {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.06) 50%, transparent 100%);
    animation: scan 3s ease-in-out infinite;
  }
 
  /* Loading bar */
  @keyframes loadbar {
    0%   { left: -40%; width: 40%; }
    50%  { left: 40%; width: 40%; }
    100% { left: 100%; width: 40%; }
  }
 
  /* Result flash */
  @keyframes resultFlash {
    0%   { box-shadow: 0 0 0px transparent; }
    40%  { box-shadow: 0 0 60px rgba(245,158,11,0.25), 0 0 120px rgba(245,158,11,0.1); }
    100% { box-shadow: 0 0 0px transparent; }
  }
  .result-flash { animation: resultFlash 1.6s ease-out forwards; }
 
  /* Pulse */
  @keyframes pulse-ring {
    0%,100% { box-shadow: 0 0 0 0 currentColor; }
    60%     { box-shadow: 0 0 0 5px transparent; }
  }
  .pulse-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; animation: pulse-ring 2s ease infinite; }
  .pulse-dot.green { background: #34D399; }
  .pulse-dot.amber { background: var(--amber); }
  .pulse-dot.red   { background: var(--rose); }
 
  /* Canvas glow */
  @keyframes canvas-breathe {
    0%,100% { box-shadow: 0 0 0 1px rgba(245,158,11,0.2), 0 0 24px rgba(245,158,11,0.04); }
    50%     { box-shadow: 0 0 0 1px rgba(245,158,11,0.45), 0 0 40px rgba(245,158,11,0.12); }
  }
  .canvas-breathe { animation: canvas-breathe 4s ease-in-out infinite; }
 
  /* Gradient text */
  .grad-text {
    background: linear-gradient(135deg, var(--amber), #FDE68A, var(--amber));
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: grad-shift 4s linear infinite;
  }
  @keyframes grad-shift { to { background-position: 200% center; } }
 
  /* iOS momentum scroll */
  .scroll-m { -webkit-overflow-scrolling: touch; }
 
  /* Stat tick up animation */
  @keyframes tick { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .tick { animation: tick 0.35s ease-out both; }
`;
 
// ── UTILITY ────────────────────────────────────────────────────────────────────
const haptic = (ms = 10) => navigator?.vibrate?.(ms);
 
function barColor(p) {
  if (p >= 80) return "#34D399";
  if (p >= 60) return "#2DD4BF";
  if (p >= 40) return "#F59E0B";
  if (p >= 25) return "#FB923C";
  return "#FB7185";
}
 
// ── HOOKS ──────────────────────────────────────────────────────────────────────
function useCanvas({ brushSize = 20 } = {}) {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const lastPos   = useRef({ x: 0, y: 0 });
  const [isEmpty, setIsEmpty] = useState(true);
 
  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if (e.touches) return {
      x: (e.touches[0].clientX - rect.left) * sx,
      y: (e.touches[0].clientY - rect.top) * sy,
    };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }, []);
 
  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    drawing.current = true; lastPos.current = pos; setIsEmpty(false);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff"; ctx.fill();
  }, [brushSize, getPos]);
 
  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    lastPos.current = pos;
  }, [brushSize, getPos]);
 
  const stopDraw = useCallback(() => { drawing.current = false; }, []);
 
  const clear = useCallback(() => {
    const c = canvasRef.current;
    if (c) { c.getContext("2d").clearRect(0, 0, c.width, c.height); setIsEmpty(true); }
  }, []);
 
  const getBase64 = useCallback(() => canvasRef.current?.toDataURL("image/png") ?? null, []);
 
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener("mousedown",  startDraw);
    c.addEventListener("mousemove",  draw);
    c.addEventListener("mouseup",    stopDraw);
    c.addEventListener("mouseleave", stopDraw);
    c.addEventListener("touchstart", startDraw, { passive: false });
    c.addEventListener("touchmove",  draw,      { passive: false });
    c.addEventListener("touchend",   stopDraw);
    return () => {
      c.removeEventListener("mousedown",  startDraw);
      c.removeEventListener("mousemove",  draw);
      c.removeEventListener("mouseup",    stopDraw);
      c.removeEventListener("mouseleave", stopDraw);
      c.removeEventListener("touchstart", startDraw);
      c.removeEventListener("touchmove",  draw);
      c.removeEventListener("touchend",   stopDraw);
    };
  }, [startDraw, draw, stopDraw]);
 
  return { canvasRef, clear, getBase64, isEmpty };
}
 
const MAX_HIST = 14;
function usePrediction() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [history, setHistory] = useState([]);
 
  const push = useCallback((res, src) => {
    const e = { ...res, source: src, id: Date.now() };
    setHistory(p => [e, ...p].slice(0, MAX_HIST));
    return e;
  }, []);
 
  const runCanvas = useCallback(async (b64) => {
    setLoading(true); setError(null);
    try { setResult(push(await predictCanvas(b64), "draw")); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [push]);
 
  const runUpload = useCallback(async (file) => {
    setLoading(true); setError(null);
    try { setResult(push(await predictUpload(file), `📎 ${file.name}`)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [push]);
 
  const reset = useCallback(() => { setResult(null); setError(null); }, []);
  return { result, loading, error, history, runCanvas, runUpload, reset };
}
 
// ── BACKGROUND ─────────────────────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Dot grid */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
        <defs>
          <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#F59E0B" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>
      {/* Amber radial glow top-left */}
      <div style={{
        position: "absolute", top: "-200px", left: "-150px",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 65%)",
      }} />
      {/* Teal radial glow bottom-right */}
      <div style={{
        position: "absolute", bottom: "-150px", right: "-100px",
        width: "400px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 65%)",
      }} />
      {/* Vertical line accent */}
      <div style={{
        position: "absolute", top: 0, left: "50%", width: "1px", height: "100%",
        background: "linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.06) 30%, transparent 70%)",
      }} />
    </div>
  );
}
 
// ── TOP LOADER ─────────────────────────────────────────────────────────────────
function TopLoader({ loading }) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div key="loader"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, height: "2px",
            background: "rgba(245,158,11,0.12)", zIndex: 999, overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", top: 0, left: 0, height: "100%", width: "35%",
              background: "linear-gradient(90deg, transparent, #F59E0B, #FDE68A, #F59E0B, transparent)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
 
// ── STATUS PILL ────────────────────────────────────────────────────────────────
function StatusPill() {
  const [status, setStatus] = useState("checking");
 
  useEffect(() => {
    let dead = false;
    async function check() {
      try {
        const h = await getHealth();
        if (!dead) setStatus(h.status === "ok" ? "ok" : "degraded");
      } catch { if (!dead) setStatus("error"); }
    }
    check();
    const id = setInterval(check, 30_000);
    return () => { dead = true; clearInterval(id); };
  }, []);
 
  const dot   = status === "ok" ? "green" : status === "checking" ? "amber" : "red";
  const label = status === "ok" ? "Online" : status === "checking" ? "Connecting" : "Offline";
  const col   = status === "ok" ? "#34D399" : status === "checking" ? "#F59E0B" : "#FB7185";
 
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "7px",
      padding: "5px 12px", borderRadius: "99px",
      background: "var(--ink-3)", border: "1px solid var(--border-hi)",
    }}>
      <span className={`pulse-dot ${dot}`} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: col, fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}
 
// ── HEADER ─────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ marginBottom: "32px" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Logo mark */}
          <div style={{
            width: 34, height: 34, borderRadius: "8px",
            background: "linear-gradient(135deg, var(--amber), var(--amber-dim))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
          }}>
            <Brain size={16} color="#000" strokeWidth={2.5} />
          </div>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "0.72rem",
            color: "var(--muted)", letterSpacing: "0.12em",
          }}>EMNIST · 47 classes</span>
        </div>
        <StatusPill />
      </div>
 
      {/* Title block */}
      <div style={{ borderLeft: "3px solid var(--amber)", paddingLeft: "16px", marginBottom: "14px" }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: "clamp(3.2rem, 12vw, 5.5rem)",
          lineHeight: 0.9,
          letterSpacing: "0.03em",
          color: "var(--white)",
        }}>
          NEURAL<br />
          <span className="grad-text">INK</span>
        </h1>
      </div>
 
      <p style={{ color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.7, maxWidth: "340px" }}>
        Handwritten character recognition — digits 0–9 and letters A–Z — powered by EMNISTNet CNN & PyTorch.
      </p>
 
      {/* Tech chips */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}
      >
        {[
          { Icon: Brain,    label: "EMNISTNet", col: "#F59E0B" },
          { Icon: Cpu,      label: "PyTorch",   col: "#2DD4BF" },
          { Icon: Sparkles, label: "47 Classes",col: "#C084FC" },
        ].map(({ Icon, label, col }, i) => (
          <motion.span key={label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 + i * 0.07 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "4px 11px", borderRadius: "99px",
              background: `${col}14`, border: `1px solid ${col}28`,
              fontSize: "0.67rem", fontWeight: 600, color: col,
            }}
          >
            <Icon size={11} />{label}
          </motion.span>
        ))}
      </motion.div>
    </motion.header>
  );
}
 
// ── INFO BANNER ────────────────────────────────────────────────────────────────
function InfoBanner() {
  const [open, setOpen] = useState(true);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="info"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
          style={{
            marginBottom: "20px",
            background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.03))",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "var(--r-lg)",
            padding: "13px 14px", display: "flex", gap: "10px", alignItems: "flex-start",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", left: 0, top: "10%", bottom: "10%",
            width: "2px", borderRadius: "99px",
            background: "linear-gradient(180deg, var(--amber), transparent)",
          }} />
          <span style={{ fontSize: "0.78rem", color: "var(--off)", lineHeight: 1.7, flex: 1 }}>
            Draw or upload a single digit/letter. Confidence &lt;50% is flagged{" "}
            <em style={{ color: "var(--rose)" }}>Uncertain</em>.
          </span>
          <button onClick={() => { haptic(6); setOpen(false); }}
            style={{
              background: "none", border: "none", color: "var(--muted)",
              cursor: "pointer", padding: "2px", flexShrink: 0,
            }}>
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
 
// ── TABS ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "draw",   label: "Draw",   Icon: PenLine },
  { id: "upload", label: "Upload", Icon: ImageUp },
];
 
function TabBar({ tab, onTab }) {
  return (
    <div style={{
      display: "flex", gap: "4px", padding: "4px",
      background: "var(--ink-3)", border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      marginBottom: "20px",
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <motion.button key={id} whileTap={{ scale: 0.97 }}
            onClick={() => onTab(id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              padding: "11px 0", borderRadius: "var(--r-md)", border: "none",
              background: active ? "var(--ink-4)" : "transparent",
              color: active ? "var(--amber)" : "var(--muted)",
              fontSize: "0.84rem", fontWeight: active ? 600 : 400,
              fontFamily: "var(--font-body)",
              boxShadow: active ? "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
              transition: "all 0.18s ease",
              borderTop: active ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
            }}>
            <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
 
// ── SPIN ICON ──────────────────────────────────────────────────────────────────
function Spin({ size = 14 }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid rgba(245,158,11,0.2)`,
        borderTopColor: "#F59E0B",
      }}
    />
  );
}
 
// ── DRAWING CANVAS ─────────────────────────────────────────────────────────────
function DrawingCanvas({ onPredict, loading }) {
  const { canvasRef, clear, getBase64, isEmpty } = useCanvas({ brushSize: 20 });
 
  const handlePredict = useCallback(() => {
    if (isEmpty) return;
    haptic(10);
    onPredict(getBase64());
  }, [isEmpty, getBase64, onPredict]);
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Canvas */}
      <div style={{ position: "relative", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={420} height={420}
          className={isEmpty ? "canvas-breathe" : ""}
          style={{
            width: "100%", height: "auto", display: "block",
            background: "#080809", borderRadius: "var(--r-lg)",
            cursor: "crosshair", touchAction: "none",
            border: "1px solid var(--border-hi)",
          }}
        />
        {/* Empty placeholder */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
              }}
            >
              {/* Pulsing rings */}
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0, 0.1] }}
                  transition={{ duration: 3, delay: i * 0.9, repeat: Infinity }}
                  style={{
                    position: "absolute",
                    width: 70 + i * 40, height: 70 + i * 40, borderRadius: "50%",
                    border: "1px solid rgba(245,158,11,0.35)",
                  }}
                />
              ))}
              <div style={{ position: "relative", textAlign: "center" }}>
                <p style={{
                  fontFamily: "var(--font-head)", fontSize: "3.5rem",
                  color: "rgba(245,158,11,0.12)", letterSpacing: "0.2em", lineHeight: 1,
                }}>012</p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "rgba(245,158,11,0.3)", marginTop: "6px" }}>
                  draw here
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
 
      {/* Controls */}
      <div style={{ display: "flex", gap: "10px" }}>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={handlePredict}
          disabled={loading || isEmpty}
          style={{
            flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "13px", borderRadius: "var(--r-md)", border: "none",
            background: loading || isEmpty
              ? "rgba(245,158,11,0.12)"
              : "linear-gradient(135deg, #F59E0B, #D97706)",
            color: loading || isEmpty ? "rgba(245,158,11,0.4)" : "#000",
            fontWeight: 700, fontSize: "0.88rem",
            boxShadow: loading || isEmpty ? "none" : "0 4px 24px rgba(245,158,11,0.3)",
            cursor: loading || isEmpty ? "not-allowed" : "pointer",
            transition: "all 0.18s ease",
          }}>
          {loading ? <><Spin /> Predicting…</> : <><Zap size={14} /> Predict</>}
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => { haptic(8); clear(); }}
          disabled={loading || isEmpty}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
            padding: "13px", borderRadius: "var(--r-md)",
            background: "var(--ink-4)", border: "1px solid var(--border-hi)",
            color: "var(--muted)", fontWeight: 500, fontSize: "0.84rem",
            cursor: loading || isEmpty ? "not-allowed" : "pointer",
            opacity: loading || isEmpty ? 0.4 : 1,
            transition: "all 0.18s ease",
          }}>
          <Eraser size={14} /> Clear
        </motion.button>
      </div>
    </div>
  );
}
 
// ── IMAGE UPLOAD ───────────────────────────────────────────────────────────────
function ImageUpload({ onPredict, loading }) {
  const [files,   setFiles]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [cur,     setCur]     = useState(0);
  const [drag,    setDrag]    = useState(false);
  const inputRef = useRef(null);
 
  function onDrop(accepted) {
    const sliced = accepted.slice(0, 5);
    setFiles(sliced);
    setPreviews(sliced.map(f => ({ name: f.name, url: URL.createObjectURL(f) })));
    setCur(0);
  }
  function handleDragOver(e) { e.preventDefault(); setDrag(true); }
  function handleDragLeave() { setDrag(false); }
  function handleDrop(e) {
    e.preventDefault(); setDrag(false);
    onDrop([...e.dataTransfer.files].filter(f => f.type.startsWith("image/")));
  }
  function handleInput(e) { if (e.target.files.length) onDrop([...e.target.files]); }
  function remove(i) {
    setFiles(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  }
  async function handlePredict() {
    for (let i = 0; i < files.length; i++) { setCur(i); await onPredict(files[i]); }
  }
 
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Drop zone */}
      <motion.div
        animate={drag ? { scale: 1.01 } : { scale: 1 }}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `1.5px dashed ${drag ? "#F59E0B" : "rgba(255,255,255,0.14)"}`,
          borderRadius: "var(--r-lg)",
          background: drag ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
          padding: "48px 24px", textAlign: "center", cursor: "pointer",
          transition: "all 0.2s", minHeight: "210px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px",
        }}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple
          style={{ display: "none" }} onChange={handleInput} />
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: drag ? "rgba(245,158,11,0.12)" : "var(--ink-4)",
          border: `1px solid ${drag ? "rgba(245,158,11,0.4)" : "var(--border-hi)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s",
        }}>
          {drag ? <ImageIcon size={22} color="#F59E0B" /> : <Upload size={22} color="var(--muted)" />}
        </div>
        <div>
          <p style={{ color: drag ? "#F59E0B" : "var(--off)", fontSize: "0.9rem", fontWeight: 600 }}>
            {drag ? "Release to drop" : "Drag & drop images"}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.74rem", marginTop: "4px" }}>
            PNG · JPG · BMP · WEBP — up to 5 files
          </p>
        </div>
        <span style={{
          padding: "4px 12px", borderRadius: "99px",
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
          color: "#F59E0B", fontSize: "0.68rem", fontWeight: 600,
        }}>or tap to browse</span>
      </motion.div>
 
      {/* Previews */}
      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div key="prev"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "10px",
            }}
          >
            {previews.map((p, i) => (
              <motion.div key={p.name + i}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                style={{ position: "relative" }}
              >
                <img src={p.url} alt={p.name} style={{
                  width: "100%", aspectRatio: "1/1", objectFit: "cover",
                  borderRadius: "var(--r-md)",
                  border: `1.5px solid ${loading && cur === i ? "#F59E0B" : "var(--border-hi)"}`,
                  transition: "border 0.2s", filter: "grayscale(0.1)",
                }} />
                {!loading && (
                  <button onClick={() => remove(i)} style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    border: "none", background: "#FB7185", color: "#fff",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <X size={10} />
                  </button>
                )}
                {loading && cur === i && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "var(--r-md)",
                    background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Spin size={18} />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Predict */}
      <motion.button whileTap={{ scale: 0.97 }}
        onClick={handlePredict}
        disabled={loading || files.length === 0}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          padding: "13px", borderRadius: "var(--r-md)", border: "none",
          background: loading || files.length === 0
            ? "rgba(245,158,11,0.1)"
            : "linear-gradient(135deg, #F59E0B, #D97706)",
          color: loading || files.length === 0 ? "rgba(245,158,11,0.4)" : "#000",
          fontWeight: 700, fontSize: "0.88rem",
          boxShadow: loading || files.length === 0 ? "none" : "0 4px 24px rgba(245,158,11,0.3)",
          cursor: loading || files.length === 0 ? "not-allowed" : "pointer",
          transition: "all 0.18s ease",
        }}>
        {loading
          ? <><Spin /> Predicting {cur + 1}/{files.length}…</>
          : <><Zap size={14} /> Predict{files.length > 0 ? ` (${files.length})` : ""}</>
        }
      </motion.button>
    </div>
  );
}
 
// ── RESULT RING ────────────────────────────────────────────────────────────────
function confColor(conf, uncertain) {
  if (uncertain) return "#FB7185";
  if (conf >= 80) return "#34D399";
  if (conf >= 60) return "#2DD4BF";
  if (conf >= 40) return "#F59E0B";
  return "#FB923C";
}
 
function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "20px", padding: "52px 24px",
      textAlign: "center",
    }}>
      <div style={{ position: "relative", width: 88, height: 88 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ scale: [1, 1.35, 1], opacity: [0.12, 0, 0.12] }}
            transition={{ duration: 3, delay: i * 0.9, repeat: Infinity }}
            style={{
              position: "absolute", inset: `${-i * 13}px`,
              borderRadius: "50%", border: "1px solid rgba(245,158,11,0.4)",
            }}
          />
        ))}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "var(--ink-3)", border: "1px solid var(--border-hi)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-head)", fontSize: "2.5rem", color: "rgba(245,158,11,0.25)",
        }}>?</div>
      </div>
      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--muted)" }}>
          Awaiting prediction
        </p>
        <p style={{ fontSize: "0.72rem", color: "var(--dim)", marginTop: "4px" }}>
          Draw or upload to begin
        </p>
      </div>
    </div>
  );
}
 
function LoadingState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "20px", padding: "52px 24px",
    }}>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        {[
          { sz: 72, col: "#F59E0B", dur: 1.0 },
          { sz: 50, col: "#2DD4BF", dur: 0.75 },
          { sz: 28, col: "#34D399", dur: 0.55 },
        ].map((r, i) => (
          <motion.div key={i}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ repeat: Infinity, duration: r.dur, ease: "linear" }}
            style={{
              position: "absolute",
              top: (72 - r.sz) / 2, left: (72 - r.sz) / 2,
              width: r.sz, height: r.sz, borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: r.col,
              boxShadow: `0 0 8px ${r.col}44`,
            }}
          />
        ))}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "var(--muted)" }}>
        Running inference…
      </p>
    </div>
  );
}
 
function MiniBar({ label, prob, highlight, delay = 0 }) {
  const col = barColor(prob);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.28 }}
      style={{ display: "flex", alignItems: "center", gap: "10px" }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: "6px", flexShrink: 0,
        background: highlight ? "rgba(245,158,11,0.12)" : "var(--ink-3)",
        border: `1px solid ${highlight ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "var(--font-head)", fontSize: "1.1rem",
          color: highlight ? "#F59E0B" : "var(--muted)", lineHeight: 1,
        }}>
          {label}
        </span>
      </div>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: "99px", overflow: "hidden", height: highlight ? 6 : 4 }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${prob}%` }}
          transition={{ duration: 0.85, delay, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            height: "100%", borderRadius: "99px", background: col,
            boxShadow: highlight ? `0 0 8px ${col}88` : "none",
          }}
        />
      </div>
      <span style={{
        width: 44, textAlign: "right", flexShrink: 0,
        fontFamily: "var(--font-mono)", fontSize: highlight ? "0.78rem" : "0.7rem",
        color: highlight ? "var(--white)" : "var(--muted)", fontWeight: highlight ? 500 : 400,
      }}>
        {prob.toFixed(1)}%
      </span>
    </motion.div>
  );
}
 
function ResultContent({ result }) {
  const conf   = result.confidence;
  const uncert = result.uncertain;
  const col    = confColor(conf, uncert);
 
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
    >
      {/* Primary result */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        {/* Ring + label */}
        <motion.div
          className="result-flash"
          style={{
            width: 130, height: 130, borderRadius: "50%",
            border: `2px solid ${col}`,
            background: `${col}0E`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${col}22`,
          }}
        >
          {uncert ? (
            <AlertTriangle size={40} color={col} />
          ) : (
            <span style={{
              fontFamily: "var(--font-head)",
              fontSize: result.label?.length > 1 ? "3.2rem" : "4.8rem",
              color: col, lineHeight: 1,
            }}>
              {result.label}
            </span>
          )}
        </motion.div>
 
        {/* Metadata row */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{
            padding: "4px 12px", borderRadius: "99px",
            background: uncert ? `${col}14` : `${col}14`,
            border: `1px solid ${col}30`,
            fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: col, fontWeight: 500,
          }}>
            {uncert ? "Uncertain" : `"${result.label}"`}
          </span>
          <span style={{
            padding: "4px 12px", borderRadius: "99px",
            background: "var(--ink-3)", border: "1px solid var(--border-hi)",
            fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)",
          }}>
            {conf.toFixed(1)}% conf.
          </span>
          {result.latency_ms && (
            <span style={{
              padding: "4px 12px", borderRadius: "99px",
              background: "var(--ink-3)", border: "1px solid var(--border-hi)",
              fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--dim)",
            }}>
              {result.latency_ms}ms
            </span>
          )}
        </div>
 
        {/* Confidence bar */}
        <div style={{ width: "100%", padding: "0 8px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "0.64rem", color: "var(--dim)", letterSpacing: "0.14em",
            fontWeight: 600, marginBottom: "6px",
          }}>
            <span>CONFIDENCE</span>
            <span style={{ color: col, fontFamily: "var(--font-mono)" }}>{Math.round(conf)}%</span>
          </div>
          <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${conf}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{
                height: "100%", borderRadius: "99px",
                background: `linear-gradient(90deg, ${col}88, ${col})`,
                boxShadow: `0 0 10px ${col}66`,
              }}
            />
          </div>
        </div>
      </div>
 
      {/* Top-5 breakdown */}
      {result.topK?.length > 0 && (
        <div>
          <p style={{
            color: "var(--dim)", fontSize: "0.62rem",
            letterSpacing: "0.16em", fontWeight: 700, marginBottom: "10px",
          }}>
            TOP-5 PREDICTIONS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
            {result.topK.map((item, i) => (
              <MiniBar key={item.label + i}
                label={item.label} prob={item.prob * 100}
                highlight={i === 0} delay={i * 0.06}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
 
function ResultPanel({ result, loading, error }) {
  return (
    <div className="card" style={{ padding: "24px" }}>
      {/* Corner accents */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: 28, height: 28,
        borderTop: "1.5px solid rgba(245,158,11,0.35)",
        borderLeft: "1.5px solid rgba(245,158,11,0.35)",
        borderRadius: "var(--r-xl) 0 0 0",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: 0, right: 0, width: 28, height: 28,
        borderBottom: "1.5px solid rgba(245,158,11,0.2)",
        borderRight: "1.5px solid rgba(245,158,11,0.2)",
        borderRadius: "0 0 var(--r-xl) 0",
        pointerEvents: "none",
      }} />
 
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
        <div style={{ width: "2.5px", height: "13px", borderRadius: "2px", background: "linear-gradient(180deg, #F59E0B, #2DD4BF)" }} />
        <p style={{ color: "var(--dim)", fontSize: "0.62rem", letterSpacing: "0.18em", fontWeight: 700 }}>PREDICTION</p>
      </div>
 
      <AnimatePresence mode="wait">
        {loading
          ? <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LoadingState /></motion.div>
          : error
          ? (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "36px 24px", textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <AlertTriangle size={24} color="#FB7185" />
                </div>
                <p style={{ color: "#FB7185", fontSize: "0.84rem" }}>{error}</p>
                <p style={{ color: "var(--dim)", fontSize: "0.7rem" }}>Check backend & CORS configuration.</p>
              </div>
            </motion.div>
          )
          : result
          ? <motion.div key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ResultContent result={result} /></motion.div>
          : <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><EmptyState /></motion.div>
        }
      </AnimatePresence>
    </div>
  );
}
 
// ── HISTORY ────────────────────────────────────────────────────────────────────
function HistoryItem({ entry, index }) {
  const col = confColor(entry.confidence, entry.uncertain);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 16, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 30, delay: index * 0.02 }}
      style={{
        display: "flex", alignItems: "center", gap: "11px",
        padding: "10px 12px", borderRadius: "var(--r-md)",
        background: "var(--ink-3)", border: "1px solid var(--border)",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: "7px", flexShrink: 0,
        background: `${col}10`, border: `1px solid ${col}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {entry.uncertain
          ? <AlertTriangle size={14} color={col} />
          : <span style={{ fontFamily: "var(--font-head)", fontSize: "1.6rem", color: col, lineHeight: 1 }}>
              {entry.label}
            </span>
        }
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "2px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--white)" }}>
            {entry.uncertain ? "Uncertain" : `"${entry.label}"`}
          </span>
          <span style={{
            padding: "1px 7px", borderRadius: "20px",
            background: `${col}12`, border: `1px solid ${col}25`,
            fontFamily: "var(--font-mono)", fontSize: "0.64rem", color: col,
          }}>
            {entry.confidence.toFixed(0)}%
          </span>
        </div>
        <p style={{ color: "var(--dim)", fontSize: "0.66rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.source === "draw" ? "✏ drawn" : entry.source}
          {entry.latency_ms ? ` · ${entry.latency_ms}ms` : ""}
        </p>
      </div>
    </motion.div>
  );
}
 
function PredictionHistory({ history, onClear }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={12} color="var(--muted)" />
          <span style={{ color: "var(--dim)", fontSize: "0.62rem", letterSpacing: "0.18em", fontWeight: 700 }}>HISTORY</span>
          <AnimatePresence>
            {history.length > 0 && (
              <motion.span key={history.length}
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{
                  padding: "1px 7px", borderRadius: "99px",
                  background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)",
                  fontSize: "0.64rem", fontWeight: 700, color: "#F59E0B",
                }}
              >
                {history.length}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {history.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              onClick={onClear}
              style={{
                background: "none", border: "1px solid var(--border)",
                borderRadius: "99px", padding: "4px 11px",
                display: "flex", alignItems: "center", gap: "5px",
                color: "var(--muted)", fontSize: "0.68rem", cursor: "pointer",
              }}
            >
              <Trash2 size={10} /> Clear
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <div className="scroll-m" style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "340px", overflowY: "auto" }}>
        <AnimatePresence mode="popLayout">
          {history.length === 0
            ? <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ color: "var(--dim)", fontSize: "0.78rem", padding: "16px 0", textAlign: "center" }}>
                No predictions yet
              </motion.p>
            : history.map((e, i) => <HistoryItem key={e.id} entry={e} index={i} />)
          }
        </AnimatePresence>
      </div>
    </div>
  );
}
 
// ── SCROLL ARROW ───────────────────────────────────────────────────────────────
function ScrollArrow({ show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button key="arrow"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          onClick={onClick}
          style={{
            position: "fixed",
            bottom: "calc(28px + var(--safe-bot))",
            left: "50%", transform: "translateX(-50%)", zIndex: 200,
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            border: "none", borderRadius: "99px",
            padding: "10px 22px", color: "#000",
            fontSize: "0.8rem", fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: "7px",
            boxShadow: "0 6px 28px rgba(245,158,11,0.4)",
          }}>
          View Result
          <motion.span animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
            <ChevronDown size={13} />
          </motion.span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
 
// ── FOOTER ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
      <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", marginBottom: "10px" }}>
        {[
          ["Neural Ink", "#F59E0B"],
          ["EMNIST Balanced", "#2DD4BF"],
          ["PyTorch", "#C084FC"],
          ["47 classes", "#34D399"],
          ["EMNISTNet CNN", "#FB7185"],
        ].map(([l, c]) => (
          <span key={l} style={{
            padding: "3px 10px", borderRadius: "99px",
            border: `1px solid ${c}28`, background: `${c}0A`,
            fontSize: "0.6rem", fontWeight: 600, color: c, letterSpacing: "0.07em",
          }}>{l}</span>
        ))}
      </div>
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--dim)", fontSize: "0.56rem", letterSpacing: "0.1em", opacity: 0.5 }}>
        Neural Ink · v7 · EMNIST Balanced
      </p>
    </div>
  );
}
 
// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("draw");
  const [showArrow, setShowArrow] = useState(false);
  const resultRef = useRef(null);
 
  const { result, loading, error, history, runCanvas, runUpload, reset } = usePrediction();
  const [localHist, setLocalHist] = useState([]);
  useEffect(() => { setLocalHist(history); }, [history]);
 
  // Auto-scroll to result
  useEffect(() => {
    if (result && !loading) {
      const panel = resultRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      setTimeout(() => panel.scrollIntoView({ behavior: "smooth", block: inView ? "nearest" : "start" }), 260);
      setShowArrow(true);
      setTimeout(() => setShowArrow(false), 3000);
    }
  }, [result, loading]);
 
  // Haptic on result
  useEffect(() => {
    if (result && !loading && !error) {
      result.uncertain ? haptic(40) : navigator?.vibrate?.([12, 60, 12]);
    }
  }, [result, loading, error]);
 
  const scrollToResult  = useCallback(() => { haptic(8); setShowArrow(false); resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const handleTab       = useCallback((id) => { haptic(8); setTab(id); reset(); }, [reset]);
  const handleClearHist = useCallback(() => { haptic(16); setLocalHist([]); }, []);
 
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="noise" />
      <GridBackground />
      <TopLoader loading={loading} />
 
      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="shell">
          <Header />
          <InfoBanner />
 
          <div className="desktop-grid">
            {/* ── LEFT COL: input ─────────────────────────────── */}
            <div>
              <TabBar tab={tab} onTab={handleTab} />
 
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="card-hi"
                style={{ padding: "22px", marginBottom: "20px" }}
              >
                {/* Corner accents */}
                <div style={{
                  position: "absolute", top: 0, left: 0, width: 26, height: 26,
                  borderTop: "1.5px solid rgba(245,158,11,0.4)",
                  borderLeft: "1.5px solid rgba(245,158,11,0.4)",
                  borderRadius: "var(--r-xl) 0 0 0", pointerEvents: "none",
                }} />
                <div style={{
                  position: "absolute", bottom: 0, right: 0, width: 26, height: 26,
                  borderBottom: "1.5px solid rgba(45,212,191,0.3)",
                  borderRight: "1.5px solid rgba(45,212,191,0.3)",
                  borderRadius: "0 0 var(--r-xl) 0", pointerEvents: "none",
                }} />
 
                <AnimatePresence mode="wait">
                  {tab === "draw" ? (
                    <motion.div key="draw"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}
                    >
                      <DrawingCanvas onPredict={runCanvas} loading={loading} />
                    </motion.div>
                  ) : (
                    <motion.div key="upload"
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
                    >
                      <ImageUpload onPredict={runUpload} loading={loading} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
 
              {/* History (left on desktop) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="card"
                style={{ padding: "20px" }}
              >
                <PredictionHistory history={localHist} onClear={handleClearHist} />
              </motion.div>
            </div>
 
            {/* ── RIGHT COL: result ────────────────────────────── */}
            <div className="desktop-sticky">
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                style={{ marginBottom: "20px" }}
              >
                <ResultPanel result={result} loading={loading} error={error} />
              </motion.div>
 
              <Footer />
            </div>
          </div>
        </div>
      </div>
 
      <ScrollArrow show={showArrow} onClick={scrollToResult} />
    </>
  );
}
 
