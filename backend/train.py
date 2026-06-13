import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
import json
import os

# ─────────────────────────────────────────
#  MODEL  (must be identical to model.py)
# ─────────────────────────────────────────
class DigitCNN(nn.Module):
    def __init__(self):
        super(DigitCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1),
            nn.ReLU(),
            nn.BatchNorm2d(32),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout(0.25),

            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(),
            nn.BatchNorm2d(128),
            nn.Conv2d(128, 128, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout(0.25),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 7 * 7, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.5),
            nn.Linear(512, 10)
        )

    def forward(self, x):
        return self.classifier(self.features(x))


# ─────────────────────────────────────────
#  TRAINING
# ─────────────────────────────────────────
def train_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    transform = transforms.Compose([
        transforms.RandomRotation(10),
        transforms.RandomAffine(0, translate=(0.1, 0.1)),
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    test_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])

    train_data = datasets.MNIST('./data', train=True,  download=True, transform=transform)
    test_data  = datasets.MNIST('./data', train=False, download=True, transform=test_transform)

    train_loader = DataLoader(train_data, batch_size=128, shuffle=True,
                              num_workers=2, pin_memory=True)
    test_loader  = DataLoader(test_data,  batch_size=256, shuffle=False,
                              num_workers=2, pin_memory=True)

    model     = DigitCNN().to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=0.01,
        steps_per_epoch=len(train_loader), epochs=15
    )
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)

    history  = []
    best_acc = 0.0

    for epoch in range(1, 16):
        # ── Train ──────────────────────────────
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
            scheduler.step()
            running_loss += loss.item()

        avg_loss = running_loss / len(train_loader)

        # ── Evaluate ───────────────────────────
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for images, labels in test_loader:
                images, labels = images.to(device), labels.to(device)
                preds = model(images).argmax(dim=1)
                correct += (preds == labels).sum().item()
                total   += labels.size(0)

        acc = 100.0 * correct / total
        print(f"Epoch {epoch:02d}/15 | Loss: {avg_loss:.4f} | Accuracy: {acc:.2f}%")
        history.append({"epoch": epoch, "loss": round(avg_loss, 4), "accuracy": round(acc, 2)})

        if acc > best_acc:
            best_acc = acc
            # ── Saves BOTH filenames your repo expects ──
            torch.save(model.state_dict(), "best_mnist_model.pth")   # ← main.py uses this
            torch.save(model.state_dict(), "best_state_dict.pth")    # ← repo/weights folder
            print(f"  ✔ Saved — best so far: {best_acc:.2f}%")

    with open("train_history.json", "w") as f:
        json.dump(history, f, indent=2)

    print(f"\n✅ Done. Best accuracy: {best_acc:.2f}%")


# ─────────────────────────────────────────
#  COLAB DOWNLOAD
# ─────────────────────────────────────────
def download_files():
    try:
        from google.colab import files
        print("\nDownloading files...")
        files.download("best_mnist_model.pth")
        files.download("best_state_dict.pth")
        files.download("train_history.json")
        print("✅ All three files downloaded.")
    except ImportError:
        print("Not in Colab — files saved to working directory.")


# ─────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────
if __name__ == "__main__":
    train_model()
    download_files()