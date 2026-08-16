@echo off
REM Detached RepoRadar crawler launcher - topic-based sweeps with quality gate.
REM Each pass re-scans topic seeds; seen_ids() dedup skips already-saved repos.
REM Kill via kill_crawler.ps1.
cd /d D:\karm\repordar
for /f "usebackq tokens=1,* delims==" %%a in (".env") do if "%%a"=="GITHUB_TOKEN" set GT=%%b
set GITHUB_TOKEN=%GT%
set PYTHONPATH=
:pass
D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_sweep.txt --limit 200 --gate >> crawl.log 2>&1
timeout /t 30 /nobreak >nul
goto pass