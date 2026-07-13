@echo off
title RKQS Smart Quality Dashboard - Local Server
color 0B

echo ==========================================================
echo  RKQS Smart Quality Dashboard - Starting Local Server
echo ==========================================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
    python "%~dp0serve.py"
    goto :end
)

where python3 >nul 2>nul
if %errorlevel%==0 (
    python3 "%~dp0serve.py"
    goto :end
)

echo Python was not found on this PC.
echo.
echo This helper script needs Python to serve the dashboard to your phone
echo over WiFi. Python is free and takes about 2 minutes to install:
echo.
echo   1. Go to https://www.python.org/downloads/
echo   2. Download and run the Windows installer
echo   3. IMPORTANT: tick "Add Python to PATH" during setup
echo   4. Restart this Start_Server.bat file after installing
echo.
echo (You only need to do this once - not every time.)
echo.
pause
goto :eof

:end
pause
