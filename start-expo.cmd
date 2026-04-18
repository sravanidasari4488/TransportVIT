@echo off
REM Always start Metro with project root = Frontend (avoids picking up C:\Users\Sravani\package.json)
cd /d "%~dp0Frontend"
npx expo start %*
