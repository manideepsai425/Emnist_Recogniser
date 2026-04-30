# 🖊️ Neural Ink — EMNIST Recognition

> Handwritten digit (0–9) and letter (A–Z) recognition powered by **PyTorch**, served via **FastAPI**, and deployed as a beautiful React UI on Vercel + Render.

---

## 📁 Repository Structure

```
emnist-app/
├── backend/
│   ├── main.py
│   ├── model.py
│   ├── train.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── render.yaml
│   ├── .env.example
│   └── weights/
│       └── best_emnist_model.pth
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   └── lib/
    │       └── api.js
    ├── public/
    │   └── favicon.svg
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── vercel.json
    └── .env.example
```

---

## 🚀 Quick Start

### 1 — Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/emnist-app.git
cd emnist-app

# Backend
cd backend
pip install -r requirements.txt

# Frontend (separate terminal)
cd frontend
npm install
```

---

### 2 — Train the model (Google Colab recommended)

Upload `backend/train.py` and `backend/model.py` to Colab, then run:

```python
# In a Colab cell:
!python train.py
```

After ~25 epochs (~85–88 % test accuracy on EMNIST Balanced), download
`backend/weights/best_emnist_model.pth` and add it to your local repo:

```bash
# Place the file here:
backend/weights/best_emnist_model.pth
```

Then **remove** (or comment out) the `.gitignore` line that excludes `*.pth`
so it gets committed:

```bash
# In .gitignore, comment out:
# backend/weights/*.pth
git add backend/weights/best_emnist_model.pth
git commit -m "feat: add trained EMNIST weights"
git push
```

> **Note:** The weights file is ~5 MB — well within GitHub's 100 MB limit.

---

### 3 — Local development

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
cp .env.example .env.local
# VITE_API_URL is empty → Vite proxy forwards /api to localhost:8000
npm run dev
# Open http://localhost:5173
```

---

## ☁️ Deployment

### Backend → Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Render detects the `Dockerfile` automatically
5. Add environment variable:
   - `FRONTEND_URL` → your Vercel URL (e.g. `https://emnist.vercel.app`)
6. Click **Deploy**

> The free plan spins down after inactivity. First request after sleep takes ~30 s.
> Upgrade to **Starter** ($7/mo) for always-on.

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` → your Render backend URL (e.g. `https://emnist-api.onrender.com`)
5. Click **Deploy**

Vercel auto-detects Vite. The `vercel.json` handles SPA routing rewrites.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health + model status |
| `GET` | `/api/classes` | All 47 class labels |
| `GET` | `/api/model/info` | Architecture metadata |
| `POST` | `/api/predict/canvas` | Predict from base64 PNG body |
| `POST` | `/api/predict/upload` | Predict from multipart file upload |

### Example — canvas prediction

```bash
curl -X POST https://YOUR_RENDER_URL/api/predict/canvas \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/png;base64,iVBOR..."}'
```

Response:
```json
{
  "label":      "A",
  "confidence": 94.7,
  "uncertain":  false,
  "latency_ms": 12.3,
  "top5": [
    { "label": "A", "prob": 0.947 },
    { "label": "4", "prob": 0.023 },
    ...
  ],
  "all_probs": [...]
}
```

---

## 🧠 Model Details

| Property | Value |
|----------|-------|
| Architecture | EMNISTNet (custom CNN) |
| Dataset | EMNIST Balanced |
| Classes | 47 (0–9 + A–Z + 11 merged lower-case) |
| Input | 28×28 grayscale |
| Params | ~1.2 M |
| Optimizer | Adam + CosineAnnealingLR |
| Regularisation | BatchNorm2d, Dropout2d, label smoothing |
| Expected accuracy | ~86–89% on test set |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| ML framework | PyTorch 2.3 |
| API server | FastAPI + Uvicorn |
| Containerisation | Docker (CPU-only torch) |
| Frontend | React 18 + Vite 5 |
| Animations | Framer Motion |
| Icons | Lucide React |
| File upload | react-dropzone |
| Backend hosting | Render |
| Frontend hosting | Vercel |

---

## 📝 License

MIT © 2024 — built with ❤️ and PyTorch
