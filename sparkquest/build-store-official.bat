@echo off
echo ==========================================
echo   SparkQuest - Official Store Build
echo ==========================================

echo Building for Microsoft Store...
echo Identity: MakerLabIdentity.sparkquest
echo Publisher: MakerLab Academy
echo.

echo 1. Cleaning previous builds...
rd /s /q dist
rd /s /q dist-electron

echo 2. Building React App...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] React build failed!
    exit /b %errorlevel%
)

echo 3. Building Electron App (AppX for Store)...
call npm run electron:build
if %errorlevel% neq 0 (
    echo [ERROR] Electron build failed!
    exit /b %errorlevel%
)

echo ==========================================
echo   STORE PACKAGE READY!
echo ==========================================
echo Your .appx file is in: dist-electron\
echo Upload it to Partner Center to publish.
pause
