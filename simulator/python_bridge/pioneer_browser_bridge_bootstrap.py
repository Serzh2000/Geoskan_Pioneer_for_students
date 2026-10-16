"""Bootstrap hook for mirroring pioneer_sdk calls into the browser simulator."""

from __future__ import annotations

import builtins
import sys

_patch_in_progress = False
_patch_applied = False


def _patch_if_needed() -> None:
    global _patch_applied, _patch_in_progress
    module = sys.modules.get("pioneer_sdk")
    if module is None or _patch_in_progress or _patch_applied:
        return

    try:
        _patch_in_progress = True
        from pioneer_browser_bridge_runtime import patch_pioneer_sdk_module

        patch_pioneer_sdk_module(module)
        _patch_applied = True
    except Exception:
        # The bridge must never break a real pioneer_sdk script.
        return
    finally:
        _patch_in_progress = False


_original_import = builtins.__import__


def _bridge_import(name, globals=None, locals=None, fromlist=(), level=0):
    module = _original_import(name, globals, locals, fromlist, level)
    if name == "pioneer_sdk" or name.startswith("pioneer_sdk."):
        _patch_if_needed()
    return module


if getattr(builtins, "__pioneer_browser_bridge_import_installed__", False) is not True:
    builtins.__import__ = _bridge_import
    builtins.__pioneer_browser_bridge_import_installed__ = True

_patch_if_needed()
