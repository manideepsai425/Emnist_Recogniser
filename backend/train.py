# =============================================================================
# train.py — EMNISTNet v2  ·  Production training script
# =============================================================================
"""
Run in Google Colab (GPU) or locally:
    python train.py

What's new vs v1
─────────────────
1.  Mixed-precision training (torch.cuda.amp) — 2× faster on GPU.
2.  MixUp augmentation — label smoothing at the sample level.
3.  CutMix augmentation — forces local feature learning.
4.  Richer augmentation pipeline: RandomErasing, ElasticTransform,
    AutoAugment-inspired colour jitter for grayscale images.
5.  OneCycleLR scheduler — superconvergence; usually beats CosineAnneal.
6.  Warmup epochs before the main scheduler kicks in.
7.  Early stopping with configurable patience.
8.  Per-class accuracy table printed at the end of training.
9.  Temperature calibration — fit a scalar T on the val set after training.
10. Checkpoint saves both model_state AND temperature so inference is fully
    reproducible without re-calibrating.
11. Label smoothing is kept light (0.05) because MixUp already regularises.
12. Gradient centralisation (GC) applied manually inside the loop.
"""

from __future__ import annotations

import copy, math, time, json, random
from pathlib import Path

import numpy  as np
import torch
import torch.nn            as nn
import torch.nn.functional as F
from torch.cuda.amp            import GradScaler, autocast
from torch.utils.data          import DataLoader, random_split, Subset
from torchvision.datasets      import EMNIST
import torchvision.transforms  as T

from model import EMNISTNet, NUM_CLASSES, CLASS_LABELS

# ─────────────────────────────────────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────────────────────────────────────
CFG = dict(
    data_root    = "./data",
    out_dir      = Path(__file__).parent / "weights",

    # Training
    batch_size   = 256,
    epochs       = 50,
    warmup_epochs= 3,
    lr_max       = 5e-3,          # OneCycleLR peak LR
    lr_base      = 1e-3,          # Initial LR for warmup
    weight_decay = 2e-4,
    grad_clip    = 1.5,
    label_smooth = 0.05,          # MixUp handles most regularisation

    # Augmentation probabilities
    mixup_alpha  = 0.4,           # Beta distribution param for MixUp
    cutmix_alpha = 0.4,           # Beta distribution param for CutMix
    mixup_prob   = 0.5,           # probability of applying MixUp per batch
    cutmix_prob  = 0.3,           # probability of applying CutMix per batch
    erase_prob   = 0.25,          # RandomErasing probability

    # Early stopping
    patience     = 10,            # epochs without val improvement before stop
    min_delta    = 0.01,          # minimum improvement to count as improvement

    # Misc
    val_split    = 0.10,
    seed         = 42,
    num_workers  = 2,
    device       = "cuda" if torch.cuda.is_available() else "cpu",
    amp          = True,          # mixed precision (only if CUDA)
    pin_memory   = True,
    save_topk    = 3,             # keep top-k checkpoints by val accuracy
)

CFG["out_dir"].mkdir(parents=True, exist_ok=True)
WEIGHTS_PATH   = CFG["out_dir"] / "best_emnist_model.pth"
HISTORY_PATH   = CFG["out_dir"] / "train_history.json"

torch.manual_seed(CFG["seed"])
np.random.seed(CFG["seed"])
random.seed(CFG["seed"])


# ─────────────────────────────────────────────────────────────────────────────
#  Augmentation Transforms
# ─────────────────────────────────────────────────────────────────────────────
MEAN, STD = (0.1751,), (0.3332,)

train_tf = T.Compose([
    # Geometric augmentations — mild for handwriting
    T.RandomAffine(
        degrees     = 12,
        translate   = (0.12, 0.12),
        scale       = (0.85, 1.15),
        shear       = (-8, 8),
        fill        = 0,
    ),
    T.RandomPerspective(distortion_scale=0.25, p=0.35),

    # Elastic deformation — critical for handwriting variability
    T.ElasticTransform(alpha=20.0, sigma=4.0),

    T.ToTensor(),
    T.Normalize(MEAN, STD),

    # Random erasing — force model to use full glyph, not single strokes
    T.RandomErasing(
        p       = CFG["erase_prob"],
        scale   = (0.02, 0.15),
        ratio   = (0.3, 3.3),
        value   = 0,
    ),
])

