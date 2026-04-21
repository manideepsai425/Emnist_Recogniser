# ── Multi-stage build: keeps final image lean ────────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

# Install CPU-only PyTorch from the official index (avoids pulling CUDA libs)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        torch==2.3.0 torchvision==0.18.0 \
        --index-url https://download.pytorch.org/whl/cpu

# Copy requirements first (layer-cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Render injects PORT at runtime (default 10000)
ENV PORT=10000
EXPOSE $PORT

# Healthcheck so Render knows when the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/api/health')"

CMD uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1
