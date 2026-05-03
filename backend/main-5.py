# =============================================================================
# main.py — FastAPI backend for EMNIST Recognition  ·  v2
# Deploy on Render; Vercel frontend talks to /api/* endpoints.
# =============================================================================
"""
What's new vs v1
─────────────────
1.  CORS fix       — FastAPI's CORSMiddleware does NOT support wildcard
                     subdomains (*.vercel.app).  We now handle origin
                     validation manually with a regex allow-list.
2.  Rate limiting  — simple in-memory sliding-window limiter per IP.
                     Configurable via env vars RATE_LIMIT_RPM / RATE_LIMIT_BURST.
3.  Batch endpoint — POST /api/predict/batch accepts up to 8 base64 images
                     and returns predictions in one round-trip.
4.  Metrics        — in-memory counters: total requests, latency histogram,
                     class distribution of predictions.  GET /api/metrics.
5.  Model hot-swap — POST /api/admin/reload reloads weights from disk without
                     restarting the server (protected by ADMIN_SECRET env var).
6.  Request ID     — every response carries X-Request-ID header for tracing.
7.  Better schemas — PredictionResponse now includes entropy + mc_std from
                     the upgraded model.py inference pipeline.
8.  Structured logs — JSON-compatible log lines with request_id, latency_ms.
9.  /api/predict/canvas and /api/predict/upload return identical schemas.
10. Input validation — hard reject empty images, too-small base64, wrong MIME.
"""

from __future__ import annotations

import os, re, time, uuid, logging, collections, statistics
from contextlib    import asynccontextmanager
from pathlib       import Path
from typing        import Optional

from fastapi               import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.responses     import JSONResponse
from fastapi.middleware    import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic              import BaseModel, Field, validator

from model import (
    EMNISTNet, CLASS_LABELS, NUM_CLASSES,
    load_model, reload_model,
    predict_from_base64, predict_from_bytes, predict_batch,
)
from PIL import Image
import io, base64

# ─────────────────────────────────────────────────────────────────────────────
#  Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt= "%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("emnist_api")

# ─────────────────────────────────────────────────────────────────────────────
#  Paths & Env
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR      = Path(__file__).parent
WEIGHTS_PATH  = BASE_DIR / "weights" / "best_emnist_model.pth"
ADMIN_SECRET  = os.getenv("ADMIN_SECRET", "change-me-in-production")
FRONTEND_URL  = os.getenv("FRONTEND_URL", "")  # e.g. https://emnistrecogniser.vercel.app

# Rate limiting env vars
RATE_LIMIT_RPM   = int(os.getenv("RATE_LIMIT_RPM",   "60"))   # requests per minute
RATE_LIMIT_BURST = int(os.getenv("RATE_LIMIT_BURST", "15"))    # max burst per minute

# ─────────────────────────────────────────────────────────────────────────────
#  Allowed Origins (CORS)
# ─────────────────────────────────────────────────────────────────────────────
_STATIC_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
if FRONTEND_URL:
    _STATIC_ORIGINS.append(FRONTEND_URL.rstrip("/"))

# Regex patterns for dynamic origins (e.g. preview deployments on Vercel)
_ORIGIN_PATTERNS: list[re.Pattern] = [
    re.compile(r"^https://[\w-]+-[\w-]+\.vercel\.app$"),   # preview branches
    re.compile(r"^https://[\w-]+\.vercel\.app$"),           # production
    re.compile(r"^https://emnistrecogniser[\w.-]*\.vercel\.app$"),
]


def _is_origin_allowed(origin: str) -> bool:
    if origin in _STATIC_ORIGINS:
        return True
    return any(pat.match(origin) for pat in _ORIGIN_PATTERNS)


# ─────────────────────────────────────────────────────────────────────────────
#  App State
# ─────────────────────────────────────────────────────────────────────────────
app_state: dict = {
    "model":     None,
    "loaded_at": None,
    "error":     None,
}

