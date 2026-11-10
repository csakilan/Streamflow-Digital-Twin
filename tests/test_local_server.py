"""Check the actual HTTP boundary using a dummy token, never the user's .env."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
import json
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from serve_local import LocalHandler


class LocalServerTests(unittest.TestCase):
    def test_configuration_is_local_only_and_hidden_files_are_not_served(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".env").write_text("CESIUM_ION_TOKEN=dummy-local-token\nCESIUM_ION_ASSET_ID=2275207\nOTHER_SECRET=do-not-expose\n")
            (root / "index.html").write_text("local app")
            (root / "alias.txt").symlink_to(root / ".env")
            for name, index in [("html-alias", "index.html"), ("htm-alias", "index.htm")]:
                (root / name).mkdir()
                (root / name / index).symlink_to(root / ".env")
            server = ThreadingHTTPServer(("127.0.0.1", 0), partial(LocalHandler, directory=directory))
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_port}"
            def get(path, headers=None):
                return urlopen(Request(base + path, headers=headers or {}), timeout=3)
            def denied(path, headers=None):
                with self.assertRaises(HTTPError) as error:
                    get(path, headers)
                self.assertIn(error.exception.code, (403, 404))
                error.exception.close()
            try:
                with get("/") as response:
                    self.assertEqual(response.read(), b"local app")
                (root / "river-twin").mkdir()
                (root / "river-twin" / "index.html").write_text("standalone river app")
                with get("/?station=14105700") as response:
                    self.assertEqual(response.read(), b"standalone river app")
                    self.assertIn("/river-twin/?station=14105700", response.url)
                for path in ["/.env", "/%2eenv", "/alias.txt", "/.git/config", "/html-alias/", "/htm-alias/"]:
                    denied(path)
                denied("/_local/imagery-config")
                denied("/_local/imagery-config", {"X-HydroTwin-Local": "1", "Origin": "https://foreign.example"})
                denied("/_local/imagery-config", {"X-HydroTwin-Local": "1", "Host": "foreign.example"})
                denied("/_local/imagery-config", {"X-HydroTwin-Local": "1", "Sec-Fetch-Site": "cross-site"})
                with get("/_local/imagery-config", {"X-HydroTwin-Local": "1", "Origin": base}) as response:
                    self.assertEqual(response.headers["Cache-Control"], "no-store")
                    config = json.load(response)
                    self.assertEqual(config["credential"], "dummy-local-token")
                    self.assertEqual(set(config), {"available", "provider", "credential", "assetId"})
                (root / ".env").unlink()
                with get("/_local/imagery-config", {"X-HydroTwin-Local": "1"}) as response:
                    self.assertEqual(json.load(response), {"available": False})
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
