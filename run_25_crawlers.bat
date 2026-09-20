@echo off
cd /d D:\karm\repordar
for /f "usebackq tokens=1,* delims==" %%a in (".env") do if "%%a"=="GITHUB_TOKEN" set GT=%%b
set GITHUB_TOKEN=%GT%

echo Launching 25 parallel crawler processes...
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_01.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_02.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_03.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_04.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_05.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_06.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_07.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_08.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_09.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_10.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_11.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_12.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_13.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_14.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_15.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_16.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_17.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_18.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_19.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_20.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_21.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_22.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_23.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_24.txt --gate --loop > nul 2>&1
start /b D:\karm\repordar\.venv\Scripts\python.exe crawler\crawler.py --seeds-file crawler\seeds_chunk_25.txt --gate --loop > nul 2>&1
echo 25 Parallel Crawlers launched successfully.