# ─────────────────────────────────────────────────────────────────────────────
#  Metrics Store
# ─────────────────────────────────────────────────────────────────────────────
class MetricsStore:
    """Thread-safe-ish in-memory metrics (single process assumed on Render)."""

    def __init__(self):
        self.reset()

    def reset(self):
        self.total_requests   = 0
        self.predict_requests = 0
        self.error_count      = 0
        self.latencies_ms: list[float]              = []   # rolling last 500
        self.class_counts: dict[str, int]           = collections.defaultdict(int)
        self.uncertain_count  = 0
        self.started_at       = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    def record_prediction(self, label: str, latency_ms: float, uncertain: bool):
        self.predict_requests += 1
        self.class_counts[label] += 1
        if uncertain:
            self.uncertain_count += 1
        # Keep rolling window of 500 latencies
        self.latencies_ms.append(latency_ms)
        if len(self.latencies_ms) > 500:
            self.latencies_ms = self.latencies_ms[-500:]

    def summary(self) -> dict:
        lats = self.latencies_ms
        return {
            "started_at":        self.started_at,
            "total_requests":    self.total_requests,
            "predict_requests":  self.predict_requests,
            "error_count":       self.error_count,
            "uncertain_count":   self.uncertain_count,
            "latency_ms": {
                "count":  len(lats),
                "mean":   round(statistics.mean(lats), 2)   if lats else None,
                "median": round(statistics.median(lats), 2) if lats else None,
                "p95":    round(sorted(lats)[int(len(lats)*0.95)], 2) if len(lats) >= 20 else None,
                "max":    round(max(lats), 2) if lats else None,
            },
            "top_predictions": sorted(
                self.class_counts.items(), key=lambda kv: -kv[1]
            )[:10],
        }


metrics = MetricsStore()

# ─────────────────────────────────────────────────────────────────────────────
#  Rate Limiter  (sliding-window, per IP)
# ─────────────────────────────────────────────────────────────────────────────
class SlidingWindowLimiter:
    """
    Simple in-memory sliding-window rate limiter.
    Tracks request timestamps per IP in a deque.
    """
    def __init__(self, rpm: int, burst: int):
        self.rpm     = rpm
        self.burst   = burst
        self.window  = 60.0   # seconds
        self._store: dict[str, collections.deque] = {}

    def is_allowed(self, ip: str) -> bool:
        now = time.monotonic()
        dq  = self._store.setdefault(ip, collections.deque())

        # Evict timestamps outside the window
        while dq and dq[0] < now - self.window:
            dq.popleft()

        if len(dq) >= self.rpm:
            return False

        # Burst check: no more than `burst` in any 10-second sub-window
        ten_ago = now - 10.0
        recent  = sum(1 for ts in dq if ts > ten_ago)
        if recent >= self.burst:
            return False

        dq.append(now)
        return True


limiter = SlidingWindowLimiter(RATE_LIMIT_RPM, RATE_LIMIT_BURST)


