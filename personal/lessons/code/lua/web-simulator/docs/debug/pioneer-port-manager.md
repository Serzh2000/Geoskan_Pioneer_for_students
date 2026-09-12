# Debug Session: pioneer-port-manager [OPEN]

## Context
- Symptom: `ARM` and `TAKEOFF` partially work, but later commands like `GO_TO_POINT` time out when multiple drones share one IP and should differ by port.
- Goal: make drone identification and routing compatible with `pioneer-python-example`, with explicit drone port support in the drone manager.

## Hypotheses
- H1: the drone manager data model does not store a stable per-drone transport key including port, so UI-side routing still collapses multiple drones into one target.
- H2: the external bridge sends port data, but command resolution in the browser still matches drones by `sessionId` or `ip` only.
- H3: command acknowledgements and state updates use a different lookup key than command dispatch, so `GO_TO_POINT` reaches the wrong drone or no drone.
- H4: compatibility code for `pioneer_python_example` omits port mapping when creating or resolving drones from simulator settings.
- H5: the simulator stores a drone port in one subsystem, but the drone manager UI model does not expose it to the command pipeline.

## Plan
1. Inspect current drone manager state/types/UI wiring for explicit port storage.
2. Trace resolution flow from Python bridge to external bridge to simulator state.
3. Apply minimal fix so drones are keyed by `connection_method + ip + mavlink_port`.
4. Verify diagnostics and run a focused reproduction if the local runtime allows it.

## Evidence
- Confirmed H1/H5 by code inspection: `DroneState.pythonConnection.mavlinkPort` exists, but `drone-manager.ts` previously created new drones via `createDroneState(...)` and never reassigned a unique port, so every manager-created drone inherited the default `8001`.
- Confirmed H2 from existing runtime context: browser and external bridges already resolve by `ip + mavlink_port + connection_method`, so duplicate manager-side ports still collapse multiple UI drones onto one transport target.
- Confirmed H4 by server/runtime inspection: local backend wrapper already passes `mavlink_port` into `Pioneer(...)`, so compatibility failure was not in the Python launcher but in the UI-side drone provisioning.
- Confirmed an additional runtime gate beyond the original hypotheses: external bridge commands did not mark the target drone as `running`, while physics/autopilot only advance autonomous flight when `running === true`.
- Confirmed an additional compatibility gap with `pioneer-python-example`: external drones did not initialize `localOriginByDrone`, so `go_to_local_point(...)` could be interpreted in world coordinates instead of the drone's local frame.

## Applied Changes
- Added debug instrumentation in `drone-manager.ts` to report which transport tuple the manager sees per drone.
- Updated the drone manager so newly added drones inherit the active drone connection profile but receive the next free `mavlinkPort`.
- Updated the drone manager list UI to show transport metadata directly (`connection_method ip:port`) and display the MAVLink port badge.
- Updated `external-bridge.ts` so mirrored external commands keep the resolved drone in `running` state during the external Python session, allowing autonomous physics to continue after `takeoff`.
- Updated `external-bridge.ts` to initialize `localOriginByDrone` on external `Pioneer.__init__`, matching browser-runtime semantics for `go_to_local_point(...)`.

## Verification
- VS Code diagnostics are clean for:
  - `public/modules/ui/managers/drone-manager.ts`
  - `public/styles/scene/swarm-and-led/manager.css`
  - `public/modules/python/external-bridge.ts`
