from __future__ import annotations

import os
import sys
import time

from pioneer_sdk import Pioneer


def log(message: str) -> None:
    print(message, flush=True)


def main() -> int:
    log(f"python={sys.executable}")
    log(f"bridge_url={os.environ.get('PIONEER_BROWSER_BRIDGE_URL', 'default')}")
    log("creating Pioneer(...)")
    pioneer = Pioneer(ip="192.168.4.1", mavlink_port=8001)
    log("created Pioneer")

    try:
        log("calling arm()")
        pioneer.arm()
        log("arm() returned")

        log("calling takeoff()")
        pioneer.takeoff()
        log("takeoff() returned")

        log("calling go_to_local_point(z=1)")
        pioneer.go_to_local_point(x=0, y=0, z=1, yaw=0)
        log("go_to_local_point(z=1) returned")

        for index in range(10):
            reached = pioneer.point_reached()
            log(f"point_reached[{index}]={reached}")
            if reached:
                break
            time.sleep(0.1)

        log("calling land()")
        pioneer.land()
        log("land() returned")
        return 0
    except KeyboardInterrupt:
        log("KeyboardInterrupt -> land()")
        try:
            pioneer.land()
        except Exception as exc:  # pragma: no cover - debug helper
            log(f"land() during interrupt failed: {exc!r}")
        return 130
    except Exception as exc:
        log(f"exception={exc!r}")
        try:
            pioneer.land()
        except Exception as land_exc:  # pragma: no cover - debug helper
            log(f"land() after exception failed: {land_exc!r}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
