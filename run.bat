@echo off
title Town Planning Tickets - Permanent Launcher (Auto-Restart Enabled)
color 0B

echo ================================================================
echo      TOWN PLANNING & URBAN DEVELOPMENT HELPDESK SYSTEM
echo        [PERMANENT SERVER MODE - AUTO-RESTART ENABLED]
echo ================================================================
echo.

:: Get script directory
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Clean any previous stale processes on ports 5000 and 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

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
    call npm.cmd install
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
    call npm.cmd install
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

:: Start Backend server with Auto-Restart Watchdog Loop
echo [3/4] Starting Backend server on Port 5000 (with Auto-Restart Guard)...
start "Town Planning - Backend Server (Port 5000)" cmd /k "cd /d "%ROOT_DIR%backend" & :loop & node server.js & echo. & echo [WARNING] Backend stopped or crashed. Auto-restarting in 2 seconds... & timeout /t 2 /nobreak >nul & goto loop"

:: Start Frontend client with Auto-Restart Watchdog Loop
echo [4/4] Starting Frontend client on Port 3000 (with Auto-Restart Guard)...
start "Town Planning - Frontend Client (Port 3000)" cmd /k "cd /d "%ROOT_DIR%frontend" & :loop & call npm.cmd run dev -- --host 0.0.0.0 --port 3000 & echo. & echo [WARNING] Frontend stopped or crashed. Auto-restarting in 2 seconds... & timeout /t 2 /nobreak >nul & goto loop"

:: Wait 4 seconds then open browser
timeout /t 4 /nobreak >nul
echo.
echo Launching web browser at http://localhost:3000 ...
start http://localhost:3000

echo.
echo ================================================================
echo                 SYSTEM STARTED & PROTECTED!
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
echo  * Auto-Restart Protection is ACTIVE: Servers will NEVER close on
echo    errors and will automatically revive in 2 seconds!
echo  * To completely shut down the application, run stop.bat
echo ================================================================
echo.
pause
