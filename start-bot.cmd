@echo off
setlocal
cd /d "%~dp0"

:restart
node index.js
set "EXIT_CODE=%ERRORLEVEL%"
echo Bot stopped with exit code %EXIT_CODE%. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto restart