def _get_client_ip(request: Request) -> str:
    """Extract real IP from forwarded headers (Render uses proxies)."""
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─────────────────────────────────────────────────────────────────────────────
#  Lifespan
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if WEIGHTS_PATH.exists():
        try:
            app_state["model"]     = load_model(WEIGHTS_PATH)
            app_state["loaded_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            log.info(f"Model loaded | weights={WEIGHTS_PATH}")
        except Exception as exc:
            app_state["error"] = str(exc)
            log.error(f"Model load failed: {exc}")
    else:
        msg = (
            f"Weights not found at {WEIGHTS_PATH}. "
            "Run train.py first and place best_emnist_model.pth in backend/weights/."
        )
        app_state["error"] = msg
        log.warning(msg)
    yield
    log.info("Server shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
#  FastAPI App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "EMNIST Recognition API  v2",
    description = (
        "Handwritten digit (0–9) and letter (A–Z) recognition powered by "
        "EMNISTNet v2 — ResNet + Squeeze-Excitation + TTA + MC-Dropout."
    ),
    version     = "2.0.0",
    lifespan    = lifespan,
    docs_url    = "/api/docs",
    redoc_url   = "/api/redoc",
)


# ─────────────────────────────────────────────────────────────────────────────
#  Custom CORS Middleware  (supports regex origin patterns)
# ─────────────────────────────────────────────────────────────────────────────
class SmartCORSMiddleware(BaseHTTPMiddleware):
    """
    Replaces FastAPI's built-in CORSMiddleware.
    Allows static origin list + regex patterns (*.vercel.app etc.).
    """
    _CORS_HEADERS = {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
        "Access-Control-Max-Age":       "86400",
        "Vary":                         "Origin",
    }

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed = _is_origin_allowed(origin)

        # Pre-flight
        if request.method == "OPTIONS":
            headers = dict(self._CORS_HEADERS)
            if allowed and origin:
                headers["Access-Control-Allow-Origin"]      = origin
                headers["Access-Control-Allow-Credentials"] = "true"
            return JSONResponse(status_code=204, content=None, headers=headers)

        response = await call_next(request)

        if allowed and origin:
            response.headers["Access-Control-Allow-Origin"]      = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            for k, v in self._CORS_HEADERS.items():
                response.headers[k] = v

        return response


# ─────────────────────────────────────────────────────────────────────────────
#  Request Timing + ID Middleware
# ─────────────────────────────────────────────────────────────────────────────
class RequestMetaMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        t0 = time.perf_counter()

        metrics.total_requests += 1
        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        response.headers["X-Request-ID"]       = request_id
        response.headers["X-Process-Time-Ms"]  = f"{elapsed_ms:.1f}"
        return response


app.add_middleware(SmartCORSMiddleware)
app.add_middleware(RequestMetaMiddleware)


# ─────────────────────────────────────────────────────────────────────────────
#  Rate-Limiting Dependency
# ─────────────────────────────────────────────────────────────────────────────
def require_rate_limit(request: Request):
    ip = _get_client_ip(request)
    if not limiter.is_allowed(ip):
        raise HTTPException(
            status_code = 429,
            detail      = f"Rate limit exceeded. Max {RATE_LIMIT_RPM} req/min.",
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Model Dependency
# ─────────────────────────────────────────────────────────────────────────────
def require_model() -> EMNISTNet:
    if app_state["model"] is None:
        raise HTTPException(
            status_code = 503,
            detail      = app_state.get("error") or "Model not loaded yet.",
        )
    return app_state["model"]


# ─────────────────────────────────────────────────────────────────────────────
#  Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────────────
class CanvasRequest(BaseModel):
    image: str = Field(
        ...,
        min_length  = 100,   # bare minimum for a non-empty image
        description = "Base64-encoded PNG/JPG (data-URL or raw b64 string)",
    )

    @validator("image")
    def validate_base64(cls, v: str) -> str:
        raw = v.split(",", 1)[1] if "," in v else v
        # Rough size check: at least 20 bytes decoded
        if len(raw) < 28:
            raise ValueError("Image data too short — appears to be empty.")
        try:
            base64.b64decode(raw + "==")
        except Exception:
            raise ValueError("Invalid base64 encoding.")
        return v


class BatchCanvasRequest(BaseModel):
    images: list[str] = Field(
        ...,
        min_items   = 1,
        max_items   = 8,
        description = "List of base64-encoded images (max 8 per request)",
    )


class TopKEntry(BaseModel):
    label: str
    prob:  float


class ProbEntry(BaseModel):
    label: str
    prob:  float


class PredictionResponse(BaseModel):
    label:      str
    confidence: float                     # 0.0 – 100.0 percentage
    uncertain:  bool
    top5:       list[TopKEntry]
    all_probs:  list[ProbEntry]
    entropy:    Optional[float] = None    # Shannon entropy (bits)
    mc_std:     Optional[float] = None    # MC-Dropout standard deviation
    latency_ms: Optional[float] = None


class BatchPredictionResponse(BaseModel):
    results:    list[PredictionResponse]
    count:      int
    latency_ms: float


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────
_ALLOWED_MIME: set[str] = {
    "image/png", "image/jpeg", "image/jpg",
    "image/bmp", "image/webp", "image/gif",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _log_prediction(request_id: str, source: str, result: dict, latency_ms: float):
    log.info(
        f"[{request_id}] {source} → '{result['label']}' "
        f"conf={result['confidence']:.1f}%  "
        f"uncertain={result['uncertain']}  "
        f"latency={latency_ms:.1f}ms"
    )
    metrics.record_prediction(result["label"], latency_ms, result["uncertain"])


# ─────────────────────────────────────────────────────────────────────────────
#  Routes — Health & Info
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "EMNIST Recognition API v2",
        "docs":    "/api/docs",
        "health":  "/api/health",
    }


@app.get("/api/health")
def health():
    model_ok = app_state["model"] is not None
    return {
        "status":    "ok" if model_ok else "degraded",
        "model":     "loaded" if model_ok else "missing",
        "loaded_at": app_state["loaded_at"],
        "error":     app_state["error"],
        "version":   "2.0.0",
    }


@app.get("/api/classes")
def get_classes():
    return {
        "num_classes": NUM_CLASSES,
        "labels":      CLASS_LABELS,
    }


@app.get("/api/model/info")
def model_info(model: EMNISTNet = Depends(require_model)):
    total   = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    T_val   = model.log_temperature.exp().item()
    return {
        "architecture":    "EMNISTNet v2 (ResNet + SE + TTA + MC-Dropout)",
        "total_params":    total,
        "trainable_params":trainable,
        "num_classes":     NUM_CLASSES,
        "input_shape":     [1, 28, 28],
        "temperature":     round(T_val, 4),
        "weights_path":    str(WEIGHTS_PATH),
        "loaded_at":       app_state["loaded_at"],
        "tta_enabled":     True,
        "mc_passes":       16,
    }


@app.get("/api/metrics")
def get_metrics():
    return metrics.summary()


# ─────────────────────────────────────────────────────────────────────────────
#  Routes — Prediction
# ─────────────────────────────────────────────────────────────────────────────
@app.post(
    "/api/predict/canvas",
    response_model = PredictionResponse,
    dependencies   = [Depends(require_rate_limit)],
)
async def predict_canvas(
    body:    CanvasRequest,
    request: Request,
    model:   EMNISTNet = Depends(require_model),
):
    """Predict from a base64-encoded canvas drawing."""
    rid = getattr(request.state, "request_id", "??")
    try:
        t0     = time.perf_counter()
        result = predict_from_base64(model, body.image)
        latency= round((time.perf_counter() - t0) * 1000, 2)
        result["latency_ms"] = latency
        _log_prediction(rid, "canvas", result, latency)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        metrics.error_count += 1
        log.error(f"[{rid}] Canvas predict error: {exc}", exc_info=True)
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")


@app.post(
    "/api/predict/upload",
    response_model = PredictionResponse,
    dependencies   = [Depends(require_rate_limit)],
)
async def predict_upload(
    request: Request,
    file:    UploadFile = File(...),
    model:   EMNISTNet  = Depends(require_model),
):
    """Predict from an uploaded image file (PNG / JPG / BMP / WEBP)."""
    rid = getattr(request.state, "request_id", "??")

    # Content-type validation (allow None for when browsers omit it)
    if file.content_type and file.content_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code = 415,
            detail      = f"Unsupported file type: '{file.content_type}'. "
                          f"Accepted: {sorted(_ALLOWED_MIME)}",
        )

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code = 413,
            detail      = f"File too large ({len(raw)//1024} KB). Max is 10 MB.",
        )

    # Sniff file magic bytes to double-check
    _MAGIC = {
        b"\x89PNG": "image/png",
        b"\xff\xd8": "image/jpeg",
        b"GIF8": "image/gif",
        b"RIFF": "image/webp",
        b"BM":   "image/bmp",
    }
    detected = None
    for magic, mime in _MAGIC.items():
        if raw[:len(magic)] == magic:
            detected = mime; break
    if detected is None:
        raise HTTPException(
            status_code = 415,
            detail      = "File does not appear to be a valid image (magic bytes mismatch).",
        )

    try:
        t0     = time.perf_counter()
        result = predict_from_bytes(model, raw)
        latency= round((time.perf_counter() - t0) * 1000, 2)
        result["latency_ms"] = latency
        _log_prediction(rid, f"upload({file.filename})", result, latency)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        metrics.error_count += 1
        log.error(f"[{rid}] Upload predict error: {exc}", exc_info=True)
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")


