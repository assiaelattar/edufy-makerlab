@echo off
echo ==========================================
echo   SparkQuest Kiosk Mode - DISABLE
echo ==========================================
echo.
echo This will configure the app for normal mode:
echo - Fullscreen: OFF
echo - Kiosk Mode: OFF
echo - Window Frame: ON
echo.
pause

cd /d "%~dp0"

echo {> electron\config.json
echo   "kioskMode": false,>> electron\config.json
echo   "fullscreen": false,>> electron\config.json
echo   "showFrame": true,>> electron\config.json
echo   "autoStart": false>> electron\config.json
echo }>> electron\config.json

echo.
echo ✅ Kiosk mode DISABLED!
echo.
echo Restart the app to apply changes.
echo.
pause
