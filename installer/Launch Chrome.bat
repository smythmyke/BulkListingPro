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

:: Launch Chrome with debug flag
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

echo Chrome launched with BulkListingPro support.
timeout /t 2 >nul
