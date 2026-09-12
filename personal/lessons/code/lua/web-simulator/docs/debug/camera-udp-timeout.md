[OPEN] Camera UDP Timeout

- Session ID: `camera-udp-timeout`
- Symptom: `pioneer_sdk.Camera.connect()` succeeds, but `camera.get_cv_frame()` fails with `socket.timeout: timed out` on `udp.recvfrom()`.
- Scope: external Python `pioneer_sdk` camera path through simulator bridge.

## Hypotheses

1. TCP camera handshake succeeds, but `CameraTcpBridge.flushFrame()` never finds an active browser state for the camera session, so no UDP datagrams are sent.
2. Browser state is updated, but `cameraConnected` remains `false` or `cameraFrameDataUrl` remains `null`, so the server intentionally skips sending frames.
3. Frames are produced in the browser, but the server sends them to the wrong UDP endpoint because the TCP-derived remote port/address is not the same endpoint that `pioneer_sdk.Camera` binds for UDP.
4. UDP datagrams are sent, but the payload is empty/invalid for the current camera bridge path, so `pioneer_sdk.Camera.get_frame()` never sees a usable JPEG packet.
5. The browser-side camera sync loop does not create/update the `camera`-typed external bridge state quickly enough before the first Python read times out.

## Plan

1. Start debug server and capture runtime evidence.
2. Instrument server camera bridge and browser external bridge state sync.
3. Reproduce the Python camera timeout and collect pre-fix logs.
4. Confirm or reject hypotheses from logs before changing logic.
