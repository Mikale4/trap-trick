@echo off
rem Starts the local server for Trap Trick and opens the game in your browser.
rem Keep this window open while you play; close it to stop the server.
cd /d "%~dp0"
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://127.0.0.1:8790/"
python tools\serve.py 8790
