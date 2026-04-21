// src/components/Header.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getHealth } from "../lib/api";

export default function Header() {
  const [status, setStatus] = useState("checking"); // checking | ok | degraded | error

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

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y:   0 }}
      transition={{ duration: 0.5 }}
      style={{
        padding:        "32px 0 28px",
        borderBottom:   "1px solid var(--border)",
        marginBottom:   "40px",
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "space-between",
        flexWrap:       "wrap",
        gap:            "16px",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "1.35rem" }}>🖊️</span>
          <span className="badge badge-violet">EMNIST · 47 classes</span>
        </div>
        <h1
          className="font-display"
          style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.1 }}
        >
          Neural{" "}
          <span className="gradient-text">Ink</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "8px" }}>
          Handwritten digit &amp; letter recognition — powered by PyTorch
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span className={`pulse-dot ${dotClass}`} />
        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{label}</span>
      </div>
    </motion.header>
  );
}
