@echo off
:: Launch Chrome with remote debugging enabled for BulkListingPro

:: Check if Chrome is running
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Chrome is already running!
    echo.
    echo Please close ALL Chrome windows first, then try again.
    echo.
    pause
    exit /b 1
)

:: Create profile directory if needed
if not exist "%LOCALAPPDATA%\BulkListingPro\ChromeProfile" mkdir "%LOCALAPPDATA%\BulkListingPro\ChromeProfile"

:: Launch Chrome with debug flag and dedicated profile (required by Chrome 139+)
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-allow-origins=* "--user-data-dir=%LOCALAPPDATA%\BulkListingPro\ChromeProfile"

echo Chrome launched with BulkListingPro support.
timeout /t 2 >nul
