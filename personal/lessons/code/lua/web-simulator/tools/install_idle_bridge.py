from __future__ import annotations

import shutil
import site
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BRIDGE_DIR = ROOT / "python_bridge"
USER_SITE = Path(site.getusersitepackages())
PTH_FILE = USER_SITE / "pioneer_browser_bridge.pth"
BOOTSTRAP_MODULE = BRIDGE_DIR / "pioneer_browser_bridge_bootstrap.py"
RUNTIME_MODULE = BRIDGE_DIR / "pioneer_browser_bridge_runtime.py"


def check_pioneer_sdk() -> None:
    try:
        subprocess.run(
            [sys.executable, "-c", "import pioneer_sdk"],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as error:
        details = error.stderr.strip() or error.stdout.strip()
        message = "pioneer_sdk не установлен для текущего Python. Установите pioneer_sdk и повторите запуск."
        if details:
            message = f"{message}\n{details}"
        raise SystemExit(message) from error


def verify_installation() -> None:
    subprocess.run(
        [
            sys.executable,
            "-c",
            "import pioneer_sdk; print(f'patched={getattr(pioneer_sdk, \"__pioneer_browser_bridge_patched__\", False)}'); print(f'camera_patched={getattr(pioneer_sdk, \"__pioneer_browser_bridge_camera_patched__\", False)}')",
        ],
        check=True,
    )


def install() -> None:
    check_pioneer_sdk()
    USER_SITE.mkdir(parents=True, exist_ok=True)
    shutil.copy2(BOOTSTRAP_MODULE, USER_SITE / BOOTSTRAP_MODULE.name)
    shutil.copy2(RUNTIME_MODULE, USER_SITE / RUNTIME_MODULE.name)
    PTH_FILE.write_text("import pioneer_browser_bridge_bootstrap\n", encoding="utf-8")

    print("Pioneer browser bridge installed.")
    print(f"User site-packages: {USER_SITE}")
    verify_installation()
    print("Restart Python IDLE after installation.")


if __name__ == "__main__":
    install()
