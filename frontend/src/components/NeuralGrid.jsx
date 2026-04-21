// src/components/NeuralGrid.jsx
import { useEffect, useRef } from "react";

const VIB_COLORS = [
  [155, 93, 229],   // purple
  [0,  187, 249],   // cyan
  [0,  245, 212],   // green
  [241, 91, 181],   // pink
  [254, 228, 64],   // yellow
];

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

    const SPACING = 48;
    const dots = [];

    for (let x = SPACING / 2; x < window.innerWidth + SPACING; x += SPACING) {
      for (let y = SPACING / 2; y < window.innerHeight + SPACING; y += SPACING) {
        const colorIdx = Math.floor(Math.random() * VIB_COLORS.length);
        dots.push({
          x, y,
          phase:    Math.random() * Math.PI * 2,
          speed:    0.002 + Math.random() * 0.003,
          base:     0.04 + Math.random() * 0.08,
          colorIdx,
        });
      }
    }

    let t = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;
      for (const d of dots) {
        const alpha = d.base + Math.sin(t * d.speed + d.phase) * 0.05;
        const [r, g, b] = VIB_COLORS[d.colorIdx];
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
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
        position:      "fixed",
        inset:         0,
        zIndex:        0,
        pointerEvents: "none",
        opacity:       0.7,
      }}
    />
  );
}
