"""Serve Trap Trick locally with caching off (so edited files always reload).

    python tools/serve.py [port]      (default 8790)
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
    print(f"Trap Trick: http://127.0.0.1:{port}/")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()
