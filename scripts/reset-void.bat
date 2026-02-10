@echo off
setlocal enabledelayedexpansion

title Reset Octatecode - Data Cleanup

echo.
echo ============================================
echo  Octatecode Data Reset - Clean All Folders
echo ============================================
echo.

:: Delete main code-oss-dev folder (Roaming) - contains logs, settings, backups
echo [1/5] Clearing code-oss-dev data (Roaming)...

if exist "%APPDATA%\code-oss-dev" (
    rmdir /s /q "%APPDATA%\code-oss-dev" 2>nul
    echo     OK: Deleted code-oss-dev
) else (
    echo     - code-oss-dev (Roaming) not found
)

:: Delete Octatecode branded folders (older naming)
echo.
echo [2/5] Clearing Octatecode branded folders...

if exist "%APPDATA%\.octatecode-editor" (
    rmdir /s /q "%APPDATA%\.octatecode-editor" 2>nul
    echo     OK: Deleted .octatecode-editor
) else (
    echo     - .octatecode-editor not found
)

if exist "%APPDATA%\.octatecode-editor-dev" (
    rmdir /s /q "%APPDATA%\.octatecode-editor-dev" 2>nul
    echo     OK: Deleted .octatecode-editor-dev
) else (
    echo     - .octatecode-editor-dev not found
)

if exist "%APPDATA%\Octatecode" (
    rmdir /s /q "%APPDATA%\Octatecode" 2>nul
    echo     OK: Deleted Octatecode (Roaming)
) else (
    echo     - Octatecode (Roaming) not found
)

if exist "%APPDATA%\Code - OSS Dev" (
    rmdir /s /q "%APPDATA%\Code - OSS Dev" 2>nul
    echo     OK: Deleted Code - OSS Dev (Roaming)
) else (
    echo     - Code - OSS Dev (Roaming) not found
)

:: Delete LocalAppData folders (cache)
echo.
echo [3/5] Clearing cache folders (LocalAppData)...

if exist "%LOCALAPPDATA%\code-oss-dev" (
    rmdir /s /q "%LOCALAPPDATA%\code-oss-dev" 2>nul
    echo     OK: Deleted code-oss-dev (Local)
) else (
    echo     - code-oss-dev (Local) not found
)

if exist "%LOCALAPPDATA%\Octatecode" (
    rmdir /s /q "%LOCALAPPDATA%\Octatecode" 2>nul
    echo     OK: Deleted Octatecode (Local)
) else (
    echo     - Octatecode (Local) not found
)

if exist "%LOCALAPPDATA%\Code - OSS Dev" (
    rmdir /s /q "%LOCALAPPDATA%\Code - OSS Dev" 2>nul
    echo     OK: Deleted Code - OSS Dev (Local)
) else (
    echo     - Code - OSS Dev (Local) not found
)

:: Delete temp folders
echo.
echo [4/5] Clearing temp and crash folders...

for /d %%D in ("%TEMP%\octatecode*") do rmdir /s /q "%%D" 2>nul
for /d %%D in ("%TEMP%\code*") do rmdir /s /q "%%D" 2>nul

echo     OK: Cleaned temp files

:: Delete Cache and CachedData folders
echo.
echo [5/5] Clearing browser cache and stored data...

if exist "%LOCALAPPDATA%\code-oss-dev\Cache" (
    rmdir /s /q "%LOCALAPPDATA%\code-oss-dev\Cache" 2>nul
    echo     OK: Deleted Cache
)

if exist "%LOCALAPPDATA%\code-oss-dev\CachedData" (
    rmdir /s /q "%LOCALAPPDATA%\code-oss-dev\CachedData" 2>nul
    echo     OK: Deleted CachedData
)

if exist "%LOCALAPPDATA%\code-oss-dev\Code Cache" (
    rmdir /s /q "%LOCALAPPDATA%\code-oss-dev\Code Cache" 2>nul
    echo     OK: Deleted Code Cache
)

echo.
echo ============================================
echo  Reset Complete - Clean Slate Achieved
echo ============================================
echo.
echo Onboarding will show on next launch because:
echo   - logs folder is deleted
echo   - User settings are deleted
echo.
echo Next steps:
echo   1. npm run watch-clientd (Terminal 1)
echo   2. npm run watchreactd (Terminal 2)
echo   3. npm run watch-extensionsd (Terminal 3)
echo   4. .\scripts\code.bat (Terminal 4)
echo.

endlocal
