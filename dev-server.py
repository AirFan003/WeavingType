#!/usr/bin/env python3
"""Local dev server with no-cache headers so browsers always pick up latest JS/CSS."""

import http.server
import socketserver

PORT = 3000
HOST = "127.0.0.1"


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), DevHandler) as httpd:
        print(f"Weaving Type dev server: http://{HOST}:{PORT}/")
        print("Use http://127.0.0.1 (not file://). Keep this terminal open.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
