// src/components/ImageUpload.jsx
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImageIcon, X, Zap } from "lucide-react";

const MAX_FILES = 5;
const ACCEPT    = { "image/*": [".png", ".jpg", ".jpeg", ".bmp", ".webp"] };

export default function ImageUpload({ onPredict, loading }) {
  const [files,   setFiles]   = useState([]);
  const [preview, setPreview] = useState([]);
  const [current, setCurrent] = useState(0); // index currently processing

  const onDrop = useCallback((accepted) => {
    const sliced = accepted.slice(0, MAX_FILES);
    setFiles(sliced);
    setPreview(sliced.map(f => ({
      name: f.name,
      url:  URL.createObjectURL(f),
    })));
    setCurrent(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   ACCEPT,
    maxFiles: MAX_FILES,
    multiple: true,
  });

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
        {...getRootProps()}
        style={{
          border:        `2px dashed ${isDragActive ? "var(--accent-cyan)" : "var(--border-light)"}`,
          borderRadius:  "var(--radius-lg)",
          background:    isDragActive ? "rgba(6,182,212,0.05)" : "var(--surface)",
          padding:       "48px 24px",
          textAlign:     "center",
          cursor:        "pointer",
          transition:    "all 0.2s",
          minHeight:     "200px",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          justifyContent:"center",
          gap:           "12px",
        }}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.15, rotate: 8 } : { scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300 }}
          style={{
            width:        52, height: 52,
            borderRadius: "50%",
            background:   "var(--surface-2)",
            border:       "1px solid var(--border-light)",
            display:      "flex",
            alignItems:   "center",
            justifyContent:"center",
          }}
        >
          {isDragActive
            ? <ImageIcon size={22} color="var(--accent-cyan)" />
            : <Upload    size={22} color="var(--text-muted)" />
          }
        </motion.div>

        <div>
          <p style={{ color: isDragActive ? "var(--accent-cyan)" : "var(--text)", fontSize: "0.9rem" }}>
            {isDragActive ? "Drop to add images" : "Drag & drop images here"}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "4px" }}>
            PNG, JPG, BMP, WEBP — up to {MAX_FILES} files
          </p>
        </div>

        <span className="badge badge-violet" style={{ marginTop: "4px" }}>
          or click to browse
        </span>
      </div>

      {/* Preview grid */}
      <AnimatePresence>
        {preview.length > 0 && (
          <motion.div
            key="previews"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
              gap:                 "10px",
            }}
          >
            {preview.map((p, i) => (
              <motion.div
                key={p.name + i}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                style={{ position: "relative" }}
              >
                <img
                  src={p.url}
                  alt={p.name}
                  style={{
                    width:        "100%",
                    aspectRatio:  "1/1",
                    objectFit:    "cover",
                    borderRadius: "var(--radius-md)",
                    border:       loading && current === i
                                    ? "2px solid var(--accent-cyan)"
                                    : "2px solid var(--border)",
                    filter:       "grayscale(0.2)",
                    transition:   "border 0.2s",
                  }}
                />
                {/* Remove button */}
                {!loading && (
                  <button
                    onClick={() => remove(i)}
                    style={{
                      position:     "absolute",
                      top:          -6, right: -6,
                      width:        20, height: 20,
                      borderRadius: "50%",
                      border:       "none",
                      background:   "var(--accent-rose)",
                      color:        "#fff",
                      cursor:       "pointer",
                      display:      "flex",
                      alignItems:   "center",
                      justifyContent: "center",
                      padding:      0,
                    }}
                  >
                    <X size={11} />
                  </button>
                )}
                {/* Processing spinner */}
                {loading && current === i && (
                  <div style={{
                    position:       "absolute",
                    inset:          0,
                    borderRadius:   "var(--radius-md)",
                    background:     "rgba(0,0,0,0.5)",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                  }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      style={{
                        width:  18, height: 18,
                        border: "2px solid rgba(6,182,212,0.3)",
                        borderTopColor: "var(--accent-cyan)",
                        borderRadius:   "50%",
                      }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Predict button */}
      <button
        className="btn btn-primary"
        style={{ width: "100%" }}
        onClick={handlePredict}
        disabled={loading || files.length === 0}
      >
        <Zap size={15} />
        {loading
          ? `Predicting… (${current + 1}/${files.length})`
          : `Predict ${files.length > 0 ? `(${files.length} image${files.length > 1 ? "s" : ""})` : ""}`
        }
      </button>
    </div>
  );
}
