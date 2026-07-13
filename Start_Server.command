#!/bin/bash
# RKQS Smart Quality Dashboard - Local Server (Mac)
# Double-click this file (or run it from Terminal) to start the server.

cd "$(dirname "$0")"

echo "=========================================================="
echo " RKQS Smart Quality Dashboard - Starting Local Server"
echo "=========================================================="
echo ""

if command -v python3 &>/dev/null; then
    python3 serve.py
elif command -v python &>/dev/null; then
    python serve.py
else
    echo "Python was not found on this Mac."
    echo ""
    echo "This helper script needs Python to serve the dashboard to your"
    echo "phone over WiFi. Most Macs already have it - if not:"
    echo ""
    echo "  1. Go to https://www.python.org/downloads/"
    echo "  2. Download and run the macOS installer"
    echo "  3. Restart this Start_Server.command file after installing"
    echo ""
    read -p "Press Enter to close..."
fi
