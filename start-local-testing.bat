@echo off
REM Quick Start Script for Local Client Testing
REM Run this to start the development server and share with clients

echo.
echo ================================================================
echo   FACEBOOK MARKETPLACE - LOCAL CLIENT TESTING
echo ================================================================
echo.

REM Get local IP
echo Getting your local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do set "IP=%%a"
set IP=%IP: =%

echo Your local IP: %IP%
echo.

REM Navigate to app directory
cd /d "c:\dev\facebook-marketplace\Facebook Marketplace App"

REM Start Expo development server
echo Starting Expo development server on port 19000...
echo Press CTRL+C to stop the server
echo.
echo Once started, clients should:
echo 1. Install "Expo Go" from Google Play Store
echo 2. Scan the QR code shown below OR
echo 3. Copy the URL exp://%IP%:19000 into Expo Go
echo.
echo Keep this window open while clients are testing!
echo ================================================================
echo.

call npx expo start --lan

pause
