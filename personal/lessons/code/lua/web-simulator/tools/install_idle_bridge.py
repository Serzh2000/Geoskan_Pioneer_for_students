from __future__ import annotations

import shutil
import site
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BRIDGE_DIR = ROOT / "python_bridge"
USER_SITE = Path(site.getusersitepackages())
PTH_FILE = USER_SITE / "pioneer_browser_bridge.pth"
BOOTSTRAP_MODULE = BRIDGE_DIR / "pioneer_browser_bridge_bootstrap.py"
RUNTIME_MODULE = BRIDGE_DIR / "pioneer_browser_bridge_runtime.py"


def install() -> None:
    USER_SITE.mkdir(parents=True, exist_ok=True)
    shutil.copy2(BOOTSTRAP_MODULE, USER_SITE / BOOTSTRAP_MODULE.name)
    shutil.copy2(RUNTIME_MODULE, USER_SITE / RUNTIME_MODULE.name)
    PTH_FILE.write_text("import pioneer_browser_bridge_bootstrap\n", encoding="utf-8")

    print("Pioneer browser bridge installed.")
    print(f"User site-packages: {USER_SITE}")
    print("Restart Python IDLE after installation.")


if __name__ == "__main__":
    install()
