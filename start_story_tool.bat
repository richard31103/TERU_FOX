@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "PORT=8080"
set "PY_CMD="
set "NODE_CMD="

where node >nul 2>nul
if not errorlevel 1 (
    node --version >nul 2>nul
    if not errorlevel 1 set "NODE_CMD=node"
)

where py >nul 2>nul
if not errorlevel 1 (
    py --version >nul 2>nul
    if not errorlevel 1 set "PY_CMD=py"
)
if not defined PY_CMD (
    where python >nul 2>nul
    if not errorlevel 1 (
        python --version >nul 2>nul
        if not errorlevel 1 set "PY_CMD=python"
    )
)

if not defined PY_CMD if not defined NODE_CMD (
    echo [ERROR] No runtime found.
    echo Need Python or Node.js to start local server.
    echo Install one of them, then run this file again.
    echo.
    pause
    exit /b 1
)

if defined NODE_CMD (
    echo Using Node.js: %NODE_CMD%
    set "RUN_WITH=node"
) else (
    echo Using Python: %PY_CMD%
    set "RUN_WITH=python"
)
echo Starting local server: http://localhost:%PORT%/
echo.
start "" "http://localhost:%PORT%/tools/story-flow.html"
echo Tried opening the tool page.
echo If browser does not open, go to:
echo http://localhost:%PORT%/tools/story-flow.html
echo.
echo Server running... Press Ctrl+C to stop.
echo.

if /i "%RUN_WITH%"=="node" (
    %NODE_CMD% tools\local_server.js %PORT%
) else (
    %PY_CMD% -m http.server %PORT%
)
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo [ERROR] Server exited with code: %EXIT_CODE%
    echo Common reasons: port 8080 already in use, or python runtime error.
)
echo.
pause
endlocal
