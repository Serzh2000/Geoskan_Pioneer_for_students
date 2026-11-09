"""(Запускается на КОМПЬЮТЕРЕ) Обучение маленькой CNN на CIFAR-10 и экспорт в ONNX для регистра.

pip install torch torchvision
python 13a_train_export.py      ->  cifar_net.onnx
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision
import torchvision.transforms as T

CLASSES = ("plane", "car", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck")


class Net(nn.Module):
    """Классическая LeNet-подобная сеть: 2 свёртки + 3 полносвязных слоя.

    Вход — (N, 3, 32, 32), значения 0..1 (стандартный для PyTorch формат NCHW).
    На дроне в model.run() подаётся массив (1, 32, 32, 3) — так же, как в официальном
    примере classification: раскладку осей для 4-мерного входа согласует среда RKNN.
    """

    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 16, 5)
        self.conv2 = nn.Conv2d(16, 32, 5)
        self.pool = nn.MaxPool2d(2, 2)
        self.fc1 = nn.Linear(32 * 5 * 5, 120)
        self.fc2 = nn.Linear(120, 84)
        self.fc3 = nn.Linear(84, len(CLASSES))

    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))      # 32 -> 28 -> 14
        x = self.pool(F.relu(self.conv2(x)))      # 14 -> 10 -> 5
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)                        # логиты 10 классов


def loaders(batch=64):
    tf = T.ToTensor()                             # 0..1, CHW
    train = torchvision.datasets.CIFAR10("./data", train=True, download=True, transform=tf)
    test = torchvision.datasets.CIFAR10("./data", train=False, download=True, transform=tf)
    return (torch.utils.data.DataLoader(train, batch_size=batch, shuffle=True),
            torch.utils.data.DataLoader(test, batch_size=256))


if __name__ == "__main__":
    train_loader, test_loader = loaders()
    net = Net()
    optimizer = torch.optim.Adam(net.parameters(), lr=1e-3)

    for epoch in range(5):
        net.train()
        total = 0.0
        for images, labels in train_loader:
            optimizer.zero_grad()
            loss = F.cross_entropy(net(images), labels)
            loss.backward()
            optimizer.step()
            total += loss.item()
        net.eval()
        correct = n = 0
        with torch.no_grad():
            for images, labels in test_loader:
                correct += (net(images).argmax(1) == labels).sum().item()
                n += len(labels)
        print(f"эпоха {epoch + 1}: loss={total / len(train_loader):.3f}  точность={correct / n:.1%}")

    dummy = torch.rand(1, 3, 32, 32)              # пример входа задаёт форму входного тензора
    torch.onnx.export(net, dummy, "cifar_net.onnx", opset_version=19,
                      input_names=["image"], output_names=["logits"])
    print("Сохранено: cifar_net.onnx — загрузите его в регистр (пример 2 или веб-интерфейс)")