@app.post(
    "/api/predict/batch",
    response_model = BatchPredictionResponse,
    dependencies   = [Depends(require_rate_limit)],
)
async def predict_batch_endpoint(
    body:    BatchCanvasRequest,
    request: Request,
    model:   EMNISTNet = Depends(require_model),
):
    """
    Batch predict from up to 8 base64 canvas images.
    Returns a list of PredictionResponse in the same order as input.
    """
    rid = getattr(request.state, "request_id", "??")

    pil_images = []
    for idx, b64 in enumerate(body.images):
        try:
            raw_b64 = b64.split(",", 1)[1] if "," in b64 else b64
            raw     = base64.b64decode(raw_b64 + "==")
            img     = Image.open(io.BytesIO(raw))
            pil_images.append(img)
        except Exception as exc:
            raise HTTPException(
                status_code = 422,
                detail      = f"Image at index {idx} is invalid: {exc}",
            )

    try:
        t0      = time.perf_counter()
        results = predict_batch(model, pil_images, canvas=True)
        latency = round((time.perf_counter() - t0) * 1000, 2)

        for r in results:
            r["latency_ms"] = round(latency / len(results), 2)
            _log_prediction(rid, "batch", r, r["latency_ms"])

        return {
            "results":    results,
            "count":      len(results),
            "latency_ms": latency,
        }
    except HTTPException:
        raise
    except Exception as exc:
        metrics.error_count += 1
        log.error(f"[{rid}] Batch predict error: {exc}", exc_info=True)
        raise HTTPException(status_code=422, detail=f"Batch prediction failed: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
#  Routes — Admin
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/admin/reload")
async def admin_reload(request: Request):
    """
    Hot-reload model weights from disk without restarting the server.
    Requires the X-Admin-Secret header to match the ADMIN_SECRET env var.
    """
    secret = request.headers.get("X-Admin-Secret", "")
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin secret.")

    if not WEIGHTS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Weights file not found at {WEIGHTS_PATH}.",
        )

    try:
        app_state["model"]     = reload_model(WEIGHTS_PATH)
        app_state["loaded_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        app_state["error"]     = None
        log.info("Model hot-reloaded successfully.")
        return {"status": "ok", "loaded_at": app_state["loaded_at"]}
    except Exception as exc:
        app_state["error"] = str(exc)
        log.error(f"Hot-reload failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reload failed: {exc}")


@app.post("/api/admin/reset-metrics")
async def admin_reset_metrics(request: Request):
    """Reset all in-memory metrics. Requires X-Admin-Secret header."""
    secret = request.headers.get("X-Admin-Secret", "")
    if secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Invalid admin secret.")
    metrics.reset()
    return {"status": "ok", "message": "Metrics reset."}


# ─────────────────────────────────────────────────────────────────────────────
#  Global Error Handler
# ─────────────────────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    rid = getattr(request.state, "request_id", "??")
    metrics.error_count += 1
    log.error(f"[{rid}] Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code = 500,
        content     = {
            "detail":     "Internal server error. Please try again.",
            "request_id": rid,
        },
    )


@app.exception_handler(429)
async def rate_limit_handler(request: Request, exc: HTTPException):
    rid = getattr(request.state, "request_id", "??")
    return JSONResponse(
        status_code = 429,
        content     = {"detail": exc.detail, "request_id": rid},
        headers     = {"Retry-After": "60"},
    )


# ─────────────────────────────────────────────────────────────────────────────
#  Dev entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host       = "0.0.0.0",
        port       = int(os.getenv("PORT", "8000")),
        reload     = True,
        log_level  = "info",
    )
