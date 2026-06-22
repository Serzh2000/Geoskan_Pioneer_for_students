from __future__ import annotations

import site
from pathlib import Path


USER_SITE = Path(site.getusersitepackages())
FILES = [
    USER_SITE / "pioneer_browser_bridge.pth",
    USER_SITE / "pioneer_browser_bridge_bootstrap.py",
    USER_SITE / "pioneer_browser_bridge_runtime.py",
]


def uninstall() -> None:
    for file_path in FILES:
        if file_path.exists():
            file_path.unlink()
            print(f"Removed: {file_path}")
        else:
            print(f"Not found: {file_path}")

    print("Pioneer browser bridge uninstalled.")


if __name__ == "__main__":
    uninstall()
