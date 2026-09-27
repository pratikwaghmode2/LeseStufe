@echo off
setlocal

cd /d "%~dp0"
title LeseStufe AI - German Graded Reader
echo ================================================================
echo          Starting LeseStufe AI (German Level Reader)
echo ================================================================
echo.

set "PY_CMD=python"
if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" set "PY_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
if exist "%LOCALAPPDATA%\Python\bin\python.exe" set "PY_CMD=%LOCALAPPDATA%\Python\bin\python.exe"

echo [OK] Using Python: %PY_CMD%
echo [OK] Project directory: %CD%
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo Launching application at: http://localhost:8000 ...
echo (Opening your browser automatically...)
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"
"%PY_CMD%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
