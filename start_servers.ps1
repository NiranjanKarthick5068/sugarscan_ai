Write-Host "Starting Uvicorn..."
cd "c:\Users\KRISHNAVENI\Downloads\sugar_ai_project\SugarScanAI\backend"
Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"

Write-Host "Starting Expo..."
cd "..\mobile"
Start-Process "npx.cmd" -ArgumentList "expo start"
