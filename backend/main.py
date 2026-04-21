# =============================================================================
# main.py — FastAPI backend for EMNIST Recognition
# =============================================================================
import os, time, logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from model import (
    EMNISTNet, CLASS_LABELS, NUM_CLASSES,
    load_model, predict_from_base64, predict_from_bytes,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
log = logging.getLogger(__name__)

BASE_DIR     = Path(__file__).parent
WEIGHTS_PATH = BASE_DIR / "weights" / "best_emnist_model.pth"

app_state: dict = {"model": None, "loaded_at": None, "error": None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if WEIGHTS_PATH.exists():
        try:
            app_state["model"]     = load_model(WEIGHTS_PATH)
            app_state["loaded_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            log.info(f"Model loaded from {WEIGHTS_PATH}")
        except Exception as exc:
            app_state["error"] = str(exc)
            log.error(f"Failed to load model: {exc}")
    else:
        app_state["error"] = (
            f"Weights not found at {WEIGHTS_PATH}. "
            "Run train.py first and place best_emnist_model.pth in backend/weights/."
        )
        log.warning(app_state["error"])
    yield
    log.info("Shutting down.")


app = FastAPI(
    title       = "EMNIST Recognition API",
    description = "Handwritten digit (0–9) and letter (A–Z) recognition powered by PyTorch.",
    version     = "1.0.0",
    lifespan    = lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
    "https://emnistrecogniser.vercel.app",
    "https://emnistrecogniser2.vercel.app",
]
ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    t0       = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - t0) * 1000:.1f}"
    return response


def _require_model() -> EMNISTNet:
    if app_state["model"] is None:
        raise HTTPException(
            status_code = 503,
            detail      = app_state.get("error") or "Model not loaded.",
        )
    return app_state["model"]


class CanvasRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded PNG (data-URL or raw b64)")


class PredictionResponse(BaseModel):
    label:      str
    confidence: float
    uncertain:  bool
    top5:       list[dict]
    all_probs:  list[dict]
    latency_ms: float | None = None


@app.get("/api/health")
def health():
    return {
        "status":     "ok" if app_state["model"] is not None else "degraded",
        "model":      "loaded" if app_state["model"] is not None else "missing",
        "loaded_at":  app_state["loaded_at"],
        "error":      app_state["error"],
    }


@app.get("/api/classes")
def get_classes():
    return {
        "num_classes": NUM_CLASSES,
        "labels":      CLASS_LABELS,
    }


@app.get("/api/model/info")
def model_info():
    model = _require_model()
    total  = sum(p.numel() for p in model.parameters())
    return {
        "architecture":    "EMNISTNet",
        "total_params":    total,
        "num_classes":     NUM_CLASSES,
        "input_shape":     [1, 28, 28],
        "weights_path":    str(WEIGHTS_PATH),
        "loaded_at":       app_state["loaded_at"],
    }


@app.post("/api/predict/canvas", response_model=PredictionResponse)
async def predict_canvas(body: CanvasRequest):
    model = _require_model()
    try:
        t0     = time.perf_counter()
        result = predict_from_base64(model, body.image)
        result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        log.info(f"Canvas predict → '{result['label']}' ({result['confidence']:.1f}%)")
        return result
    except Exception as exc:
        log.error(f"Canvas predict error: {exc}")
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")


@app.post("/api/predict/upload", response_model=PredictionResponse)
async def predict_upload(file: UploadFile = File(...)):
    model = _require_model()

    ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg",
                     "image/bmp", "image/webp", "image/gif"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code = 415,
            detail      = f"Unsupported file type: {file.content_type}",
        )

    MAX_SIZE = 10 * 1024 * 1024
    raw = await file.read()
    if len(raw) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")

    try:
        t0     = time.perf_counter()
        result = predict_from_bytes(model, raw)
        result["latency_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        log.info(f"Upload predict ({file.filename}) → '{result['label']}' ({result['confidence']:.1f}%)")
        return result
    except Exception as exc:
        log.error(f"Upload predict error: {exc}")
        raise HTTPException(status_code=422, detail=f"Could not process image: {exc}")


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    log.error(f"Unhandled error on {request.url}: {exc}")
    return JSONResponse(
        status_code = 500,
        content     = {"detail": "Internal server error. Please try again."},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)