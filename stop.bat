@echo off
title Town Planning Tickets - Shutdown
color 0C

echo ================================================================
echo       STOPPING TOWN PLANNING & HELPDESK SERVERS...
echo ================================================================
echo.

:: Kill processes on port 5000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo Stopping backend process PID: %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 3000 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Stopping frontend process PID: %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] All servers stopped successfully.
echo.
pause
