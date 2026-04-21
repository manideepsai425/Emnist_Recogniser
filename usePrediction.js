// src/hooks/usePrediction.js
import { useState, useCallback } from "react";
import { predictCanvas, predictUpload } from "../lib/api";

const MAX_HISTORY = 12;

export function usePrediction() {
  const [result,    setResult]    = useState(null);   // latest prediction
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [history,   setHistory]   = useState([]);     // last N predictions

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

  const reset = useCallback(() => {
    setResult(null); setError(null);
  }, []);

  return { result, loading, error, history, runCanvas, runUpload, reset };
}
