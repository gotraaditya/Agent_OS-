@echo off
title AI Team Manager
cd /d "%~dp0"

:: Check if Node is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm or Node.js was not found in your PATH.
    echo Please install Node.js 22+ before launching the app.
    pause
    exit /b 1
)

:: Build the frontend if no production bundle exists yet
if not exist "apps\web\.next\BUILD_ID" (
    echo Building AI Team Manager for first launch...
    npm run build
)

:: Launch in production mode (pre-built bundle, no recompilation)
npm start
