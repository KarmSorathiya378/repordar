@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   RepoRadar — one-click launch
echo ============================================
echo.

REM ---- 0. Kill any stale RepoRadar servers on port 8123 ----
echo [0/4] Checking for stale servers...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8123 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul

REM ---- 1. Python check ----
where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python not found on PATH. Install Python 3.11+ first.
  pause
  exit /b 1
)

REM ---- 2. Virtualenv ----
if not exist ".venv\Scripts\python.exe" (
  echo [1/4] Creating virtualenv...
  python -m venv .venv
  if errorlevel 1 ( echo [X] venv failed & pause & exit /b 1 )
) else (
  echo [1/4] Virtualenv ready
)

set "PY=.venv\Scripts\python.exe"

REM ---- 3. Dependencies ----
"%PY%" -c "import fastembed, numpy, groq" >nul 2>nul
if errorlevel 1 (
  echo [2/4] Installing dependencies (first run, ~2 min)...
  "%PY%" -m pip install --quiet fastembed groq numpy
  if errorlevel 1 ( echo [X] pip install failed & pause & exit /b 1 )
) else (
  echo [2/4] Dependencies ready
)

REM ---- 4. Vectors (rebuild only if repos.jsonl is newer than vectors) ----
if not exist "crawler\data\vectors.npy" (
  echo [3/4] Building semantic vectors (one-time, ~10 min)...
  set "PYTHONPATH="
  "%PY%" embed.py build
  if errorlevel 1 ( echo [X] vector build failed & pause & exit /b 1 )
) else (
  for %%R in (crawler\data\repos.jsonl) do for %%V in (crawler\data\vectors.npy) do (
    if "%%~tR" GTR "%%~tV" (
      echo [3/4] New repos detected — rebuilding vectors (~10 min)...
      set "PYTHONPATH="
      "%PY%" embed.py build
      if errorlevel 1 ( echo [X] vector build failed & pause & exit /b 1 )
    ) else (
      echo [3/4] Vectors up to date
    )
  )
)

REM ---- 5. Launch server ----
echo [4/4] Starting server...
start "" http://localhost:8123
set "PYTHONPATH="
"%PY%" server.py --port 8123
pause
