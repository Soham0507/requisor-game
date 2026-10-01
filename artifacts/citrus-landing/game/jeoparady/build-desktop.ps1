# Builds the offline desktop app: production frontend bundle + a PyInstaller
# folder build wrapping the FastAPI backend and pywebview.
#
# Output: backend\dist\DontJeopardizeThis\DontJeopardizeThis.exe (plus its
# support files in that same folder). Zip the whole folder (plus run.bat) to
# distribute it - nothing else (no Python, no Node) is required on the
# machine that runs it.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "==> Building frontend (npm run build)" -ForegroundColor Cyan
Push-Location "$root\frontend"
npm run build
Pop-Location

Write-Host "==> Installing desktop-only dependencies (pywebview, PyInstaller)" -ForegroundColor Cyan
& "$root\backend\venv\Scripts\python.exe" -m pip install --quiet -r "$root\backend\requirements-desktop.txt"
& "$root\backend\venv\Scripts\python.exe" -m pip install --quiet pyinstaller

Write-Host "==> Building desktop exe (PyInstaller)" -ForegroundColor Cyan
Push-Location "$root\backend"
& ".\venv\Scripts\pyinstaller.exe" `
    -y `
    --name "DontJeopardizeThis" `
    --onedir `
    --noconsole `
    --add-data "..\frontend\dist;frontend\dist" `
    --collect-all webview `
    app\desktop.py
Pop-Location

Copy-Item "$root\run.bat" "$root\backend\dist\DontJeopardizeThis\" -Force

Write-Host ""
Write-Host "Done. Output: backend\dist\DontJeopardizeThis\" -ForegroundColor Green
Write-Host "Run run.bat inside that folder to launch it." -ForegroundColor Green
