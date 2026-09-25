"""
Local HTTP Server for Gemini Nano Real-Time Translator
Serves the web application on http://localhost:3000
"""

import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"============================================================")
        print(f" Real-Time Voice Translator (Gemini Nano) ")
        print(f" Servidor iniciado en: http://localhost:{PORT}")
        print(f" Abre esa URL en Chrome para probar con microfono y Gemini Nano")
        print(f" Presiona Ctrl+C para detener el servidor")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")

if __name__ == '__main__':
    run_server()
