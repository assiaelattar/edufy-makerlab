@echo off
echo ==========================================
echo   SparkQuest Kiosk Mode - ENABLE
echo ==========================================
echo.
echo This will configure the app for kiosk mode:
echo - Fullscreen: ON
echo - Kiosk Mode: ON (no exit, no frame)
echo - Window Frame: OFF (automatic)
echo.
pause

cd /d "%~dp0"

echo {> electron\config.json
echo   "kioskMode": true,>> electron\config.json
echo   "fullscreen": true,>> electron\config.json
echo   "showFrame": false,>> electron\config.json
echo   "autoStart": false>> electron\config.json
echo }>> electron\config.json

echo.
echo ✅ Kiosk mode ENABLED!
echo.
echo Restart the app to apply changes.
echo.
pause
