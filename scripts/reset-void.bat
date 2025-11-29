@echo off
setlocal

title Reset OctateCode IDE

echo Resetting OctateCode IDE to initial state...
echo.

:: Delete compiled output
echo Clearing compiled output...
if exist "out" (
    rmdir /s /q "out"
    echo Deleted out directory
)

if exist ".build" (
    rmdir /s /q ".build"
    echo Deleted .build directory
)

if exist "build\.build" (
    rmdir /s /q "build\.build"
    echo Deleted build\.build directory
)

:: Delete user data and settings
echo Clearing user data...
if exist "%USERPROFILE%\.void-editor-dev" (
    rmdir /s /q "%USERPROFILE%\.void-editor-dev"
    echo Deleted .void-editor-dev
)

if exist "%USERPROFILE%\.vscode-oss-dev" (
    rmdir /s /q "%USERPROFILE%\.vscode-oss-dev"
    echo Deleted .vscode-oss-dev
)

:: Delete AppData
if exist "%APPDATA%\Code - OSS" (
    rmdir /s /q "%APPDATA%\Code - OSS"
    echo Deleted AppData\Code - OSS
)

if exist "%APPDATA%\Void" (
    rmdir /s /q "%APPDATA%\Void"
    echo Deleted AppData\Void
)

:: Delete cache
if exist "%USERPROFILE%\AppData\Local\Temp\vscode-tests-*" (
    for /d %%D in ("%USERPROFILE%\AppData\Local\Temp\vscode-tests-*") do (
        rmdir /s /q "%%D" 2>nul
    )
    echo Deleted vscode temp files
)

echo.
echo ✓ Reset complete!
echo.
echo OctateCode IDE has been reset to initial state.
echo.
echo IMPORTANT - Do the following to see onboarding again:
echo.
echo 1. Edit this file: src\vs\workbench\contrib\void\browser\react\src\void-onboarding\VoidOnboarding.tsx
echo    Find line: const OVERRIDE_VALUE = false
echo    (Currently true - after onboarding, change it back to false)
echo.
echo 2. Run: npm run compile
echo 3. Run: ./scripts/code.bat
echo.
echo Next time you start OctateCode with OVERRIDE_VALUE = true, you will see:
echo   - Welcome screen with "Get Started" button
echo   - API key setup page
echo   - VS Code extensions transfer page
echo.

endlocal
