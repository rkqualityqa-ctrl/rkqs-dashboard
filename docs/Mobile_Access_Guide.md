# Accessing the Dashboard from a Mobile Phone

This app is an offline HTML dashboard, normally opened by double-clicking
`index.html` on a PC. Phones don't have an easy "double-click a local file"
option the way a PC does, so use the steps below to view it on a phone
instead — over your WiFi network, no internet required.

## Steps

1. Make sure your **phone and PC are connected to the same WiFi network**.
   (This will not work over mobile data, or if they're on different WiFi
   networks — they must be on the same one.)

2. On the PC, open the `RKQS-Smart-Quality-Dashboard` folder and double-click:
   - **Windows:** `Start_Server.bat`
   - **Mac:** `Start_Server.command`

3. A black/terminal window will open and show something like:

   ```
   ==========================================================
    RKQS Smart Quality Dashboard - Local Server
   ==========================================================
    On this PC     : http://localhost:8000
    On your phone  : http://192.168.1.42:8000
   ==========================================================
   ```

   The exact numbers after `http://` on the "On your phone" line will be
   different on your network — that's fine, that's your PC's address on
   your WiFi.

4. On your phone, open Chrome (or any browser) and type that
   **"On your phone"** address exactly as shown, including `http://`.

5. The dashboard should load, exactly like it does on the PC — sidebar,
   Upload Excel, charts, everything. Use the ☰ menu button (top-left) to
   open/close the sidebar on the small screen.

6. When you're done, go back to the PC and press `CTRL+C` in that black
   terminal window (or just close it) to stop the server.

## If it doesn't work

- **"This site can't be reached" on the phone** — double-check both
  devices are truly on the same WiFi (not one on WiFi and one on mobile
  data), and re-check the address was typed exactly as shown.
- **Windows Firewall popup appears** when you start the server — click
  **"Allow access"**. If you accidentally clicked "Cancel", it may keep
  blocking; you can allow it later from Windows Defender Firewall settings
  (search "Allow an app through Windows Firewall", find Python, tick both
  Private and Public).
- **"Python was not found"** — the starter script will show a link to
  install Python (free, ~2 minutes, one-time only). Make sure to tick
  "Add Python to PATH" during setup on Windows.
- **Some office/hotel WiFi networks block devices from seeing each other**
  ("client isolation") even though they're on the same network name — a
  home or personal hotspot WiFi almost always works; some corporate/guest
  WiFi networks don't allow this by design, for security reasons unrelated
  to this app.

## Notes

- This only serves the dashboard **within your own WiFi network** — it is
  not published to the internet, and no data leaves your network.
- Any Excel file you upload from your phone stays on your phone/in that
  browser tab only, same as normal (SRS 19.2) — it is not sent to the PC
  or anywhere else.
- You can also open the same "On your phone" address from a tablet, or a
  second PC on the same WiFi, the same way.
