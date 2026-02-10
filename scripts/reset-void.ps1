# Reset Octatecode - Clean All Data Folders
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " Octatecode Data Reset - Clean All Folders" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Folders to delete
$foldersToDelete = @(
    "$env:APPDATA\code-oss-dev",
    "$env:APPDATA\.octatecode-editor",
    "$env:APPDATA\.octatecode-editor-dev",
    "$env:APPDATA\Octatecode",
    "$env:APPDATA\Code - OSS Dev",
    "$env:LOCALAPPDATA\code-oss-dev",
    "$env:LOCALAPPDATA\Octatecode",
    "$env:LOCALAPPDATA\Code - OSS Dev"
)

$step = 1

# Delete main folders
Write-Host "[1/5] Clearing code-oss-dev and Octatecode folders..." -ForegroundColor Yellow
foreach ($folder in $foldersToDelete) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
        Write-Host "     OK: Deleted $([System.IO.Path]::GetFileName($folder))"
    }
}

# Delete temp folders
Write-Host "`n[2/5] Clearing temp folders..." -ForegroundColor Yellow
Get-ChildItem "$env:TEMP" -Filter "octatecode*" -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem "$env:TEMP" -Filter "code*" -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "     OK: Cleaned temp files"

# Delete cache subfolders
Write-Host "`n[3/5] Clearing browser cache and stored data..." -ForegroundColor Yellow
$cacheSubfolders = @(
    "$env:LOCALAPPDATA\code-oss-dev\Cache",
    "$env:LOCALAPPDATA\code-oss-dev\CachedData",
    "$env:LOCALAPPDATA\code-oss-dev\Code Cache",
    "$env:LOCALAPPDATA\code-oss-dev\GPUCache",
    "$env:LOCALAPPDATA\code-oss-dev\Crashpad"
)

foreach ($folder in $cacheSubfolders) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
        Write-Host "     OK: Deleted $([System.IO.Path]::GetFileName($folder))"
    }
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host " Reset Complete - Clean Slate Achieved" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

Write-Host "Onboarding will show on next launch because:" -ForegroundColor White
Write-Host "  - logs folder is deleted" -ForegroundColor Gray
Write-Host "  - User settings are deleted" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. npm run watch-clientd (Terminal 1)" -ForegroundColor Gray
Write-Host "  2. npm run watchreactd (Terminal 2)" -ForegroundColor Gray
Write-Host "  3. npm run watch-extensionsd (Terminal 3)" -ForegroundColor Gray
Write-Host "  4. .\scripts\code.bat (Terminal 4)" -ForegroundColor Gray
Write-Host ""
