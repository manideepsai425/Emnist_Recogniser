# =============================================================================
# train.py — Train EMNISTNet and save weights to backend/weights/
# Run this in Google Colab or locally:  python train.py
# After training, commit  backend/weights/best_emnist_model.pth  to your repo.
# =============================================================================
import copy, time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
import torchvision.transforms as transforms
from torchvision.datasets import EMNIST

from model import EMNISTNet, NUM_CLASSES

# ─── Config ──────────────────────────────────────────────────────────────────
CFG = dict(
    data_root   = "./data",
    out_dir     = Path(__file__).parent / "weights",
    batch_size  = 256,
    epochs      = 25,
    lr          = 1e-3,
    weight_decay= 1e-4,
    val_split   = 0.1,
    seed        = 42,
    num_workers = 2,
    device      = "cuda" if torch.cuda.is_available() else "cpu",
)
CFG["out_dir"].mkdir(parents=True, exist_ok=True)
torch.manual_seed(CFG["seed"])

WEIGHTS_PATH = CFG["out_dir"] / "best_emnist_model.pth"

# ─── Transforms ──────────────────────────────────────────────────────────────
MEAN, STD = (0.1751,), (0.3332,)

train_tf = transforms.Compose([
    transforms.RandomAffine(degrees=10, translate=(0.1, 0.1), scale=(0.9, 1.1)),
    transforms.RandomPerspective(distortion_scale=0.2, p=0.3),
    transforms.ToTensor(),
    transforms.Normalize(MEAN, STD),
])
val_tf = transforms.Compose([transforms.ToTensor(), transforms.Normalize(MEAN, STD)])


def main():
    device = torch.device(CFG["device"])
    print(f"Device: {device}")

    # ── Data ──────────────────────────────────────────────────────────────────
    full_train = EMNIST(CFG["data_root"], split="balanced",
                        train=True,  download=True, transform=train_tf)
    test_ds    = EMNIST(CFG["data_root"], split="balanced",
                        train=False, download=True, transform=val_tf)

    val_n   = int(len(full_train) * CFG["val_split"])
    train_n = len(full_train) - val_n
    train_ds, val_ds = random_split(
        full_train, [train_n, val_n],
        generator=torch.Generator().manual_seed(CFG["seed"]),
    )
    val_copy = copy.copy(full_train)
    val_copy.transform = val_tf
    val_ds.dataset     = val_copy

    kw = dict(batch_size=CFG["batch_size"], num_workers=CFG["num_workers"],
              pin_memory=device.type == "cuda")
    train_loader = DataLoader(train_ds, shuffle=True,  **kw)
    val_loader   = DataLoader(val_ds,   shuffle=False, **kw)
    test_loader  = DataLoader(test_ds,  shuffle=False, **kw)
    print(f"Train: {train_n:,} | Val: {val_n:,} | Test: {len(test_ds):,}")

    # ── Model ─────────────────────────────────────────────────────────────────
    model     = EMNISTNet(NUM_CLASSES).to(device)
    total     = sum(p.numel() for p in model.parameters())
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.Adam(model.parameters(),
                                  lr=CFG["lr"], weight_decay=CFG["weight_decay"])
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=CFG["epochs"], eta_min=1e-5)
    print(f"EMNISTNet | {total:,} params")

    best_acc, best_state = 0.0, None
    print(f"\n{'Ep':>3} {'TLoss':>7} {'TAcc':>7} {'VLoss':>7} {'VAcc':>7} {'Time':>6}")
    print("─" * 44)

    for epoch in range(1, CFG["epochs"] + 1):
        t0 = time.time()
        model.train()
        tl, tc, tt = 0.0, 0, 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad(set_to_none=True)
            out  = model(x)
            loss = criterion(out, y)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            tl += loss.item() * x.size(0); tc += (out.argmax(1)==y).sum().item(); tt += x.size(0)
        scheduler.step()

        model.eval()
        vl, vc, vt = 0.0, 0, 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                out  = model(x)
                loss = criterion(out, y)
                vl += loss.item()*x.size(0); vc += (out.argmax(1)==y).sum().item(); vt += x.size(0)

        ta, va = tc/tt*100, vc/vt*100
        star = " ★" if va > best_acc else ""
        print(f"{epoch:>3} {tl/tt:>7.4f} {ta:>6.2f}% {vl/vt:>7.4f} {va:>6.2f}%  {time.time()-t0:>5.1f}s{star}")

        if va > best_acc:
            best_acc   = va
            best_state = copy.deepcopy(model.state_dict())
            torch.save(best_state, WEIGHTS_PATH)

    print(f"\n✅  Best val accuracy: {best_acc:.2f}%")
    print(f"💾  Saved → {WEIGHTS_PATH}")

    # ── Test eval ─────────────────────────────────────────────────────────────
    model.load_state_dict(best_state)
    model.eval()
    tc, tt = 0, 0
    with torch.no_grad():
        for x, y in test_loader:
            x, y = x.to(device), y.to(device)
            tc += (model(x).argmax(1)==y).sum().item(); tt += x.size(0)
    print(f"🏆  Test accuracy: {tc/tt*100:.2f}%")


if __name__ == "__main__":
    main()
