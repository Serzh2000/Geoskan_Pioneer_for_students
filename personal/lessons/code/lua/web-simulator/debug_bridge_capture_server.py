from __future__ import annotations

import json
from urllib.parse import parse_qs, urlparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


STATE_POLLS: dict[str, int] = {}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        text = raw.decode("utf-8", errors="replace")
        print(f"POST {self.path}", flush=True)
        print(text, flush=True)
        try:
            payload = json.loads(text)
            print(f"method={payload.get('method')} sessionId={payload.get('sessionId')}", flush=True)
        except json.JSONDecodeError:
            print("invalid-json", flush=True)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/external-python-bridge/state":
            self.send_response(404)
            self.end_headers()
            return

        query = parse_qs(parsed.query)
        session_id = (query.get("sessionId") or [""])[0]
        drone_ip = (query.get("droneIp") or [""])[0]
        mavlink_port = (query.get("mavlinkPort") or ["8001"])[0]
        connection_method = (query.get("connectionMethod") or ["udpout"])[0]
        key = f"{session_id}::{drone_ip}::{mavlink_port}::{connection_method}"
        STATE_POLLS[key] = STATE_POLLS.get(key, 0) + 1
        point_reached = STATE_POLLS[key] >= 3
        print(f"GET {parsed.path} -> pointReached={point_reached} key={key}", flush=True)

        body = json.dumps({
            "ok": True,
            "pointReached": point_reached,
            "droneId": "mock_drone",
            "updatedAt": "mock"
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 3001), Handler)
    print("Listening on http://127.0.0.1:3001", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
