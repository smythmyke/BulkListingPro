@echo off
echo Installing BulkListingPro Native Host...

:: Get the directory of this script
set "SCRIPT_DIR=%~dp0"
set "MANIFEST_PATH=%SCRIPT_DIR%com.bulklistingpro.host.json"

:: Update the manifest with the correct path
echo Configuring manifest...

:: Create registry key for Chrome
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.bulklistingpro.host" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Native Host installed successfully!
    echo.
    echo Next steps:
    echo 1. Install dependencies: cd native-host ^&^& npm install
    echo 2. Launch Chrome with: chrome.exe --remote-debugging-port=9222
    echo 3. Log into Etsy in Chrome
    echo 4. Use the BulkListingPro extension
) else (
    echo.
    echo Installation failed. Please run as Administrator.
)

pause
