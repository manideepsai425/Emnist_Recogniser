// src/lib/api.js — typed API client for the FastAPI backend

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res  = await fetch(url, options);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const d = await res.json(); message = d.detail ?? message; } catch {}
    throw new Error(message);
  }
  return res.json();
}

/** GET /api/health */
export async function getHealth() {
  return request("/api/health");
}

/** GET /api/classes */
export async function getClasses() {
  return request("/api/classes");
}

/** GET /api/model/info */
export async function getModelInfo() {
  return request("/api/model/info");
}

/**
 * POST /api/predict/canvas
 * @param {string} base64  — data-URL or raw b64 string
 */
export async function predictCanvas(base64) {
  return request("/api/predict/canvas", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ image: base64 }),
  });
}

/**
 * POST /api/predict/upload
 * @param {File} file — image File object from input or dropzone
 */
export async function predictUpload(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/predict/upload", { method: "POST", body: form });
}
