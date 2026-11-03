@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js topilmadi. https://nodejs.org dan LTS versiyani o'rnating. & pause & exit /b 1)
if not exist node_modules (
  echo Paketlar o'rnatilmoqda, bir necha daqiqa kuting...
  call npm install || (pause & exit /b 1)
)
echo Ilova brauzerda ochilmoqda...
call npm run web
pause
