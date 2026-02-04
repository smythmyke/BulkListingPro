@echo off
echo Uninstalling BulkListingPro Native Host...

REG DELETE "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.bulklistingpro.host" /f

if %ERRORLEVEL% EQU 0 (
    echo Native Host uninstalled successfully.
) else (
    echo Uninstall failed or host was not installed.
)

pause
