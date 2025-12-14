@echo off
echo Stopping existing Vite processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm*sparkquest*" 2>nul
timeout /t 2 /nobreak >nul

echo Starting SparkQuest dev server...
cd /d "%~dp0"
npm run dev
