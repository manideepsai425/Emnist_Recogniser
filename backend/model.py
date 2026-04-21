# =============================================================================
# model.py — EMNISTNet architecture + inference utilities
# =============================================================================
import io, base64, copy
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image, ImageOps, ImageFilter

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms

# ─── Constants ────────────────────────────────────────────────────────────────
EMNIST_MEAN       = (0.1751,)
EMNIST_STD        = (0.3332,)
NUM_CLASSES       = 47
CONFIDENCE_THRESH = 0.50

# EMNIST Balanced label map: 0-9, A-Z, then 11 merged lower-case letters
_DIGITS  = [str(d) for d in range(10)]
_LETTERS = [chr(c) for c in range(ord("A"), ord("Z") + 1)]
_EXTRA   = ["a", "b", "d", "e", "f", "g", "h", "n", "q", "r", "t"]
CLASS_LABELS: list[str] = _DIGITS + _LETTERS + _EXTRA  # len == 47

assert len(CLASS_LABELS) == NUM_CLASSES


def idx_to_label(idx: int) -> str:
    return CLASS_LABELS[idx]


# ─── Architecture ─────────────────────────────────────────────────────────────
class EMNISTNet(nn.Module):
    """
    3-block deep CNN for EMNIST Balanced (47 classes).
    Input: (B, 1, 28, 28)
    Output: raw logits (B, 47) — apply softmax externally.
    """

    def __init__(self, num_classes: int = NUM_CLASSES, drop_p: float = 0.3):
        super().__init__()

        def conv_block(in_ch: int, out_ch: int) -> nn.Sequential:
            return nn.Sequential(
                nn.Conv2d(in_ch,  out_ch, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
                nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
                nn.MaxPool2d(2, 2),
                nn.Dropout2d(p=drop_p),
            )

        self.block1 = conv_block(1,   32)   # 28 → 14
        self.block2 = conv_block(32,  64)   # 14 → 7
        self.block3 = conv_block(64, 128)   # 7  → 3

        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 3 * 3, 512, bias=False),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=drop_p + 0.1),
            nn.Linear(512, num_classes),
        )
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, (nn.BatchNorm2d, nn.BatchNorm1d)):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        return self.head(x)


# ─── Model loader ─────────────────────────────────────────────────────────────
_model_cache: EMNISTNet | None = None


def load_model(weights_path: str | Path) -> EMNISTNet:
    """Load model from disk; cache in module-level singleton."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    model = EMNISTNet(num_classes=NUM_CLASSES)
    state = torch.load(weights_path, map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()
    _model_cache = model
    return model


# ─── Preprocessing ────────────────────────────────────────────────────────────
_infer_transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize(EMNIST_MEAN, EMNIST_STD),
])


def _preprocess(pil_img: Image.Image) -> torch.Tensor:
    """
    Accept an arbitrary PIL image (canvas draw or file upload).
    Returns a normalised (1, 1, 28, 28) float tensor.
    """
    img = pil_img.convert("L")
    img = ImageOps.invert(img)                  # white-on-black → black-on-white
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    w, h = img.size
    side  = max(w, h, 1)
    bg    = Image.new("L", (side, side), 0)
    bg.paste(img, ((side - w) // 2, (side - h) // 2))
    img   = bg.resize((28, 28), Image.LANCZOS)

    return _infer_transform(img).unsqueeze(0)   # (1, 1, 28, 28)


# ─── Inference ────────────────────────────────────────────────────────────────
def predict_pil(model: EMNISTNet, pil_img: Image.Image) -> dict:
    """
    Run inference on a PIL image.
    Returns a dict with label, confidence, top-5, and uncertain flag.
    """
    tensor = _preprocess(pil_img)

    with torch.no_grad():
        logits = model(tensor)
        probs  = F.softmax(logits, dim=1).squeeze().numpy()

    top5_idx   = np.argsort(probs)[::-1][:5].tolist()
    top5       = [{"label": idx_to_label(i), "prob": float(probs[i])} for i in top5_idx]
    best_idx   = top5_idx[0]
    confidence = float(probs[best_idx])
    label      = idx_to_label(best_idx)

    return {
        "label":      label,
        "confidence": round(confidence * 100, 2),
        "uncertain":  confidence < CONFIDENCE_THRESH,
        "top5":       top5,
        "all_probs":  [
            {"label": idx_to_label(i), "prob": round(float(probs[i]) * 100, 3)}
            for i in range(NUM_CLASSES)
        ],
    }


def predict_from_base64(model: EMNISTNet, b64: str) -> dict:
    """Decode a base64 PNG/JPG string and run prediction."""
    # Strip data-URL prefix if present
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw  = base64.b64decode(b64)
    img  = Image.open(io.BytesIO(raw)).convert("RGBA")
    bg   = Image.new("RGBA", img.size, (0, 0, 0, 255))
    bg.paste(img, mask=img.split()[3])
    img  = bg.convert("L")
    return predict_pil(model, img)


def predict_from_bytes(model: EMNISTNet, raw_bytes: bytes) -> dict:
    """Decode raw image bytes and run prediction."""
    img = Image.open(io.BytesIO(raw_bytes))
    return predict_pil(model, img)
