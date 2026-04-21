// src/components/Header.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getHealth } from "../lib/api";

export default function Header() {
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
  const label    = status === "ok" ? "Model online" : status === "checking" ? "Connecting…" : "Model offline";
  const labelColor = status === "ok" ? "var(--vib-green)" : status === "checking" ? "var(--vib-yellow)" : "var(--vib-pink)";

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        padding:        "calc(var(--safe-top) + 28px) 0 24px",
        borderBottom:   "1px solid var(--border)",
        marginBottom:   "28px",
      }}
    >
      {/* Top row — badge + status */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   "14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <motion.span
            animate={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 2, delay: 1, repeat: Infinity, repeatDelay: 5 }}
            style={{ fontSize: "1.2rem" }}
          >
            🖊️
          </motion.span>
          <span className="badge badge-violet" style={{ fontSize: "0.7rem" }}>
            EMNIST · 47 classes
          </span>
        </div>

        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          "6px",
            padding:      "5px 12px",
            borderRadius: "var(--radius-xl)",
            background:   "var(--surface-2)",
            border:       "1px solid var(--border)",
          }}
        >
          <span className={`pulse-dot ${dotClass}`} />
          <span style={{ color: labelColor, fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
            {label}
          </span>
        </motion.div>
      </div>

      {/* Title */}
      <h1
        className="font-display"
        style={{ fontSize: "clamp(2.2rem, 8vw, 3.4rem)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        Neural{" "}
        <span className="gradient-text">Ink</span>
      </h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "8px" }}
      >
        Handwritten digit &amp; letter recognition — powered by PyTorch
      </motion.p>
    </motion.header>
  );
}
