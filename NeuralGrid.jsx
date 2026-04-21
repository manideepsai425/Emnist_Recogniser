// src/components/NeuralGrid.jsx
// Subtle animated dot-grid background
import { useEffect, useRef } from "react";

export default function NeuralGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    let   raf;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const COLS    = 32;
    const SPACING = Math.ceil(window.innerWidth / COLS);
    const dots = [];

    for (let x = 0; x < window.innerWidth; x += SPACING) {
      for (let y = 0; y < window.innerHeight; y += SPACING) {
        dots.push({
          x, y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.003 + Math.random() * 0.004,
          base:  0.08 + Math.random() * 0.12,
        });
      }
    }

    let t = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;
      for (const d of dots) {
        const alpha = d.base + Math.sin(t * d.speed + d.phase) * 0.06;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 58, 237, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset:    0,
        zIndex:   0,
        pointerEvents: "none",
      }}
    />
  );
}
