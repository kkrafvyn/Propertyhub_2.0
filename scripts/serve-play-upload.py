"""Local CORS static server for Play Console asset/AAB uploads via browser fetch.

Usage:
  python scripts/serve-play-upload.py
  python scripts/serve-play-upload.py --root "C:\\Users\\ponk3\\Desktop\\play-upload-baytmiftah-workspace" --port 8766
"""

from __future__ import annotations

import argparse
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

DEFAULT_ROOT = r"C:\Users\ponk3\Desktop\play-upload-baytmiftah"
DEFAULT_PORT = 8765


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Play upload folder with CORS.")
    parser.add_argument("--root", default=DEFAULT_ROOT, help="Directory to serve")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="TCP port")
    args = parser.parse_args()
    root = os.path.abspath(args.root)
    port = args.port

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=root, **kw)

        def end_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            super().end_headers()

        def do_OPTIONS(self):
            self.send_response(204)
            self.end_headers()

    os.chdir(root)
    print(f"Serving {root} on http://127.0.0.1:{port}/", flush=True)
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
