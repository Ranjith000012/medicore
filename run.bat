@echo off
title MediCore - Patient Records System
color 0B
echo.
echo  ███╗   ███╗███████╗██████╗ ██╗ ██████╗ ██████╗ ██████╗ ███████╗
echo  ████╗ ████║██╔════╝██╔══██╗██║██╔════╝██╔═══██╗██╔══██╗██╔════╝
echo  ██╔████╔██║█████╗  ██║  ██║██║██║     ██║   ██║██████╔╝█████╗
echo  ██║╚██╔╝██║██╔══╝  ██║  ██║██║██║     ██║   ██║██╔══██╗██╔══╝
echo  ██║ ╚═╝ ██║███████╗██████╔╝██║╚██████╗╚██████╔╝██║  ██║███████╗
echo  ╚═╝     ╚═╝╚══════╝╚═════╝ ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
echo.
echo  Patient Records Management System
echo  ====================================
echo.

echo [1/3] Installing Python dependencies...
cd backend
py -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: pip install failed. Make sure Python is installed.
    pause
    exit /b 1
)

echo.
echo [2/3] Starting backend server on http://localhost:5000 ...
start "MediCore Backend" py app.py

echo.
echo [3/3] Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo [4/4] Opening frontend in browser...
cd ../frontend
start index.html

echo.
echo  System is running!
echo  Backend : http://localhost:5000
echo  Frontend: Open index.html in browser
echo.
echo  Press any key to exit this window (server keeps running)
pause >nul
