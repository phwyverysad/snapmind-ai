@echo off
cd /d "%~dp0"
set "PATH=D:\Program Files\nodejs;D:\Program Files\Git\cmd;%PATH%"
echo Starting Application...
npm start
pause