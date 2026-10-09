@echo off
title Allow Town Planning Firewall Access
color 0A

:: Check and request Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Requesting Administrator privileges to open firewall ports...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ================================================================
echo       OPENING FIREWALL PORTS FOR NETWORK ACCESS
echo ================================================================
echo.

:: Remove previous rule if exists
netsh advfirewall firewall delete rule name="Town Planning Web & API (3000, 5000)" >nul 2>&1

:: Add Inbound TCP rule for Ports 3000 and 5000
netsh advfirewall firewall add rule name="Town Planning Web & API (3000, 5000)" dir=in action=allow protocol=TCP localport=3000,5000 profile=any

echo.
echo ================================================================
echo [SUCCESS] Ports 3000 and 5000 have been opened in Windows Firewall!
echo Now other laptops, mobiles, and tablets on your Wi-Fi can access:
echo http://192.168.1.111:3000
echo ================================================================
echo.
pause
