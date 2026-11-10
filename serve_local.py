"""Loopback-only HydroTwin server with private local imagery configuration."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from urllib.parse import urlsplit


class LocalHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Request URLs and credentials never belong in server logs.

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def local_host(self):
        port = self.server.server_port
        return self.headers.get("Host", "") in {f"127.0.0.1:{port}", f"localhost:{port}"}

    def do_GET(self):
        if not self.local_host():
            self.send_error(403)
            return
        if urlsplit(self.path).path == "/_local/imagery-config":
            origin = self.headers.get("Origin")
            if (self.headers.get("X-HydroTwin-Local") != "1"
                    or origin not in (None, f"http://{self.headers['Host']}")
                    or self.headers.get("Sec-Fetch-Site", "same-origin") not in ("same-origin", "none")):
                self.send_error(403)
                return
            values = {}
            try:
                for line in (Path(self.directory) / ".env").read_text().splitlines():
                    key, sep, value = line.partition("=")
                    if sep and key.strip() in ("CESIUM_ION_TOKEN", "CESIUM_ION_ASSET_ID"):
                        values[key.strip()] = value.strip().strip("\"'")
            except OSError:
                pass
            token = values.get("CESIUM_ION_TOKEN", "")
            payload = {"available": False}
            if token:
                payload = {"available": True, "provider": "ion", "credential": token,
                           "assetId": values.get("CESIUM_ION_ASSET_ID", "2275207")}
            data = json.dumps(payload).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def send_head(self):
        try:
            root = Path(self.directory).resolve()
            target = Path(self.translate_path(self.path)).resolve()
            targets = [target]
            if target.is_dir():
                targets.extend(target / name for name in ("index.html", "index.htm"))
            for candidate in targets:
                relative = candidate.resolve().relative_to(root)
                if not self.local_host() or any(part.startswith(".") for part in relative.parts):
                    raise ValueError("Private path")
        except (OSError, ValueError):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, _path):
        self.send_error(404)  # Do not enumerate local configuration or repository files.
        return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8783)
    args = parser.parse_args()
    handler = partial(LocalHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"HydroTwin local viewer: http://127.0.0.1:{args.port}/photorealistic-vr/", flush=True)
        server.serve_forever()
