@echo off
title Town Planning Tickets - Launcher
color 0B

echo ================================================================
echo      TOWN PLANNING & URBAN DEVELOPMENT HELPDESK SYSTEM
echo ================================================================
echo.

:: Get script directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Detect Local IPv4 Network Address
set "LOCAL_IP=127.0.0.1"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1 delims= " %%b in ("%%a") do (
        if not "%%b"=="" set "LOCAL_IP=%%b"
    )
)

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: Check and install Backend dependencies if needed
if not exist "%ROOT_DIR%backend\node_modules" (
    echo [1/4] Installing backend dependencies...
    cd /d "%ROOT_DIR%backend"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    echo [OK] Backend dependencies installed.
    echo.
) else (
    echo [1/4] Backend dependencies ready.
)

:: Check and install Frontend dependencies if needed
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [2/4] Installing frontend dependencies...
    cd /d "%ROOT_DIR%frontend"
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed.
    echo.
) else (
    echo [2/4] Frontend dependencies ready.
)

:: Start Backend server in separate window
echo [3/4] Starting Backend server (Port 5000)...
start "Town Planning - Backend Server (Port 5000)" cmd /k "cd /d "%ROOT_DIR%backend" && node server.js"

:: Start Frontend dev server with host enabled in separate window
echo [4/4] Starting Frontend client (Port 3000)...
start "Town Planning - Frontend Client (Port 3000)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev -- --host"

:: Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
echo.
echo Launching web browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo ================================================================
echo                 SYSTEM STARTED SUCCESSFULLY!
echo ================================================================
echo.
echo  [1] LOCAL ACCESS (This Computer):
echo      - Frontend App:   http://localhost:3000
echo      - Backend API:    http://localhost:5000
echo.
echo  [2] NETWORK / LAN ACCESS (Mobile, Tablets, Other PCs on Wi-Fi):
echo      - Frontend App:   http://%LOCAL_IP%:3000
echo      - Backend API:    http://%LOCAL_IP%:5000
echo.
echo  --- DEFAULT DEMO LOGINS ---
echo  * Super Admin:    ishwarsahu1269@gmail.com   (Password: admin123)
echo  * Helpdesk:       albpms.helpdesk@gmail.com  (Password: Admin@123)
echo  * Specialist:     osu.dtcp@gmail.com         (Password: Admin@123)
echo  * Citizen User:   user@townplanning.gov.in   (Password: user123)
echo.
echo ================================================================
echo  * Share http://%LOCAL_IP%:3000 with any device on your Wi-Fi!
echo  * Run stop.bat to terminate both servers.
echo ================================================================
echo.
pause
