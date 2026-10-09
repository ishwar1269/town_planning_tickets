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
    echo [1/4] Backend dependencies already installed.
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
    echo [2/4] Frontend dependencies already installed.
)

:: Start Backend server in separate window
echo [3/4] Starting Backend server (Port 5000)...
start "Town Planning - Backend Server (Port 5000)" cmd /k "cd /d "%ROOT_DIR%backend" && node server.js"

:: Start Frontend dev server in separate window
echo [4/4] Starting Frontend client (Port 3000)...
start "Town Planning - Frontend Client (Port 3000)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

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
echo  * Frontend:  http://localhost:3000
echo  * Backend:   http://localhost:5000
echo.
echo  --- DEFAULT DEMO LOGINS ---
echo  * Super Admin:    ishwarsahu1269@gmail.com   (Password: admin123)
echo  * Helpdesk:       albpms.helpdesk@gmail.com  (Password: Admin@123)
echo  * Specialist:     osu.dtcp@gmail.com         (Password: Admin@123)
echo  * Citizen User:   user@townplanning.gov.in   (Password: user123)
echo.
echo ================================================================
echo  To shut down both servers, you can close their separate command
echo  windows or press any key in this window to exit.
echo ================================================================
echo.
pause
