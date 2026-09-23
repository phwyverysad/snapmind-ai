@echo off
setlocal enabledelayedexpansion

echo [Build] Setting up MSVC environment...
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 (
    echo [Error] Failed to initialize MSVC 64-bit environment.
    exit /b 1
)

cd /d "%~dp0"
echo [Build] Compiling NativeScreenCapture.dll...
cl.exe /O2 /MD /std:c++17 /utf-8 /LD /Fe:NativeScreenCapture.dll native_capture.cpp user32.lib gdi32.lib gdiplus.lib ole32.lib shell32.lib
if errorlevel 1 (
    echo [Error] Compilation failed!
    exit /b 1
)

echo [Build] Copying NativeScreenCapture.dll to project root...
copy /Y NativeScreenCapture.dll ..\NativeScreenCapture.dll

echo [Build] Success! NativeScreenCapture.dll is ready.
exit /b 0
