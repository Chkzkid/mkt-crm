@echo off
echo ========================================================
echo         INICIANDO PROCRM - INTELLIGENT ENGINE
echo ========================================================

start "ProCRM Backend" cmd /k "cd server && node index.js"
start "ProCRM Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Los servicios se estan ejecutando:
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo.
pause