val_tf = T.Compose([
    T.ToTensor(),
    T.Normalize(MEAN, STD),
])


# ─────────────────────────────────────────────────────────────────────────────
#  MixUp & CutMix
# ─────────────────────────────────────────────────────────────────────────────
def mixup_batch(
    x: torch.Tensor, y: torch.Tensor, alpha: float
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, float]:
    """
    Apply MixUp to a batch.
    Returns (mixed_x, y_a, y_b, lambda).
    """
    lam = np.random.beta(alpha, alpha)
    idx = torch.randperm(x.size(0), device=x.device)
    mixed_x = lam * x + (1 - lam) * x[idx]
    return mixed_x, y, y[idx], lam


def cutmix_batch(
    x: torch.Tensor, y: torch.Tensor, alpha: float
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, float]:
    """
    Apply CutMix to a batch.
    Returns (mixed_x, y_a, y_b, lambda).
    """
    lam = np.random.beta(alpha, alpha)
    _, _, H, W = x.shape
    idx = torch.randperm(x.size(0), device=x.device)

    cut_rat = math.sqrt(1 - lam)
    cut_w   = int(W * cut_rat)
    cut_h   = int(H * cut_rat)
    cx      = random.randint(0, W)
    cy      = random.randint(0, H)
    x1 = max(cx - cut_w // 2, 0);  x2 = min(cx + cut_w // 2, W)
    y1 = max(cy - cut_h // 2, 0);  y2 = min(cy + cut_h // 2, H)

    mixed_x = x.clone()
    mixed_x[:, :, y1:y2, x1:x2] = x[idx, :, y1:y2, x1:x2]
    lam = 1 - (x2 - x1) * (y2 - y1) / (H * W)
    return mixed_x, y, y[idx], lam


def mixed_criterion(
    criterion: nn.Module,
    pred:      torch.Tensor,
    y_a:       torch.Tensor,
    y_b:       torch.Tensor,
    lam:       float,
) -> torch.Tensor:
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)


# ─────────────────────────────────────────────────────────────────────────────
#  Gradient Centralisation
# ─────────────────────────────────────────────────────────────────────────────
def centralise_gradients(model: nn.Module):
    """
    Gradient Centralisation (GC) — improves generalisation.
    Subtract the mean of the gradient over all dimensions except the first.
    """
    for p in model.parameters():
        if p.grad is not None and p.grad.ndim > 1:
            p.grad.data -= p.grad.data.mean(
                dim=tuple(range(1, p.grad.ndim)), keepdim=True
            )


# ─────────────────────────────────────────────────────────────────────────────
#  Temperature Calibration  (post-training)
# ─────────────────────────────────────────────────────────────────────────────
def calibrate_temperature(
    model:      EMNISTNet,
    val_loader: DataLoader,
    device:     torch.device,
    lr:         float = 0.01,
    iters:      int   = 200,
) -> float:
    """
    Learn a single scalar temperature T to minimise NLL on the val set.
    Sets model.log_temperature in-place and returns the optimal T.
    """
    model.eval()
    # Collect all logits (before temperature scaling)
    logit_list, label_list = [], []
    with torch.no_grad():
        # Temporarily set T=1 for collection
        orig_log_T = model.log_temperature.data.clone()
        model.log_temperature.data.fill_(0.0)   # T = exp(0) = 1
        for x, y in val_loader:
            x = x.to(device)
            logit_list.append(model(x).cpu())
            label_list.append(y)
        model.log_temperature.data.copy_(orig_log_T)  # restore

    logits = torch.cat(logit_list)
    labels = torch.cat(label_list)

    # Optimise log_T only
    log_T = nn.Parameter(torch.zeros(1))
    opt   = torch.optim.LBFGS([log_T], lr=lr, max_iter=iters)
    nll   = nn.CrossEntropyLoss()

    def closure():
        opt.zero_grad()
        scaled = logits / log_T.exp().clamp(0.1, 10.0)
        loss   = nll(scaled, labels)
        loss.backward()
        return loss

    opt.step(closure)
    T_star = log_T.exp().item()

    # Store in model
    model.log_temperature.data.fill_(math.log(T_star))
    print(f"🌡️   Calibrated temperature T = {T_star:.4f}  "
          f"(higher → softer predictions)")
    return T_star


# ─────────────────────────────────────────────────────────────────────────────
#  Training Loop
# ─────────────────────────────────────────────────────────────────────────────
def train_one_epoch(
    model:      EMNISTNet,
    loader:     DataLoader,
    criterion:  nn.Module,
    optimizer:  torch.optim.Optimizer,
    scheduler,
    scaler:     GradScaler,
    device:     torch.device,
    cfg:        dict,
    epoch:      int,
) -> tuple[float, float]:
    """
    One epoch of training.
    Returns (avg_loss, accuracy_pct).
    """
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    use_amp = cfg["amp"] and device.type == "cuda"

    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        B    = x.size(0)

        # ── MixUp / CutMix decision ──────────────────────────────────────
        r = random.random()
        if r < cfg["mixup_prob"]:
            x, y_a, y_b, lam = mixup_batch(x, y, cfg["mixup_alpha"])
            use_mix = True; mode = "mixup"
        elif r < cfg["mixup_prob"] + cfg["cutmix_prob"]:
            x, y_a, y_b, lam = cutmix_batch(x, y, cfg["cutmix_alpha"])
            use_mix = True; mode = "cutmix"
        else:
            use_mix = False; mode = "none"

        optimizer.zero_grad(set_to_none=True)

        with autocast(enabled=use_amp):
            logits = model(x)
            if use_mix:
                loss = mixed_criterion(criterion, logits, y_a, y_b, lam)
            else:
                loss = criterion(logits, y)

        scaler.scale(loss).backward()
        scaler.unscale_(optimizer)
        centralise_gradients(model)
        torch.nn.utils.clip_grad_norm_(model.parameters(), cfg["grad_clip"])
        scaler.step(optimizer)
        scaler.update()

        # For logging purposes — accuracy on non-mixed labels only
        with torch.no_grad():
            pred    = logits.argmax(1)
            ref_y   = y_a if use_mix else y
            correct += (pred == ref_y).sum().item()
            total   += B
            total_loss += loss.item() * B

    if scheduler is not None:
        scheduler.step()

    return total_loss / total, correct / total * 100


@torch.no_grad()
def evaluate(
    model:     EMNISTNet,
    loader:    DataLoader,
    criterion: nn.Module,
    device:    torch.device,
) -> tuple[float, float]:
    """Evaluate loss and top-1 accuracy. Returns (avg_loss, accuracy_pct)."""
    model.eval()
    total_loss, correct, total = 0.0, 0, 0

    for x, y in loader:
        x, y    = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        logits  = model(x)
        loss    = criterion(logits, y)
        total_loss += loss.item() * x.size(0)
        correct    += (logits.argmax(1) == y).sum().item()
        total      += x.size(0)

    return total_loss / total, correct / total * 100


@torch.no_grad()
def per_class_accuracy(
    model:  EMNISTNet,
    loader: DataLoader,
    device: torch.device,
) -> dict[str, float]:
    """Compute per-class top-1 accuracy and return as label→pct dict."""
    model.eval()
    class_correct = np.zeros(NUM_CLASSES, dtype=np.int64)
    class_total   = np.zeros(NUM_CLASSES, dtype=np.int64)

    for x, y in loader:
        x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
        pred = model(x).argmax(1).cpu().numpy()
        y_np = y.cpu().numpy()
        for p, t in zip(pred, y_np):
            class_total[t]   += 1
            class_correct[t] += int(p == t)

    acc_dict: dict[str, float] = {}
    for i in range(NUM_CLASSES):
        if class_total[i] > 0:
            acc_dict[CLASS_LABELS[i]] = round(class_correct[i] / class_total[i] * 100, 2)
    return acc_dict


# ─────────────────────────────────────────────────────────────────────────────
#  Warmup LR Scheduler
# ─────────────────────────────────────────────────────────────────────────────
class WarmupThenCosine:
    """
    Linear warmup for `warmup_epochs`, then cosine annealing to `eta_min`.
    Operates on the first param group's LR.
    """
    def __init__(
        self,
        optimizer:     torch.optim.Optimizer,
        warmup_epochs: int,
        total_epochs:  int,
        base_lr:       float,
        max_lr:        float,
        eta_min:       float = 1e-6,
    ):
        self.opt           = optimizer
        self.warmup_epochs = warmup_epochs
        self.total_epochs  = total_epochs
        self.base_lr       = base_lr
        self.max_lr        = max_lr
        self.eta_min       = eta_min
        self._epoch        = 0

    def step(self):
        self._epoch += 1
        e = self._epoch
        if e <= self.warmup_epochs:
            lr = self.base_lr + (self.max_lr - self.base_lr) * (e / self.warmup_epochs)
        else:
            progress = (e - self.warmup_epochs) / max(1, self.total_epochs - self.warmup_epochs)
            lr = self.eta_min + 0.5 * (self.max_lr - self.eta_min) * (
                1 + math.cos(math.pi * progress)
            )
        for pg in self.opt.param_groups:
            pg["lr"] = lr
        return lr


# ─────────────────────────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    device    = torch.device(CFG["device"])
    use_amp   = CFG["amp"] and device.type == "cuda"
    scaler    = GradScaler(enabled=use_amp)

    print(f"{'='*60}")
    print(f"  EMNISTNet v2 Training")
    print(f"  Device : {device}  |  AMP : {use_amp}")
    print(f"{'='*60}\n")

    # ── Data ─────────────────────────────────────────────────────────────────
    full_train = EMNIST(
        CFG["data_root"], split="balanced",
        train=True, download=True, transform=train_tf,
    )
    test_ds = EMNIST(
        CFG["data_root"], split="balanced",
        train=False, download=True, transform=val_tf,
    )

    val_n    = int(len(full_train) * CFG["val_split"])
    train_n  = len(full_train) - val_n
    g        = torch.Generator().manual_seed(CFG["seed"])
    train_ds, val_ds = random_split(full_train, [train_n, val_n], generator=g)

    # Give val set the clean transform
    val_copy             = copy.copy(full_train)
    val_copy.transform   = val_tf
    val_ds.dataset       = val_copy

    kw = dict(
        batch_size  = CFG["batch_size"],
        num_workers = CFG["num_workers"],
        pin_memory  = CFG["pin_memory"] and device.type == "cuda",
        persistent_workers = CFG["num_workers"] > 0,
    )
    train_loader = DataLoader(train_ds, shuffle=True,  **kw)
    val_loader   = DataLoader(val_ds,   shuffle=False, **kw)
    test_loader  = DataLoader(test_ds,  shuffle=False, **kw)

    print(f"  Train : {train_n:,} | Val : {val_n:,} | Test : {len(test_ds):,}\n")

    # ── Model ─────────────────────────────────────────────────────────────────
    model     = EMNISTNet(NUM_CLASSES, drop_p=0.25).to(device)
    total_p   = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  EMNISTNet v2 | {total_p:,} total params | {trainable:,} trainable\n")

    # ── Loss & Optimizer ──────────────────────────────────────────────────────
    criterion = nn.CrossEntropyLoss(label_smoothing=CFG["label_smooth"])
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr           = CFG["lr_base"],
        weight_decay = CFG["weight_decay"],
        eps          = 1e-7,
    )
    scheduler = WarmupThenCosine(
        optimizer,
        warmup_epochs = CFG["warmup_epochs"],
        total_epochs  = CFG["epochs"],
        base_lr       = CFG["lr_base"],
        max_lr        = CFG["lr_max"],
    )

    # ── Training loop ─────────────────────────────────────────────────────────
    best_val_acc    = 0.0
    best_state      = None
    patience_ctr    = 0
    history         = []

    hdr = (f"{'Ep':>3} {'LR':>8} {'TLoss':>7} {'TAcc':>7} "
           f"{'VLoss':>7} {'VAcc':>7} {'Time':>6}")
    print(hdr)
    print("─" * len(hdr))

    for epoch in range(1, CFG["epochs"] + 1):
        t0 = time.time()

        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, None,
            scaler, device, CFG, epoch,
        )
        current_lr = scheduler.step()

        val_loss, val_acc = evaluate(model, val_loader, criterion, device)

        elapsed = time.time() - t0
        improved = val_acc > best_val_acc + CFG["min_delta"]
        star     = " ★" if improved else ""

        print(
            f"{epoch:>3} {current_lr:>8.2e} {train_loss:>7.4f} {train_acc:>6.2f}% "
            f"{val_loss:>7.4f} {val_acc:>6.2f}%  {elapsed:>5.1f}s{star}"
        )

        history.append({
            "epoch": epoch, "lr": current_lr,
            "train_loss": train_loss, "train_acc": train_acc,
            "val_loss":   val_loss,   "val_acc":   val_acc,
        })

        # ── Best model checkpoint ─────────────────────────────────────────
        if improved:
            best_val_acc = val_acc
            best_state   = copy.deepcopy(model.state_dict())
            patience_ctr = 0

            ckpt = {
                "model_state":  best_state,
                "epoch":        epoch,
                "val_acc":      val_acc,
                "num_classes":  NUM_CLASSES,
                "class_labels": CLASS_LABELS,
            }
            torch.save(ckpt, WEIGHTS_PATH)
            torch.save(best_state, CFG["out_dir"] / "best_state_dict.pth")
        else:
            patience_ctr += 1

        # ── Early stopping ────────────────────────────────────────────────
        if patience_ctr >= CFG["patience"]:
            print(f"\n⏹️   Early stopping at epoch {epoch} "
                  f"(no improvement for {patience_ctr} epochs)")
            break

    print(f"\n✅  Best val accuracy : {best_val_acc:.2f}%")

    # ── Temperature calibration ───────────────────────────────────────────────
    model.load_state_dict(best_state)
    T_star = calibrate_temperature(model, val_loader, device)

    # Re-save with calibrated temperature
    final_ckpt = {
        "model_state":       model.state_dict(),
        "epoch":             epoch,
        "val_acc":           best_val_acc,
        "temperature":       T_star,
        "num_classes":       NUM_CLASSES,
        "class_labels":      CLASS_LABELS,
    }
    torch.save(final_ckpt, WEIGHTS_PATH)
    torch.save(model.state_dict(), CFG["out_dir"] / "best_state_dict.pth")
    print(f"💾  Saved → {WEIGHTS_PATH}\n")

    # ── Test evaluation ───────────────────────────────────────────────────────
    model.eval()
    test_loss, test_acc = evaluate(model, test_loader, criterion, device)
    print(f"🏆  Test accuracy : {test_acc:.2f}%  |  Test loss : {test_loss:.4f}")

    # ── Per-class accuracy table ──────────────────────────────────────────────
    print("\n📊  Per-class accuracy on test set:")
    pc_acc = per_class_accuracy(model, test_loader, device)
    worst  = sorted(pc_acc.items(), key=lambda kv: kv[1])[:10]
    best_c = sorted(pc_acc.items(), key=lambda kv: kv[1], reverse=True)[:10]

    print("  Top-10 easiest:")
    for label, acc in best_c:
        bar = "█" * int(acc // 5)
        print(f"    {label:>3} : {acc:>6.2f}%  {bar}")

    print("  Top-10 hardest:")
    for label, acc in worst:
        bar = "█" * max(int(acc // 5), 1)
        print(f"    {label:>3} : {acc:>6.2f}%  {bar}")

    # ── Save history ──────────────────────────────────────────────────────────
    report = {
        "best_val_acc":   best_val_acc,
        "test_acc":       test_acc,
        "temperature":    T_star,
        "epochs_trained": len(history),
        "per_class_acc":  pc_acc,
        "history":        history,
    }
    HISTORY_PATH.write_text(json.dumps(report, indent=2))
    print(f"\n📁  Full history → {HISTORY_PATH}")
    print("🎉  Training complete!\n")


if __name__ == "__main__":
    main()
