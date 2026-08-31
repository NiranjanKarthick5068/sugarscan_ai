@echo off
echo Starting Uvicorn Server...
start "Uvicorn Backend" cmd /c "cd /d %~dp0backend && .\venv\Scripts\Activate.ps1 && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting Expo Server...
start "Expo Frontend" cmd /c "cd /d %~dp0mobile && npx expo start"

echo Waiting for servers to initialize...
timeout /t 10 /nobreak

echo Testing Backend Health Check...
powershell -Command "Invoke-WebRequest -Uri 'http://localhost:8000/api/v1/health-check' -Method GET | Select-Object -ExpandProperty Content"

echo.
echo Testing Registration Endpoint...
powershell -Command "$body = '{\"email\":\"test@test.com\",\"password\":\"password123\",\"full_name\":\"Test User\"}'; Invoke-WebRequest -Uri 'http://localhost:8000/api/v1/auth/register' -Method POST -Body $body -ContentType 'application/json' | Select-Object -ExpandProperty Content"

echo.
echo All processes have been started and tested. Press any key to exit this test window.
pause
