@echo off
setlocal
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-launch.ps1" -Task start %*
set "taskExit=%errorlevel%"
if not "%taskExit%"=="0" pause
exit /b %taskExit%
