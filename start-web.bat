@echo off
title Khoi dong EatFitAI Prep Web
echo ==========================================================
echo       DANG KHOI DONG WEB SERVER EATFITAI PREP
echo ==========================================================
echo.
echo 1. Chuyen huong vao thu muc du an...
cd /d "%~dp0eatfitai-prep-web"

echo 2. Kich hoat trinh duyet tu dong mo trang web sau 2 giay...
start cmd /c "timeout /t 2 >nul && start http://localhost:5173/"

echo 3. Chay Web Server Vite...
echo.
npm run dev
