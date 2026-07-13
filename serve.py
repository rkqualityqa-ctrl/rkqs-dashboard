#!/usr/bin/env python3
"""
RKQS Smart Quality Dashboard - Local Network Server
-----------------------------------------------------
Purpose:
  This app is an offline HTML dashboard, normally opened by double-clicking
  index.html on a PC. Phones don't have an easy "double-click a local file"
  option the way a PC does, so this script serves the dashboard over your
  WiFi network instead - your phone (or any device on the same WiFi) can
  then open it in its browser using a normal http:// address.

  No internet connection is used or required - this only works over your
  local WiFi network, between devices that are already connected to it.
  No data leaves your network.

How to use:
  Windows : double-click Start_Server.bat
  Mac     : double-click Start_Server.command
  Or run directly:  python3 serve.py

Then, on your phone (connected to the SAME WiFi as this PC), open the
"On your phone" URL this script prints, in Chrome/Safari/any browser.

Press CTRL+C in this window to stop the server.
"""

import http.server
import socketserver
import socket
import os
import sys

PORT = 8000


def find_local_ip():
    """Best-effort local LAN IP detection - works without needing internet
    access; it just asks the OS which interface would be used to reach an
    external address, without actually sending any traffic."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def main():
    # Serve from the folder this script lives in, so it works regardless of
    # where the user double-clicked it from.
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    local_ip = find_local_ip()

    handler = http.server.SimpleHTTPRequestHandler

    # Try the default port, and a few fallbacks in case something else on
    # this PC is already using 8000.
    httpd = None
    port = PORT
    for attempt in range(10):
        try:
            httpd = socketserver.TCPServer(("0.0.0.0", port), handler)
            break
        except OSError:
            port += 1
    if httpd is None:
        print("Could not find a free port to start the server. Please close other")
        print("programs that might be using ports 8000-8009 and try again.")
        sys.exit(1)

    line = "=" * 58
    print(line)
    print(" RKQS Smart Quality Dashboard - Local Server")
    print(line)
    print(f" On this PC     : http://localhost:{port}")
    print(f" On your phone  : http://{local_ip}:{port}")
    print(line)
    print(" Your phone must be connected to the SAME WiFi as this PC.")
    print(" Type the 'On your phone' address into your phone's browser.")
    print()
    print(" If it doesn't load, your PC's firewall may be blocking it -")
    print(" allow access when Windows/Mac asks, or check the firewall")
    print(" settings for Python / this app.")
    print()
    print(" Press CTRL+C in this window to stop the server.")
    print(line)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()


if __name__ == "__main__":
    main()
