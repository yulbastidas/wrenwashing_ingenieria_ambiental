@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js 22 o superior y vuelve a intentarlo.
  pause
  exit /b 1
)
powershell -NoProfile -Command "$u='http://localhost:3000/'; function Ready { try { return ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $u).Content -match '<title>EcoLupa') } catch { return $false } }; if (-not (Ready)) { $p=Start-Process -FilePath node -ArgumentList 'server.mjs' -WindowStyle Hidden -PassThru; for ($i=0; $i -lt 20 -and -not (Ready) -and -not $p.HasExited; $i++) { Start-Sleep -Milliseconds 200 }; if (-not (Ready)) { Write-Host 'EcoLupa no pudo iniciar. Revisa si el puerto 3000 esta ocupado o ejecuta npm start para ver el error.'; exit 1 } }; Start-Process $u"
if errorlevel 1 pause
