@echo off
setlocal

title VSCode Web Serverless

pushd %~dp0\..

:: Sync built-in extensions
call npm run download-builtin-extensions

:: Use system Node instead of downloading
set NODE=node

:: Launch Server
call "%NODE%" scripts\code-web.js %*

popd

endlocal
