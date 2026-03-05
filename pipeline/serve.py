#!/usr/bin/env python3
"""Local dev server for viewer.html — avoids CORS errors from file:// protocol.

Handles:
  GET  /feedback/{form_id}  — serve data/feedback/{form_id}.json (or {} if absent)
  POST /feedback/{form_id}  — merge-write feedback JSON; create dir if needed
  All other requests         — static file serving (existing behaviour)
"""
import http.server
import json
import mimetypes
import os
from pathlib import Path
import webbrowser
import threading

PORT = 8000
FEEDBACK_DIR = str((Path(__file__).parent / "../data/feedback").resolve())
# Regulation data lives in the shared data dir, not in pipeline/runs/
_REG_DATA_DIR = str((Path(__file__).parent / "../data/regulations/aml-ctf-rules").resolve())


class ComplianceHandler(http.server.SimpleHTTPRequestHandler):
    """Extends SimpleHTTPRequestHandler with /feedback/ read-write endpoints."""

    def log_message(self, format, *args):
        pass  # Suppress noisy access logs

    def _feedback_path(self, form_id: str) -> str:
        # Sanitise form_id: allow only alphanumerics and hyphens
        safe = "".join(c for c in form_id if c.isalnum() or c == "-")
        return os.path.join(FEEDBACK_DIR, f"{safe}.json")

    def _remap_path(self, url_path: str):
        """Return an absolute filesystem path for paths that have moved to the
        shared data directory, or None if no remapping applies."""
        # viewer.html fetches process files from runs/1/processes/
        # but architect.py now writes them to the shared data dir
        if url_path.startswith("/runs/1/processes/"):
            filename = url_path[len("/runs/1/processes/"):]
            safe = "".join(c for c in filename if c.isalnum() or c in "-_.")
            return os.path.join(_REG_DATA_DIR, "processes", safe)
        # viewer.html fetches the regulation introduction from data/introduction.json
        if url_path == "/data/introduction.json":
            return os.path.join(_REG_DATA_DIR, "introduction.json")
        return None

    def _serve_file(self, path: str):
        """Send a file by absolute path (200) or a 404 if it doesn't exist."""
        if not os.path.exists(path):
            self.send_response(404)
            self.end_headers()
            return
        with open(path, "rb") as f:
            data = f.read()
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        remapped = self._remap_path(self.path)
        if remapped is not None:
            self._serve_file(remapped)
            return
        if self.path.startswith("/feedback/"):
            form_id = self.path[len("/feedback/"):]
            path = self._feedback_path(form_id)
            if os.path.exists(path):
                with open(path, "rb") as f:
                    data = f.read()
            else:
                data = b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_GET()

    def do_HEAD(self):
        remapped = self._remap_path(self.path)
        if remapped is not None:
            exists = os.path.exists(remapped)
            self.send_response(200 if exists else 404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        if self.path.startswith("/feedback/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
        else:
            super().do_HEAD()

    def do_POST(self):
        if not self.path.startswith("/feedback/"):
            self.send_response(405)
            self.end_headers()
            return

        form_id = self.path[len("/feedback/"):]
        path = self._feedback_path(form_id)

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            incoming = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        # Merge with existing file so concurrent edits to different controls don't clobber
        existing = {}
        if os.path.exists(path):
            try:
                with open(path) as f:
                    existing = json.load(f)
            except Exception:
                existing = {}

        merged = {**existing, **incoming}
        if "control_notes" in existing and "control_notes" in incoming:
            merged["control_notes"] = {**existing["control_notes"], **incoming["control_notes"]}

        os.makedirs(FEEDBACK_DIR, exist_ok=True)
        with open(path, "w") as f:
            json.dump(merged, f, indent=2)

        response = b'{"ok": true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)


class ReusableServer(http.server.HTTPServer):
    allow_reuse_address = True


def open_browser():
    webbrowser.open(f"http://localhost:{PORT}/viewer.html")


if __name__ == "__main__":
    threading.Timer(0.5, open_browser).start()
    print(f"Serving at http://localhost:{PORT}/viewer.html  (Ctrl+C to stop)")
    ReusableServer(("", PORT), ComplianceHandler).serve_forever()
