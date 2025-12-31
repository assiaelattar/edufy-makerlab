@echo off
echo ==========================================
echo   SparkQuest Study - Portable Build (Zip)
echo ==========================================

echo 1. Cleaning previous builds...
rd /s /q dist
rd /s /q dist-electron

echo 2. Building React App...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] React build failed!
    exit /b %errorlevel%
)

echo 3. Building Electron App (Portable Zip)...
call npm run electron:build
if %errorlevel% neq 0 (
    echo [ERROR] Electron build failed!
    exit /b %errorlevel%
)

echo ==========================================
echo   BUILD SUCCESSFUL!
echo ==========================================
echo Your portable app is ready in: dist-electron\
pause
